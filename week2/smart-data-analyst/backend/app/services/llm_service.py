"""
大模型服务封装
- ChatQwen (deepseek-v3.2 via DashScope) 初始化
- get_llm() 工厂函数
"""

import os

from langchain_qwq import ChatQwen

from app.config import settings

# 确保环境变量已设置（langchain-qwq 从环境变量读取）
os.environ["DASHSCOPE_API_KEY"] = settings.DASHSCOPE_API_KEY
os.environ["DASHSCOPE_API_BASE"] = settings.DASHSCOPE_API_BASE

# 模块级 LLM 单例（避免重复创建）
_llm_instance: ChatQwen | None = None
_llm_streaming_instance: ChatQwen | None = None


def get_llm(streaming: bool = False) -> ChatQwen:
    """
    获取 LLM 实例（工厂函数）

    Args:
        streaming: 是否启用流式输出。
                   True  → 用于 agent.astream() / agent.astream_events()
                   False → 用于 agent.invoke() / toolkit 内部调用

    Returns:
        ChatQwen 实例
    """
    global _llm_instance, _llm_streaming_instance

    if streaming:
        if _llm_streaming_instance is None:
            _llm_streaming_instance = ChatQwen(
                model=settings.LLM_MODEL_NAME,
                max_tokens=settings.LLM_MAX_TOKENS,
                streaming=True,
            )
        return _llm_streaming_instance
    else:
        if _llm_instance is None:
            _llm_instance = ChatQwen(
                model=settings.LLM_MODEL_NAME,
                max_tokens=settings.LLM_MAX_TOKENS,
                streaming=False,
            )
        return _llm_instance


def get_llm_with_tools(tools: list, streaming: bool = False) -> ChatQwen:
    """
    获取绑定工具的 LLM 实例

    Args:
        tools: 工具列表
        streaming: 是否流式

    Returns:
        绑定了工具的 ChatQwen 实例
    """
    llm = get_llm(streaming=streaming)
    return llm.bind_tools(tools)
