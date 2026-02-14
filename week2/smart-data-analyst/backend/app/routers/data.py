"""
数据管理路由
- GET  /api/data/tables    获取所有表及其 schema
- POST /api/data/upload    上传 CSV 创建/追加表数据
"""

import csv
import io
import sqlite3

from fastapi import APIRouter, HTTPException, UploadFile, File

from app.config import settings

router = APIRouter(prefix="/api/data", tags=["data"])


def _get_conn() -> sqlite3.Connection:
    """获取业务数据库连接"""
    return sqlite3.connect(settings.BUSINESS_DB_PATH)


@router.get("/tables")
async def get_tables():
    """
    获取业务数据库中所有表的信息

    返回:
        {
            "tables": [
                {
                    "name": "products",
                    "columns": [{"name": "id", "type": "INTEGER"}, ...],
                    "row_count": 8
                },
                ...
            ]
        }
    """
    conn = _get_conn()
    try:
        cursor = conn.cursor()

        # 获取所有表名
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        table_names = [row[0] for row in cursor.fetchall()]

        tables = []
        for table_name in table_names:
            # 获取列信息
            cursor.execute(f"PRAGMA table_info({table_name})")
            columns = [
                {"name": col[1], "type": col[2], "notnull": bool(col[3]), "pk": bool(col[5])}
                for col in cursor.fetchall()
            ]

            # 获取行数
            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            row_count = cursor.fetchone()[0]

            tables.append(
                {"name": table_name, "columns": columns, "row_count": row_count}
            )

        return {"tables": tables}
    finally:
        conn.close()


@router.get("/tables/{table_name}")
async def get_table_detail(table_name: str, limit: int = 20):
    """
    获取指定表的详细信息（含示例数据）

    Args:
        table_name: 表名
        limit: 返回的示例行数

    返回:
        {
            "name": "products",
            "columns": [...],
            "row_count": 8,
            "sample_data": [{"id": 1, "name": "笔记本电脑", ...}, ...]
        }
    """
    conn = _get_conn()
    try:
        cursor = conn.cursor()

        # 检查表是否存在
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
            (table_name,),
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail=f"表 {table_name} 不存在")

        # 列信息
        cursor.execute(f"PRAGMA table_info({table_name})")
        columns_info = cursor.fetchall()
        columns = [
            {"name": col[1], "type": col[2], "notnull": bool(col[3]), "pk": bool(col[5])}
            for col in columns_info
        ]
        col_names = [col[1] for col in columns_info]

        # 行数
        cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
        row_count = cursor.fetchone()[0]

        # 示例数据
        cursor.execute(f"SELECT * FROM {table_name} LIMIT ?", (limit,))
        rows = cursor.fetchall()
        sample_data = [dict(zip(col_names, row)) for row in rows]

        return {
            "name": table_name,
            "columns": columns,
            "row_count": row_count,
            "sample_data": sample_data,
        }
    finally:
        conn.close()


@router.post("/upload")
async def upload_csv(file: UploadFile = File(...), table_name: str | None = None):
    """
    上传 CSV 文件，创建或追加到数据库表

    Args:
        file: CSV 文件
        table_name: 目标表名（可选，默认使用文件名去掉 .csv 后缀）

    返回:
        {"detail": "...", "table_name": "...", "rows_inserted": N}
    """
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="请上传 .csv 格式的文件")

    # 确定表名
    if not table_name:
        table_name = file.filename.rsplit(".", 1)[0].replace("-", "_").replace(" ", "_")

    # 读取 CSV 内容
    content = await file.read()
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content.decode("gbk")

    reader = csv.DictReader(io.StringIO(text))
    rows = list(reader)

    if not rows:
        raise HTTPException(status_code=400, detail="CSV 文件为空")

    columns = list(rows[0].keys())

    conn = _get_conn()
    try:
        cursor = conn.cursor()

        # 检查表是否已存在
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
            (table_name,),
        )
        table_exists = cursor.fetchone() is not None

        if not table_exists:
            # 推断列类型并创建表
            col_defs = []
            for col in columns:
                # 尝试推断类型
                sample_vals = [r[col] for r in rows[:10] if r[col]]
                col_type = _infer_type(sample_vals)
                col_defs.append(f'"{col}" {col_type}')

            create_sql = f'CREATE TABLE "{table_name}" ({", ".join(col_defs)})'
            cursor.execute(create_sql)

        # 插入数据
        placeholders = ", ".join(["?"] * len(columns))
        col_names = ", ".join([f'"{c}"' for c in columns])
        insert_sql = f'INSERT INTO "{table_name}" ({col_names}) VALUES ({placeholders})'

        for row in rows:
            values = [_cast_value(row[col]) for col in columns]
            cursor.execute(insert_sql, values)

        conn.commit()

        return {
            "detail": f"{'创建新表并导入' if not table_exists else '追加'}成功",
            "table_name": table_name,
            "rows_inserted": len(rows),
            "columns": columns,
        }
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"导入失败: {str(e)}")
    finally:
        conn.close()


def _infer_type(values: list[str]) -> str:
    """推断列类型"""
    if not values:
        return "TEXT"

    # 尝试 INTEGER
    try:
        for v in values:
            int(v)
        return "INTEGER"
    except (ValueError, TypeError):
        pass

    # 尝试 REAL
    try:
        for v in values:
            float(v)
        return "REAL"
    except (ValueError, TypeError):
        pass

    return "TEXT"


def _cast_value(val: str):
    """尝试将字符串转为合适的 Python 类型"""
    if not val or val.strip() == "":
        return None
    try:
        return int(val)
    except (ValueError, TypeError):
        pass
    try:
        return float(val)
    except (ValueError, TypeError):
        pass
    return val
