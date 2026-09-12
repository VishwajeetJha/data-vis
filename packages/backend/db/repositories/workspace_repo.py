import json
import uuid
from datetime import UTC, datetime
from typing import Any

from db.connection import get_db_connection


class WorkspaceRepository:
    @staticmethod
    async def create(
        name: str, description: str | None = None, ws_id: str | None = None
    ) -> dict[str, Any]:
        ws_id = ws_id or str(uuid.uuid4())
        now = datetime.now(UTC).isoformat()
        conn = await get_db_connection()
        try:
            await conn.execute(
                """
                INSERT OR IGNORE INTO workspaces (id, name, description, layout_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (ws_id, name, description or "", json.dumps({}), now, now),
            )
            # Create default sheet
            sheet_id = str(uuid.uuid4())
            await conn.execute(
                """
                INSERT OR IGNORE INTO sheets (id, workspace_id, name, sort_order, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (sheet_id, ws_id, "Sheet 1", 0, now),
            )
            await conn.commit()
            return {
                "id": ws_id,
                "name": name,
                "description": description,
                "layout_json": "{}",
                "created_at": now,
                "updated_at": now,
            }
        finally:
            await conn.close()

    @staticmethod
    async def ensure_workspace(ws_id: str, name: str = "Default Analysis Workspace") -> None:
        conn = await get_db_connection()
        now = datetime.now(UTC).isoformat()
        try:
            await conn.execute(
                """
                INSERT OR IGNORE INTO workspaces (id, name, description, layout_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (ws_id, name, "Auto-created workspace session", json.dumps({}), now, now),
            )
            sheet_id = str(uuid.uuid4())
            await conn.execute(
                """
                INSERT OR IGNORE INTO sheets (id, workspace_id, name, sort_order, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (sheet_id, ws_id, "Sheet 1", 0, now),
            )
            await conn.commit()
        finally:
            await conn.close()

    @staticmethod
    async def get_by_id(ws_id: str) -> dict[str, Any] | None:
        conn = await get_db_connection()
        try:
            async with conn.execute("SELECT * FROM workspaces WHERE id = ?", (ws_id,)) as cursor:
                row = await cursor.fetchone()
                if not row:
                    return None
                return dict(row)
        finally:
            await conn.close()

    @staticmethod
    async def list_all() -> list[dict[str, Any]]:
        conn = await get_db_connection()
        try:
            async with conn.execute("SELECT * FROM workspaces ORDER BY updated_at DESC") as cursor:
                rows = await cursor.fetchall()
                return [dict(r) for r in rows]
        finally:
            await conn.close()

    @staticmethod
    async def update_layout(ws_id: str, layout_data: dict[str, Any]) -> bool:
        now = datetime.now(UTC).isoformat()
        conn = await get_db_connection()
        try:
            cursor = await conn.execute(
                """
                UPDATE workspaces
                SET layout_json = ?, updated_at = ?
                WHERE id = ?
                """,
                (json.dumps(layout_data), now, ws_id),
            )
            await conn.commit()
            return cursor.rowcount > 0
        finally:
            await conn.close()

    @staticmethod
    async def delete(ws_id: str) -> bool:
        conn = await get_db_connection()
        try:
            cursor = await conn.execute("DELETE FROM workspaces WHERE id = ?", (ws_id,))
            await conn.commit()
            return cursor.rowcount > 0
        finally:
            await conn.close()
