import unittest

from fastapi.testclient import TestClient

from main import app


class TestHealthEndpoint(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_health_check(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "ok")
        self.assertIn("polars_version", data)

    def test_system_config(self):
        response = self.client.get("/api/v1/system/config")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["version"], "1.0.0-rc")
        self.assertEqual(data["theme"], "dark")


if __name__ == "__main__":
    unittest.main()
