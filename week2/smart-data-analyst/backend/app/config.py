import os
from pathlib import Path
from dotenv import load_dotenv

# 加载 .env 文件
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


class Settings:
    """应用配置"""

    # DashScope / LLM
    DASHSCOPE_API_KEY: str = os.getenv("DASHSCOPE_API_KEY", "")
    DASHSCOPE_API_BASE: str = os.getenv(
        "DASHSCOPE_API_BASE", "https://dashscope.aliyuncs.com/compatible-mode/v1"
    )
    LLM_MODEL_NAME: str = os.getenv("LLM_MODEL_NAME", "deepseek-v3.2")
    LLM_MAX_TOKENS: int = int(os.getenv("LLM_MAX_TOKENS", "2048"))

    # 数据库
    BUSINESS_DB_PATH: str = os.getenv(
        "BUSINESS_DB_PATH", str(BASE_DIR / "app" / "database" / "business.db")
    )
    SESSION_DB_PATH: str = os.getenv(
        "SESSION_DB_PATH", str(BASE_DIR / "app" / "database" / "session.db")
    )

    # 上下文记忆窗口大小
    MEMORY_WINDOW_SIZE: int = int(os.getenv("MEMORY_WINDOW_SIZE", "10"))

    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]


settings = Settings()
