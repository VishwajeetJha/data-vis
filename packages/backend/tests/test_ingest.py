import os
import tempfile
import unittest

from engine.fingerprint.fingerprint_service import FingerprintService
from engine.ingest.parser_factory import ParserFactory


class TestIngestionEngine(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_csv_ingestion_and_fingerprint(self):
        csv_path = os.path.join(self.temp_dir.name, "test_sales.csv")
        with open(csv_path, "w", encoding="utf-8") as f:
            f.write("region,sales,quantity\n")
            f.write("North,100.5,10\n")
            f.write("South,200.0,20\n")
            f.write("East,150.2,15\n")

        metadata, lazy_df = ParserFactory.parse_file(csv_path)

        self.assertEqual(metadata["file_name"], "test_sales.csv")
        self.assertEqual(metadata["file_format"], "csv")
        self.assertEqual(metadata["row_count"], 3)
        self.assertEqual(metadata["column_count"], 3)
        self.assertIsNotNone(metadata["fingerprint"])

        # Test fingerprint reproducibility
        fp2 = FingerprintService.compute_fingerprint(csv_path, column_count=3)
        self.assertEqual(metadata["fingerprint"], fp2)

    def test_json_ingestion(self):
        json_path = os.path.join(self.temp_dir.name, "test_data.jsonl")
        with open(json_path, "w", encoding="utf-8") as f:
            f.write('{"category": "A", "val": 10}\n')
            f.write('{"category": "B", "val": 20}\n')

        metadata, lazy_df = ParserFactory.parse_file(json_path)
        self.assertEqual(metadata["file_format"], "json")
        self.assertEqual(metadata["row_count"], 2)
        self.assertEqual(metadata["column_count"], 2)


if __name__ == "__main__":
    unittest.main()
