"""
会话管理路由
- GET    /api/sessions                        获取会话列表
- POST   /api/sessions                        创建新会话
- PUT    /api/sessions/{session_id}            重命名会话
- DELETE /api/sessions/{session_id}            删除会话
- GET    /api/sessions/{session_id}/messages   获取历史消息
"""

from fastapi import APIRouter, HTTPException

from app.models.schemas import (
    SessionCreate,
    SessionRename,
    SessionResponse,
    MessageResponse,
)
from app.services import session_service

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.get("", response_model=list[SessionResponse])
async def list_sessions():
    """获取所有会话列表"""
    sessions = session_service.list_sessions()
    return sessions


@router.post("", response_model=SessionResponse, status_code=201)
async def create_session(body: SessionCreate = SessionCreate()):
    """创建新会话"""
    session = session_service.create_session(title=body.title)
    return session


@router.put("/{session_id}", response_model=SessionResponse)
async def rename_session(session_id: str, body: SessionRename):
    """重命名会话"""
    session = session_service.rename_session(session_id, body.title)
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")
    return session


@router.delete("/{session_id}")
async def delete_session(session_id: str):
    """删除会话"""
    success = session_service.delete_session(session_id)
    if not success:
        raise HTTPException(status_code=404, detail="会话不存在")
    return {"detail": "已删除"}


@router.get("/{session_id}/messages", response_model=list[MessageResponse])
async def get_messages(session_id: str):
    """获取会话的消息历史"""
    # 先检查会话是否存在
    session = session_service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")

    messages = session_service.get_messages(session_id)
    return messages
