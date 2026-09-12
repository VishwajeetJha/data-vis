import os
from pathlib import Path

import aiosqlite

DB_NAME = "data-vis.db"


def get_db_path() -> str:
    data_dir = os.environ.get("DATA_VIS_DATA_DIR", os.path.expanduser("~/.config/data-vis"))
    os.makedirs(data_dir, exist_ok=True)
    return os.path.join(data_dir, DB_NAME)


async def get_db_connection() -> aiosqlite.Connection:
    db_path = get_db_path()
    conn = await aiosqlite.connect(db_path)
    conn.row_factory = aiosqlite.Row

    # Apply SQLite Pragmas for High Performance & Safety
    await conn.execute("PRAGMA foreign_keys = ON;")
    await conn.execute("PRAGMA journal_mode = WAL;")
    await conn.execute("PRAGMA synchronous = NORMAL;")
    await conn.execute("PRAGMA cache_size = -2000;")
    return conn


async def init_db():
    conn = await get_db_connection()
    try:
        migrations_dir = Path(__file__).parent / "migrations"
        if migrations_dir.exists():
            for migration_file in sorted(migrations_dir.glob("*.sql")):
                sql_content = migration_file.read_text(encoding="utf-8")
                await conn.executescript(sql_content)
        await conn.commit()
    finally:
        await conn.close()
