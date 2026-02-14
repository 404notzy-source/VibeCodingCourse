"""
图表服务
- 从 Agent 输出文本中提取 <<CHART_JSON>>...<<CHART_JSON>> 图表配置
- 备用: 从 ```json 代码块中提取含 ECharts option 的配置
- 校验图表格式
"""

import json
import re
import uuid
from typing import Optional

# 匹配 <<CHART_JSON>>...<<CHART_JSON>> 的正则（贪婪匹配，处理嵌套 JSON）
CHART_PATTERN = re.compile(
    r"<<CHART_JSON>>\s*(\{.+\})\s*<<CHART_JSON>>",
    re.DOTALL,
)

# 备用: 匹配 ```json ... ``` 代码块中含 ECharts 配置的 JSON
JSON_BLOCK_PATTERN = re.compile(
    r"```(?:json)?\s*\n(\{.+?\})\s*\n```",
    re.DOTALL,
)

# 备用: 匹配裸 JSON（含 chartType / option / xAxis / series 等关键字）
BARE_JSON_PATTERN = re.compile(
    r'(\{"(?:chartType|chartTitle|option|type)":.+\})',
    re.DOTALL,
)


def extract_chart_config(text: str) -> Optional[dict]:
    """
    从文本中提取图表配置。

    尝试顺序:
    1. <<CHART_JSON>>...<<CHART_JSON>> 标记
    2. ```json ... ``` 代码块中含 ECharts 关键字段的 JSON
    3. 裸 JSON 含 chartType/option 字段

    Args:
        text: Agent 输出的完整文本

    Returns:
        解析后的图表配置字典（含 id），格式:
        {
            "id": "chart-xxx",
            "type": "bar",
            "title": "...",
            "option": { ... ECharts option ... }
        }
        如果没有图表或解析失败则返回 None
    """
    # 方式 1: <<CHART_JSON>> 标记
    match = CHART_PATTERN.search(text)
    if match:
        config = _try_parse_json(match.group(1))
        if config and _has_chart_fields(config):
            return _normalize_chart(config)

    # 方式 2: ```json 代码块
    for match in JSON_BLOCK_PATTERN.finditer(text):
        config = _try_parse_json(match.group(1))
        if config and _has_chart_fields(config):
            return _normalize_chart(config)

    # 方式 3: 裸 JSON
    match = BARE_JSON_PATTERN.search(text)
    if match:
        config = _try_parse_json(match.group(1))
        if config and _has_chart_fields(config):
            return _normalize_chart(config)

    return None


def strip_chart_marker(text: str) -> str:
    """
    从文本中移除图表标记，返回纯文本内容（用于保存到数据库）。

    移除:
    - <<CHART_JSON>>...<<CHART_JSON>> 标记
    - 含 ECharts 配置的 ```json 代码块

    Args:
        text: 含图表标记的文本

    Returns:
        移除标记后的文本
    """
    result = CHART_PATTERN.sub("", text)

    # 也移除含 ECharts 配置的 json 代码块
    def _remove_chart_json_block(m: re.Match) -> str:
        config = _try_parse_json(m.group(1))
        if config and _has_chart_fields(config):
            return ""
        return m.group(0)

    result = JSON_BLOCK_PATTERN.sub(_remove_chart_json_block, result)
    return result.strip()


def _try_parse_json(json_str: str) -> Optional[dict]:
    """尝试解析 JSON 字符串，包含常见修复"""
    try:
        return json.loads(json_str)
    except json.JSONDecodeError:
        pass

    # 尝试修复: 替换单引号
    try:
        fixed = json_str.replace("'", '"')
        return json.loads(fixed)
    except json.JSONDecodeError:
        pass

    # 尝试修复: 移除尾部逗号
    try:
        fixed = re.sub(r',\s*([}\]])', r'\1', json_str)
        return json.loads(fixed)
    except json.JSONDecodeError:
        pass

    return None


def _has_chart_fields(config: dict) -> bool:
    """检查 JSON 是否包含图表相关字段"""
    # 必须有 option 字段，或者有 series/xAxis 等 ECharts 字段
    if "option" in config:
        return True
    if "series" in config and ("xAxis" in config or "yAxis" in config):
        return True
    if "series" in config and any(
        isinstance(s, dict) and s.get("type") in ("pie", "scatter")
        for s in config.get("series", [])
    ):
        return True
    return False


def _normalize_chart(config: dict) -> dict:
    """标准化图表配置为前端期望的格式"""
    # 如果 config 本身就是 ECharts option（没有外层 wrapper）
    if "option" not in config and ("series" in config or "xAxis" in config):
        # 尝试从 series 推断图表类型
        chart_type = "bar"
        series = config.get("series", [])
        if series and isinstance(series[0], dict):
            chart_type = series[0].get("type", "bar")

        option = _fix_option_formatters(config)
        return {
            "id": f"chart-{uuid.uuid4().hex[:8]}",
            "type": chart_type,
            "title": config.get("title", {}).get("text", "数据图表")
            if isinstance(config.get("title"), dict)
            else config.get("chartTitle", "数据图表"),
            "option": option,
        }

    # 标准格式: {chartType, chartTitle, option}
    option = _fix_option_formatters(config["option"])
    return {
        "id": f"chart-{uuid.uuid4().hex[:8]}",
        "type": config.get("chartType", config.get("type", "bar")),
        "title": config.get("chartTitle", config.get("title", "数据图表")),
        "option": option,
    }


# 匹配 LLM 常见的错误 formatter 模式:
# ¥{c:.2f} / {c:.2f}元 / ${b}: {c} / {c:,.0f} 等 Python 风格格式化
_BAD_FORMATTER_PATTERN = re.compile(
    r'\{([a-d])(?::[\.,]?\d*[a-z]?)\}'
)


def _fix_option_formatters(option: dict) -> dict:
    """
    递归修复 ECharts option 中 LLM 生成的错误 formatter 字符串。

    常见问题:
    - "¥{c:.2f}" → "¥{c}"  (Python .2f 格式说明符 ECharts 不支持)
    - "{c:,.0f}" → "{c}"
    - "{b}: {c:.2f}" → "{b}: {c}"

    ECharts 模板变量: {a}=系列名, {b}=类目名, {c}=数值, {d}=百分比
    """
    if isinstance(option, str):
        return _BAD_FORMATTER_PATTERN.sub(r'{\1}', option)
    elif isinstance(option, dict):
        return {k: _fix_option_formatters(v) for k, v in option.items()}
    elif isinstance(option, list):
        return [_fix_option_formatters(item) for item in option]
    else:
        return option
