import os
import tempfile
import unittest

from fastapi.testclient import TestClient

from db.connection import init_db
from engine.advisor.plan_validator import PlanValidator
from engine.advisor.recommendation_engine import RecommendationEngine
from main import app


class TestVisualizationAdvisor(unittest.TestCase):
    def setUp(self):
        self.mock_profiles = [
            {
                "name": "show_id",
                "data_type": "String",
                "semantic_type": "Identifier",
                "distinct_count": 8790,
            },
            {
                "name": "type",
                "data_type": "String",
                "semantic_type": "Category",
                "distinct_count": 2,
            },
            {
                "name": "title",
                "data_type": "String",
                "semantic_type": "Text",
                "distinct_count": 8780,
            },
            {
                "name": "release_year",
                "data_type": "Int64",
                "semantic_type": "Year",
                "distinct_count": 70,
            },
            {
                "name": "duration_mins",
                "data_type": "Float64",
                "semantic_type": "Numeric",
                "distinct_count": 120,
            },
            {
                "name": "director",
                "data_type": "String",
                "semantic_type": "List",
                "distinct_count": 4500,
            },
        ]

    def test_tier_2_incompatibility_blocks_sum_on_text(self):
        validation = PlanValidator.validate_plan(
            chart_type="bar",
            dimension_col="type",
            metric_col="title",
            aggregation="sum",
            col_profiles=self.mock_profiles,
        )
        self.assertFalse(validation["is_valid"])
        self.assertEqual(validation["tier"], 2)
        self.assertEqual(validation["status"], "incompatible")
        self.assertIn("Cannot calculate SUM", validation["message"])

    def test_tier_3_high_cardinality_warning(self):
        validation = PlanValidator.validate_plan(
            chart_type="bar",
            dimension_col="show_id",
            metric_col="duration_mins",
            aggregation="mean",
            col_profiles=self.mock_profiles,
        )
        self.assertTrue(validation["is_valid"])
        self.assertEqual(validation["tier"], 3)
        self.assertEqual(validation["status"], "warning")
        self.assertIn("8,790 unique categories", validation["message"])

    def test_valid_plan(self):
        validation = PlanValidator.validate_plan(
            chart_type="bar",
            dimension_col="type",
            metric_col="duration_mins",
            aggregation="mean",
            col_profiles=self.mock_profiles,
        )
        self.assertTrue(validation["is_valid"])
        self.assertEqual(validation["tier"], 0)
        self.assertEqual(validation["status"], "valid")

    def test_recommendation_engine_generates_plans_with_explanations(self):
        recs = RecommendationEngine.generate_recommendations(self.mock_profiles)
        self.assertGreater(len(recs), 0)
        top = recs[0]
        self.assertIn("explanation", top)
        self.assertIn("confidence_score", top)
        self.assertGreater(top["confidence_score"], 0.8)


class TestAdvisorRouter(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        os.environ["DATA_VIS_DATA_DIR"] = self.temp_dir.name
        await init_db()
        self.client = TestClient(app)

    async def asyncTearDown(self):
        self.temp_dir.cleanup()

    async def test_advisor_endpoints(self):
        csv_path = os.path.join(self.temp_dir.name, "netflix_sample.csv")
        with open(csv_path, "w", encoding="utf-8") as f:
            f.write(
                "show_id,type,title,release_year,duration_mins\ns1,Movie,Dick Johnson Is Dead,2020,90\ns2,TV Show,Blood & Water,2021,45\ns3,Movie,Ganglands,2021,80\n"
            )

        # Ingest file
        ingest_res = self.client.post(
            "/api/v1/ingest/file",
            json={"workspace_id": "test-ws", "file_path": csv_path},
        )
        self.assertEqual(ingest_res.status_code, 200)
        ds_id = ingest_res.json()["dataset_id"]

        # Test Recommendations Endpoint
        rec_res = self.client.get(f"/api/v1/advisor/recommendations/{ds_id}")
        self.assertEqual(rec_res.status_code, 200)
        recs = rec_res.json()["recommendations"]
        self.assertGreater(len(recs), 0)
        self.assertIn("explanation", recs[0])

        # Test Validation Endpoint (Tier 2 Incompatibility on SUM(title))
        val_res = self.client.post(
            "/api/v1/advisor/validate",
            json={
                "dataset_id": ds_id,
                "chart_type": "bar",
                "dimension_col": "type",
                "metric_col": "title",
                "aggregation": "sum",
            },
        )
        self.assertEqual(val_res.status_code, 200)
        val_data = val_res.json()
        self.assertFalse(val_data["is_valid"])
        self.assertEqual(val_data["tier"], 2)
        self.assertEqual(val_data["status"], "incompatible")
        self.assertIn("Cannot calculate SUM", val_data["message"])


if __name__ == "__main__":
    unittest.main()
