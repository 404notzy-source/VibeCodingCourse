"""
聊天问答路由
- POST /api/chat/stream  SSE 流式聊天接口
"""

import json
from typing import AsyncGenerator

from fastapi import APIRouter, HTTPException
from sse_starlette.sse import EventSourceResponse

from app.models.schemas import ChatRequest
from app.services import session_service, memory_service
from app.services.sql_agent import stream_agent_events, get_last_sql
from app.services.chart_service import strip_chart_marker

router = APIRouter(prefix="/api/chat", tags=["chat"])


async def _chat_event_generator(
    session_id: str, user_message: str
) -> AsyncGenerator[str, None]:
    """
    SSE 事件生成器

    流程:
    1. 加载上下文记忆
    2. 追加用户消息
    3. 调用 SQL Agent 流式获取事件
    4. 逐事件推送 SSE
    5. 流结束后持久化消息
    """
    # 加载历史上下文
    history = memory_service.load_memory(session_id)

    # 追加本次用户消息
    from langchain_core.messages import HumanMessage

    messages = history + [HumanMessage(content=user_message)]

    # 收集完整响应用于持久化
    full_text = ""
    collected_sql = None
    chart_config_str = None
    events_history = []

    try:
        async for event in stream_agent_events(messages):
            events_history.append(event)
            event_type = event.get("type", "")

            if event_type == "text":
                full_text += event.get("content", "")

            elif event_type == "sql":
                collected_sql = event.get("content", "")

            elif event_type == "chart":
                chart_config_str = json.dumps(
                    event.get("config", {}), ensure_ascii=False
                )

            # 推送 SSE 数据
            yield json.dumps(event, ensure_ascii=False)

    except Exception as e:
        error_event = {"type": "error", "content": f"处理失败: {str(e)}"}
        yield json.dumps(error_event, ensure_ascii=False)
        yield json.dumps({"type": "done", "content": ""}, ensure_ascii=False)
        return

    # 持久化: 保存本轮对话
    clean_text = strip_chart_marker(full_text) if full_text else ""
    if collected_sql is None:
        collected_sql = get_last_sql(events_history)

    memory_service.save_turn(
        session_id=session_id,
        user_message=user_message,
        assistant_content=clean_text,
        sql_query=collected_sql,
        chart_config=chart_config_str,
    )


@router.post("/stream")
async def chat_stream(body: ChatRequest):
    """
    SSE 流式聊天接口

    请求体:
        session_id: 会话 ID
        message: 用户消息

    SSE 事件格式:
        data: {"type": "text",  "content": "..."}
        data: {"type": "sql",   "content": "SELECT ..."}
        data: {"type": "chart", "config": {...}}
        data: {"type": "error", "content": "..."}
        data: {"type": "done",  "content": ""}
    """
    # 检查会话是否存在
    session = session_service.get_session(body.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")

    return EventSourceResponse(
        _chat_event_generator(body.session_id, body.message),
        media_type="text/event-stream",
    )
