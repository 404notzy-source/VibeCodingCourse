"""
上下文记忆服务
- 从数据库加载消息历史
- 转换为 LangChain Message 格式
- 裁剪到配置的窗口大小
"""

from langchain_core.messages import HumanMessage, AIMessage, ToolMessage

from app.config import settings
from app.services import session_service


def load_memory(session_id: str) -> list:
    """
    加载会话的消息历史，转换为 LangChain messages 格式。

    只保留最近 MEMORY_WINDOW_SIZE 轮对话（每轮 = 1 条 user + N 条 assistant）。

    Args:
        session_id: 会话 ID

    Returns:
        LangChain 消息列表 [HumanMessage, AIMessage, ...]
    """
    db_messages = session_service.get_messages(session_id)

    if not db_messages:
        return []

    # 转换为 LangChain 消息格式
    lc_messages = []
    for msg in db_messages:
        if msg.role == "user":
            lc_messages.append(HumanMessage(content=msg.content))
        elif msg.role == "assistant":
            lc_messages.append(AIMessage(content=msg.content))

    # 裁剪: 只保留最近 N 轮
    window = settings.MEMORY_WINDOW_SIZE
    if window <= 0:
        return []

    # 找到最后 N 个 HumanMessage 的位置
    human_indices = [i for i, m in enumerate(lc_messages) if isinstance(m, HumanMessage)]

    if len(human_indices) <= window:
        return lc_messages

    # 从倒数第 window 个 HumanMessage 开始截取
    start_idx = human_indices[-window]
    return lc_messages[start_idx:]


def save_turn(
    session_id: str,
    user_message: str,
    assistant_content: str,
    sql_query: str | None = None,
    chart_config: str | None = None,
) -> None:
    """
    保存一轮完整对话（用户消息 + 助手回复）

    Args:
        session_id: 会话 ID
        user_message: 用户消息
        assistant_content: 助手回复文本
        sql_query: 执行的 SQL（可选）
        chart_config: 图表配置 JSON 字符串（可选）
    """
    # 保存用户消息
    session_service.save_message(
        session_id=session_id,
        role="user",
        content=user_message,
    )

    # 保存助手回复
    session_service.save_message(
        session_id=session_id,
        role="assistant",
        content=assistant_content,
        sql_query=sql_query,
        chart_config=chart_config,
    )

    # 自动更新会话标题
    session_service.update_session_title_if_default(session_id, user_message)
