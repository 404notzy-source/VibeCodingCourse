"""
Pydantic 请求/响应模型
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ==================== 会话相关 ====================


class SessionCreate(BaseModel):
    """创建会话请求"""

    title: Optional[str] = Field(default="新对话", max_length=200)


class SessionRename(BaseModel):
    """重命名会话请求"""

    title: str = Field(..., min_length=1, max_length=200)


class SessionResponse(BaseModel):
    """会话响应"""

    id: str
    title: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ==================== 消息相关 ====================


class MessageResponse(BaseModel):
    """消息响应"""

    id: str
    session_id: str
    role: str
    content: str
    sql_query: Optional[str] = None
    chart_config: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ==================== 聊天相关 ====================


class ChatRequest(BaseModel):
    """聊天请求"""

    session_id: str = Field(..., description="会话 ID")
    message: str = Field(..., min_length=1, description="用户消息内容")


# ==================== 数据管理相关 ====================


class TableInfo(BaseModel):
    """表信息"""

    name: str
    columns: list[dict]
    row_count: int


class TablesResponse(BaseModel):
    """表列表响应"""

    tables: list[TableInfo]


# ==================== 通用 ====================


class ErrorResponse(BaseModel):
    """错误响应"""

    detail: str
