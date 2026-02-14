"""
SQL Agent 服务
- 基于 SQLDatabase + SQLDatabaseToolkit + create_agent 构建
- 支持非流式 invoke 和流式 astream_events
"""

from typing import AsyncGenerator

from langchain_community.utilities import SQLDatabase
from langchain_community.agent_toolkits import SQLDatabaseToolkit
from langchain.agents import create_agent

from app.config import settings
from app.services.llm_service import get_llm

# 模块级缓存
_agent = None
_db = None

SYSTEM_PROMPT = """你是一个专业的数据分析助手，负责与 SQLite 数据库交互并回答用户的数据分析问题。

工作流程：
1. 首先使用 sql_db_list_tables 查看数据库中有哪些可用的表
2. 使用 sql_db_schema 查看相关表的结构和示例数据
3. 根据用户问题生成正确的 {dialect} SQL 查询
4. 使用 sql_db_query_checker 检查 SQL 语法正确性
5. 使用 sql_db_query 执行查询
6. 用中文自然语言总结查询结果
7. 如果结果适合可视化，**必须**在回答末尾附上图表配置

重要规则：
- 最多返回 {top_k} 条结果
- 禁止执行 DML 语句（INSERT, UPDATE, DELETE, DROP 等）
- 只查询与问题相关的列，不要 SELECT *
- 如果查询出错，分析错误原因并重写 SQL 重试
- 回答要简洁清晰，包含关键数据

【图表可视化规则 — 非常重要】
当查询结果包含多行数据（如分组统计、趋势、排名、占比等），你**必须**在自然语言回答之后输出图表配置。

图表配置必须严格使用以下格式（注意前后的标记）：

<<CHART_JSON>>
{{"chartType": "bar", "chartTitle": "图表标题", "option": {{完整的 ECharts option 对象}}}}
<<CHART_JSON>>

字段说明：
- "chartType": 图表类型，取值 "bar"（柱状图）/ "line"（折线图）/ "pie"（饼图）/ "scatter"（散点图）
- "chartTitle": 图表标题，简短描述图表内容
- "option": 完整的 ECharts option 对象，包含 xAxis、yAxis、series 等

示例 — 柱状图：
<<CHART_JSON>>
{{"chartType": "bar", "chartTitle": "各产品销售额", "option": {{"tooltip": {{"trigger": "axis"}}, "xAxis": {{"type": "category", "data": ["笔记本电脑", "智能手机"]}}, "yAxis": {{"type": "value"}}, "series": [{{"type": "bar", "data": [59990, 99975]}}]}}}}
<<CHART_JSON>>

示例 — 饼图：
<<CHART_JSON>>
{{"chartType": "pie", "chartTitle": "销售占比", "option": {{"tooltip": {{"trigger": "item"}}, "series": [{{"type": "pie", "radius": ["40%", "70%"], "data": [{{"value": 59990, "name": "笔记本电脑"}}, {{"value": 99975, "name": "智能手机"}}]}}]}}}}
<<CHART_JSON>>

注意事项：
- 只有单个数值或纯文本回答时不输出图表
- 图表数据必须使用查询到的真实数据
- JSON 必须合法，不要有多余逗号或注释
- <<CHART_JSON>> 标记必须成对出现
- **严禁**在 formatter 中使用 Python 格式化语法（如 {{c:.2f}}），ECharts 只支持 {{b}}、{{c}}、{{d}} 等简单模板变量
- tooltip.formatter 示例: "{{b}}: ¥{{c}}" 或 "{{b}}: {{c}} ({{d}}%)"
- label.formatter 示例: "¥{{c}}" 或 "{{c}}"
- 不要使用 :,.0f / :.2f / :d 等格式说明符
"""


def reset_agent():
    """重置 Agent 缓存（用于配置变更后重新创建）"""
    global _agent, _db
    _agent = None
    _db = None


def _get_business_db() -> SQLDatabase:
    """获取业务数据库连接"""
    global _db
    if _db is None:
        _db = SQLDatabase.from_uri(f"sqlite:///{settings.BUSINESS_DB_PATH}")
    return _db


def get_agent():
    """
    获取 SQL Agent 实例（单例）

    Returns:
        CompiledStateGraph (LangGraph agent)
    """
    global _agent
    if _agent is None:
        db = _get_business_db()
        llm = get_llm(streaming=True)
        toolkit = SQLDatabaseToolkit(db=db, llm=get_llm(streaming=False))
        tools = toolkit.get_tools()

        prompt = SYSTEM_PROMPT.format(dialect=db.dialect, top_k=10)
        _agent = create_agent(llm, tools, system_prompt=prompt)

    return _agent


async def run_agent(messages: list) -> dict:
    """
    非流式调用 Agent

    Args:
        messages: LangChain 消息列表

    Returns:
        Agent 完整返回 {"messages": [...]}
    """
    agent = get_agent()
    result = agent.invoke({"messages": messages})
    return result


async def stream_agent_events(messages: list) -> AsyncGenerator[dict, None]:
    """
    流式调用 Agent，使用 astream_events(version="v2")。
    产出标准化的 SSE 事件字典。

    事件格式:
        {"type": "text",  "content": "..."}
        {"type": "sql",   "content": "SELECT ..."}
        {"type": "chart", "config": {...}}
        {"type": "error", "content": "..."}
        {"type": "done",  "content": ""}

    Args:
        messages: LangChain 消息列表

    Yields:
        dict: SSE 事件字典
    """
    from app.services.chart_service import extract_chart_config

    agent = get_agent()
    full_text = ""
    collected_sql = []

    try:
        async for event in agent.astream_events(
            {"messages": messages}, version="v2"
        ):
            evt = event.get("event", "")
            name = event.get("name", "")
            data = event.get("data", {})

            # 1. LLM 流式 chunk → text 事件
            if evt == "on_chat_model_stream" and name == "ChatQwen":
                chunk = data.get("chunk")
                if chunk and chunk.content:
                    full_text += chunk.content
                    yield {"type": "text", "content": chunk.content}

            # 2. 工具开始 → sql 事件（仅 sql_db_query）
            elif evt == "on_tool_start" and name == "sql_db_query":
                sql = data.get("input", {}).get("query", "")
                if sql:
                    collected_sql.append(sql)
                    yield {"type": "sql", "content": sql}

            # 3. 工具结束 → data 事件（sql_db_query 的查询结果）
            elif evt == "on_tool_end" and name == "sql_db_query":
                output = data.get("output")
                if output:
                    raw_result = output.content if hasattr(output, "content") else str(output)
                    parsed = _parse_query_result(raw_result, collected_sql[-1] if collected_sql else "")
                    if parsed:
                        yield {"type": "data", "content": parsed}

        # 4. 流结束后，检查是否有图表配置
        chart = extract_chart_config(full_text)
        if chart:
            yield {"type": "chart", "config": chart}

        # 4. done 事件
        yield {"type": "done", "content": ""}

    except Exception as e:
        yield {"type": "error", "content": str(e)}
        yield {"type": "done", "content": ""}


def get_last_sql(events_history: list[dict]) -> str | None:
    """从事件历史中提取最后一条 SQL"""
    for event in reversed(events_history):
        if event.get("type") == "sql":
            return event.get("content")
    return None


def _parse_query_result(raw_result: str, sql: str) -> dict | None:
    """
    解析 sql_db_query 工具返回的原始结果字符串为结构化数据。

    工具返回格式通常为: "[('笔记本电脑', 5999.0), ('智能手机', 3999.0)]"
    或 include_columns 时: "[{'name': '笔记本电脑', 'price': 5999.0}]"

    Returns:
        {
            "columns": ["col1", "col2"],
            "rows": [["val1", "val2"], ...],
            "sql": "SELECT ..."
        }
    """
    import ast
    import re as _re

    if not raw_result or raw_result.strip() in ("", "[]", "None"):
        return None

    try:
        # 尝试解析为 Python 字面量
        parsed = ast.literal_eval(raw_result.strip())
    except (ValueError, SyntaxError):
        return None

    if not isinstance(parsed, list) or len(parsed) == 0:
        return None

    # 情况 1: 字典列表 [{"col": "val"}, ...]
    if isinstance(parsed[0], dict):
        columns = list(parsed[0].keys())
        rows = [[row.get(c) for c in columns] for row in parsed]
        return {"columns": columns, "rows": rows, "sql": sql}

    # 情况 2: 元组列表 [("val1", "val2"), ...]
    if isinstance(parsed[0], (tuple, list)):
        # 尝试从 SQL 中提取列名
        columns = _extract_columns_from_sql(sql) or [
            f"col_{i}" for i in range(len(parsed[0]))
        ]
        # 确保列数匹配
        if len(columns) != len(parsed[0]):
            columns = [f"col_{i}" for i in range(len(parsed[0]))]
        rows = [list(row) for row in parsed]
        return {"columns": columns, "rows": rows, "sql": sql}

    return None


def _extract_columns_from_sql(sql: str) -> list[str] | None:
    """从 SELECT 语句中提取列名/别名"""
    import re as _re

    if not sql:
        return None

    # 匹配 SELECT ... FROM
    m = _re.search(r'SELECT\s+(.+?)\s+FROM', sql, _re.IGNORECASE | _re.DOTALL)
    if not m:
        return None

    select_part = m.group(1).strip()
    if select_part == '*':
        return None

    columns = []
    # 按逗号分割（注意函数中的逗号）
    depth = 0
    current = ""
    for ch in select_part:
        if ch == '(':
            depth += 1
        elif ch == ')':
            depth -= 1
        elif ch == ',' and depth == 0:
            columns.append(current.strip())
            current = ""
            continue
        current += ch
    columns.append(current.strip())

    # 提取别名
    result = []
    for col in columns:
        # 匹配 AS alias 或 as alias
        alias_match = _re.search(r'\bAS\s+["\']?(\w+)["\']?\s*$', col, _re.IGNORECASE)
        if alias_match:
            result.append(alias_match.group(1))
        else:
            # 取最后一个 . 之后的部分
            parts = col.strip().split('.')
            name = parts[-1].strip().strip('"').strip("'").strip('`')
            # 如果是函数如 SUM(x)，简化
            func_match = _re.match(r'(\w+)\s*\(', name)
            if func_match:
                result.append(name)
            else:
                result.append(name)

    return result if result else None
