"""
会话管理服务
- 会话 CRUD
- 消息持久化
"""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session as DBSession

from app.models.database import SessionModel, MessageModel, get_session_db


def _get_db() -> DBSession:
    """获取数据库会话"""
    SessionLocal = get_session_db()
    return SessionLocal()


def list_sessions() -> list[SessionModel]:
    """获取所有会话，按更新时间倒序"""
    db = _get_db()
    try:
        return (
            db.query(SessionModel)
            .order_by(SessionModel.updated_at.desc())
            .all()
        )
    finally:
        db.close()


def get_session(session_id: str) -> Optional[SessionModel]:
    """获取单个会话"""
    db = _get_db()
    try:
        return db.query(SessionModel).filter(SessionModel.id == session_id).first()
    finally:
        db.close()


def create_session(title: str = "新对话") -> SessionModel:
    """创建新会话"""
    db = _get_db()
    try:
        session = SessionModel(title=title)
        db.add(session)
        db.commit()
        db.refresh(session)
        return session
    finally:
        db.close()


def rename_session(session_id: str, title: str) -> Optional[SessionModel]:
    """重命名会话"""
    db = _get_db()
    try:
        session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
        if not session:
            return None
        session.title = title
        session.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(session)
        return session
    finally:
        db.close()


def delete_session(session_id: str) -> bool:
    """删除会话（级联删除消息）"""
    db = _get_db()
    try:
        session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
        if not session:
            return False
        db.delete(session)
        db.commit()
        return True
    finally:
        db.close()


def get_messages(session_id: str) -> list[MessageModel]:
    """获取会话的所有消息，按时间正序"""
    db = _get_db()
    try:
        return (
            db.query(MessageModel)
            .filter(MessageModel.session_id == session_id)
            .order_by(MessageModel.created_at.asc())
            .all()
        )
    finally:
        db.close()


def save_message(
    session_id: str,
    role: str,
    content: str,
    sql_query: Optional[str] = None,
    chart_config: Optional[str] = None,
) -> MessageModel:
    """保存一条消息并更新会话时间"""
    db = _get_db()
    try:
        msg = MessageModel(
            session_id=session_id,
            role=role,
            content=content,
            sql_query=sql_query,
            chart_config=chart_config,
        )
        db.add(msg)

        # 更新会话的 updated_at
        session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
        if session:
            session.updated_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(msg)
        return msg
    finally:
        db.close()


def update_session_title_if_default(session_id: str, user_message: str) -> None:
    """
    如果会话标题仍为默认值 "新对话"，则用用户首条消息的前 30 个字符作为标题
    """
    db = _get_db()
    try:
        session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
        if session and session.title == "新对话":
            session.title = user_message[:30] + ("..." if len(user_message) > 30 else "")
            session.updated_at = datetime.now(timezone.utc)
            db.commit()
    finally:
        db.close()
