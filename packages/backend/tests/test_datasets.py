import os
import tempfile
import unittest

from fastapi.testclient import TestClient

from db.connection import init_db
from main import app


class TestDatasetsRouter(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        os.environ["DATA_VIS_DATA_DIR"] = self.temp_dir.name
        await init_db()
        self.client = TestClient(app)

    async def asyncTearDown(self):
        self.temp_dir.cleanup()

    async def test_update_columns_and_stats(self):
        csv_path = os.path.join(self.temp_dir.name, "test_exp.csv")
        with open(csv_path, "w", encoding="utf-8") as f:
            f.write("ID,Age,Salary\n1,25,50000\n2,30,65000\n3,35,80000\n")

        # Ingest file first
        ingest_res = self.client.post(
            "/api/v1/ingest/file",
            json={"workspace_id": "test-ws", "file_path": csv_path},
        )
        self.assertEqual(ingest_res.status_code, 200)
        ds_id = ingest_res.json()["dataset_id"]

        # Test stats endpoint
        stats_res = self.client.get(f"/api/v1/datasets/{ds_id}/stats")
        self.assertEqual(stats_res.status_code, 200)
        stats_data = stats_res.json()
        self.assertIn("profile", stats_data)
        self.assertEqual(stats_data["profile"]["row_count"], 3)

        # Test update column metadata (custom aliases)
        update_res = self.client.put(
            f"/api/v1/datasets/{ds_id}/columns",
            json={
                "columns": [
                    {
                        "original_name": "Salary",
                        "custom_alias": "Annual Compensation",
                        "data_type": "Int64",
                    }
                ]
            },
        )
        self.assertEqual(update_res.status_code, 200)
        self.assertEqual(update_res.json()["status"], "success")
