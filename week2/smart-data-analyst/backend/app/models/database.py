"""
数据库模型定义与初始化
- 会话数据库 (session.db): sessions + messages 表
- 业务数据库 (business.db): products + sales + employees 示例数据
"""

import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import (
    Column,
    String,
    Text,
    Float,
    Integer,
    DateTime,
    ForeignKey,
    create_engine,
    event,
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

from app.config import settings

Base = declarative_base()


# ==================== 会话数据库模型 ====================


class SessionModel(Base):
    """会话表"""

    __tablename__ = "sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(200), nullable=False, default="新对话")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    messages = relationship(
        "MessageModel", back_populates="session", cascade="all, delete-orphan"
    )


class MessageModel(Base):
    """消息表"""

    __tablename__ = "messages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(36), ForeignKey("sessions.id"), nullable=False)
    role = Column(String(20), nullable=False)  # user / assistant
    content = Column(Text, nullable=False, default="")
    sql_query = Column(Text, nullable=True)
    chart_config = Column(Text, nullable=True)  # JSON 字符串
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    session = relationship("SessionModel", back_populates="messages")


# ==================== 会话数据库引擎 ====================


def get_session_engine():
    """获取会话数据库引擎"""
    db_path = Path(settings.SESSION_DB_PATH)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    engine = create_engine(f"sqlite:///{db_path}", echo=False)

    # SQLite 开启外键约束
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    return engine


def init_session_db():
    """初始化会话数据库（创建表）"""
    engine = get_session_engine()
    Base.metadata.create_all(engine)
    print("[session.db] 会话数据库初始化完成")
    return engine


def get_session_db():
    """获取会话数据库 Session 工厂"""
    engine = get_session_engine()
    SessionLocal = sessionmaker(bind=engine)
    return SessionLocal


# ==================== 业务数据库初始化 ====================


def init_business_db():
    """初始化业务数据库 — 创建示例表并插入数据"""
    db_path = Path(settings.BUSINESS_DB_PATH)
    db_path.parent.mkdir(parents=True, exist_ok=True)

    # 如果已存在则跳过
    if db_path.exists():
        print(f"[business.db] 业务数据库已存在: {db_path}")
        return

    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    # ---------- products 产品表 ----------
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            price REAL NOT NULL,
            stock INTEGER NOT NULL
        )
    """)
    products = [
        (1, "笔记本电脑", "电子产品", 5999.00, 150),
        (2, "智能手机", "电子产品", 3999.00, 300),
        (3, "无线耳机", "配件", 299.00, 500),
        (4, "机械键盘", "配件", 499.00, 200),
        (5, "显示器", "电子产品", 2499.00, 80),
        (6, "鼠标", "配件", 129.00, 600),
        (7, "平板电脑", "电子产品", 4599.00, 120),
        (8, "移动电源", "配件", 89.00, 800),
    ]
    cursor.executemany("INSERT OR IGNORE INTO products VALUES (?,?,?,?,?)", products)

    # ---------- sales 销售表 ----------
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sales (
            id INTEGER PRIMARY KEY,
            product_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            total_amount REAL NOT NULL,
            sale_date TEXT NOT NULL,
            region TEXT NOT NULL DEFAULT '华东',
            FOREIGN KEY (product_id) REFERENCES products(id)
        )
    """)
    sales = [
        (1, 1, 10, 59990.00, "2026-01-05", "华东"),
        (2, 2, 25, 99975.00, "2026-01-05", "华南"),
        (3, 3, 50, 14950.00, "2026-01-10", "华东"),
        (4, 1, 8, 47992.00, "2026-01-15", "华北"),
        (5, 4, 15, 7485.00, "2026-01-15", "华东"),
        (6, 5, 5, 12495.00, "2026-01-20", "华南"),
        (7, 2, 30, 119970.00, "2026-01-25", "华东"),
        (8, 6, 100, 12900.00, "2026-02-01", "华北"),
        (9, 3, 80, 23920.00, "2026-02-01", "华南"),
        (10, 1, 12, 71988.00, "2026-02-05", "华东"),
        (11, 5, 10, 24990.00, "2026-02-05", "华北"),
        (12, 2, 20, 79980.00, "2026-02-10", "华南"),
        (13, 7, 15, 68985.00, "2026-02-10", "华东"),
        (14, 8, 200, 17800.00, "2026-02-10", "华北"),
        (15, 4, 30, 14970.00, "2026-02-12", "华南"),
        (16, 6, 150, 19350.00, "2026-02-12", "华东"),
    ]
    cursor.executemany("INSERT OR IGNORE INTO sales VALUES (?,?,?,?,?,?)", sales)

    # ---------- employees 员工表 ----------
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS employees (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            department TEXT NOT NULL,
            position TEXT NOT NULL DEFAULT '员工',
            salary REAL NOT NULL,
            hire_date TEXT NOT NULL
        )
    """)
    employees = [
        (1, "张三", "销售部", "销售经理", 12000.00, "2023-03-01"),
        (2, "李四", "技术部", "高级工程师", 18000.00, "2022-06-15"),
        (3, "王五", "销售部", "销售专员", 7500.00, "2024-08-20"),
        (4, "赵六", "技术部", "技术总监", 25000.00, "2021-01-10"),
        (5, "钱七", "市场部", "市场专员", 9000.00, "2025-01-05"),
        (6, "孙八", "技术部", "初级工程师", 10000.00, "2025-06-01"),
        (7, "周九", "市场部", "市场经理", 15000.00, "2023-09-15"),
        (8, "吴十", "销售部", "销售专员", 8000.00, "2024-11-01"),
    ]
    cursor.executemany("INSERT OR IGNORE INTO employees VALUES (?,?,?,?,?,?)", employees)

    conn.commit()
    conn.close()
    print(f"[business.db] 业务数据库创建完成: {db_path}")
    print(f"  - products: {len(products)} 条")
    print(f"  - sales: {len(sales)} 条")
    print(f"  - employees: {len(employees)} 条")


# ==================== 统一初始化 ====================


def init_all_databases():
    """初始化所有数据库"""
    init_session_db()
    init_business_db()
