"""
FastAPI 应用入口
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.models.database import init_all_databases
from app.routers import chat, session, data


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期: 启动时初始化数据库"""
    init_all_databases()
    yield


app = FastAPI(
    title="Smart Data Analyst API",
    description="智能数据分析系统后端服务",
    version="0.2.0",
    lifespan=lifespan,
)

# CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(session.router)
app.include_router(chat.router)
app.include_router(data.router)


@app.get("/health")
async def health():
    """健康检查"""
    return {"status": "ok"}


@app.get("/api/health")
async def api_health():
    """API 健康检查（供前端 proxy 调用）"""
    return {"status": "ok", "service": "smart-data-analyst", "version": "0.2.0"}
