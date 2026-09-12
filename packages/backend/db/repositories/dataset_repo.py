import json
import uuid
from datetime import UTC, datetime
from typing import Any

from db.connection import get_db_connection
from db.repositories.workspace_repo import WorkspaceRepository


class DatasetRepository:
    @staticmethod
    async def create(
        workspace_id: str,
        file_path: str,
        file_name: str,
        file_format: str,
        file_size_bytes: int,
        row_count: int,
        column_count: int,
        fingerprint: str,
        schema: list[dict[str, Any]],
    ) -> dict[str, Any]:
        # Ensure parent workspace exists
        await WorkspaceRepository.ensure_workspace(workspace_id)

        dataset_id = str(uuid.uuid4())
        now = datetime.now(UTC).isoformat()
        conn = await get_db_connection()
        try:
            # Check if dataset with (workspace_id, fingerprint) already exists
            async with conn.execute(
                "SELECT * FROM datasets WHERE workspace_id = ? AND fingerprint = ?",
                (workspace_id, fingerprint),
            ) as cursor:
                existing = await cursor.fetchone()
                if existing:
                    existing_dict = dict(existing)
                    await conn.execute(
                        """
                        UPDATE datasets
                        SET file_path = ?, file_name = ?, file_size_bytes = ?, row_count = ?
                        WHERE id = ?
                        """,
                        (file_path, file_name, file_size_bytes, row_count, existing_dict["id"]),
                    )
                    await conn.commit()
                    existing_dict["file_path"] = file_path
                    existing_dict["file_name"] = file_name
                    existing_dict["file_size_bytes"] = file_size_bytes
                    existing_dict["row_count"] = row_count
                    existing_dict["schema"] = json.loads(existing_dict["schema_json"])
                    return existing_dict

            await conn.execute(
                """
                INSERT INTO datasets (
                    id, workspace_id, file_path, file_name, file_format,
                    file_size_bytes, row_count, column_count, fingerprint, schema_json, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    dataset_id,
                    workspace_id,
                    file_path,
                    file_name,
                    file_format,
                    file_size_bytes,
                    row_count,
                    column_count,
                    fingerprint,
                    json.dumps(schema),
                    now,
                ),
            )

            # Insert Column Metadata entries
            for col in schema:
                meta_id = str(uuid.uuid4())
                await conn.execute(
                    """
                    INSERT INTO column_metadata (id, dataset_id, original_name, custom_alias, data_type)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (meta_id, dataset_id, col["name"], col["name"], col["data_type"]),
                )

            await conn.commit()
            return {
                "id": dataset_id,
                "workspace_id": workspace_id,
                "file_path": file_path,
                "file_name": file_name,
                "file_format": file_format,
                "file_size_bytes": file_size_bytes,
                "row_count": row_count,
                "column_count": column_count,
                "fingerprint": fingerprint,
                "schema": schema,
                "created_at": now,
            }
        finally:
            await conn.close()

    @staticmethod
    async def get_by_id(dataset_id: str) -> dict[str, Any] | None:
        conn = await get_db_connection()
        try:
            async with conn.execute("SELECT * FROM datasets WHERE id = ?", (dataset_id,)) as cursor:
                row = await cursor.fetchone()
                if not row:
                    return None
                d = dict(row)
                d["schema"] = json.loads(d["schema_json"])
                return d
        finally:
            await conn.close()

    @staticmethod
    async def get_by_fingerprint(fingerprint: str) -> dict[str, Any] | None:
        conn = await get_db_connection()
        try:
            async with conn.execute(
                "SELECT * FROM datasets WHERE fingerprint = ?", (fingerprint,)
            ) as cursor:
                row = await cursor.fetchone()
                if not row:
                    return None
                return dict(row)
        finally:
            await conn.close()

    @staticmethod
    async def list_by_workspace(workspace_id: str) -> list[dict[str, Any]]:
        conn = await get_db_connection()
        try:
            async with conn.execute(
                "SELECT * FROM datasets WHERE workspace_id = ? ORDER BY created_at DESC",
                (workspace_id,),
            ) as cursor:
                rows = await cursor.fetchall()
                results = []
                for r in rows:
                    item = dict(r)
                    item["schema"] = json.loads(item["schema_json"])
                    results.append(item)
                return results
        finally:
            await conn.close()

    @staticmethod
    async def update_column_aliases(dataset_id: str, col_updates: list[dict[str, Any]]) -> bool:
        conn = await get_db_connection()
        try:
            for update in col_updates:
                await conn.execute(
                    """
                    UPDATE column_metadata
                    SET custom_alias = ?, data_type = ?
                    WHERE dataset_id = ? AND original_name = ?
                    """,
                    (
                        update.get("custom_alias"),
                        update.get("data_type"),
                        dataset_id,
                        update["original_name"],
                    ),
                )
            await conn.commit()
            return True
        finally:
            await conn.close()

    @staticmethod
    async def delete(dataset_id: str) -> bool:
        conn = await get_db_connection()
        try:
            cursor = await conn.execute("DELETE FROM datasets WHERE id = ?", (dataset_id,))
            await conn.commit()
            return cursor.rowcount > 0
        finally:
            await conn.close()
