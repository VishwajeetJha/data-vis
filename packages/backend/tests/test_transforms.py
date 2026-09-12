import os
import tempfile
import unittest
from fastapi.testclient import TestClient

from db.connection import init_db
from main import app


class TestTransformEngine(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        os.environ["DATA_VIS_DATA_DIR"] = self.temp_dir.name
        await init_db()
        self.client = TestClient(app)

    async def asyncTearDown(self):
        self.temp_dir.cleanup()

    async def test_calculated_column_and_impute(self):
        csv_path = os.path.join(self.temp_dir.name, "test_payroll.csv")
        with open(csv_path, "w", encoding="utf-8") as f:
            f.write("Employee,Salary,Bonus,Score\n  alice smith  ,5000.1234,1000,98.765\nBob,6000,,85.123\nCharlie,7000,2000,90.456\n")

        # Ingest file
        ingest_res = self.client.post(
            "/api/v1/ingest/file",
            json={"workspace_id": "test-ws", "file_path": csv_path},
        )
        self.assertEqual(ingest_res.status_code, 200)
        ds_id = ingest_res.json()["dataset_id"]

        # 1. Add calculated column: Annual_Salary = Salary * 12
        calc_res = self.client.post(
            f"/api/v1/datasets/{ds_id}/transforms",
            json={
                "action": "calculated_column",
                "name": "Annual_Salary",
                "formula": "Salary * 12",
            },
        )
        self.assertEqual(calc_res.status_code, 200)
        col_names = [c["name"] for c in calc_res.json()["columns"]]
        self.assertIn("Annual_Salary", col_names)

        # 2. String transform: titlecase and trim on Employee
        title_res = self.client.post(
            f"/api/v1/datasets/{ds_id}/transforms",
            json={
                "action": "string_case",
                "column": "Employee",
                "mode": "titlecase",
            },
        )
        self.assertEqual(title_res.status_code, 200)

        # 3. Numeric precision: round Score to 2 decimals
        prec_res = self.client.post(
            f"/api/v1/datasets/{ds_id}/transforms",
            json={
                "action": "numeric_precision",
                "column": "Score",
                "precision": 2,
            },
        )
        self.assertEqual(prec_res.status_code, 200)

        # 4. Impute null bonus with 0
        impute_res = self.client.post(
            f"/api/v1/datasets/{ds_id}/transforms",
            json={
                "action": "impute_nulls",
                "column": "Bonus",
                "strategy": "constant",
                "value": 0,
            },
        )
        self.assertEqual(impute_res.status_code, 200)

        # 5. Query transformed data
        query_res = self.client.post(
            "/api/v1/query",
            json={"dataset_id": ds_id, "limit": 10},
        )
        self.assertEqual(query_res.status_code, 200)
        rows = query_res.json()["data"]

        # Verify titlecase
        alice_name = rows[0]["Employee"]
        self.assertEqual(alice_name.strip(), "Alice Smith")

        # Verify rounding
        self.assertAlmostEqual(rows[0]["Score"], 98.76, places=1)

        # Verify imputation
        bob_bonus = [r["Bonus"] for r in rows if "Bob" in r["Employee"]][0]
        self.assertEqual(bob_bonus, 0)
