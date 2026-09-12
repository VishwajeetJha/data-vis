import unittest
import polars as pl

from engine.ai.insights_engine import InsightsEngine
from engine.ai.nlq_compiler import NLQCompiler


class TestAIEngine(unittest.TestCase):
    def setUp(self):
        self.schema = [
            {"name": "region", "data_type": "String"},
            {"name": "revenue", "data_type": "Float64"},
            {"name": "units", "data_type": "Int64"},
        ]
        self.col_profiles = [
            {"name": "region", "data_type": "String", "semantic_type": "Category", "distinct_count": 4},
            {"name": "revenue", "data_type": "Float64", "semantic_type": "Numeric", "distinct_count": 100},
            {"name": "units", "data_type": "Int64", "semantic_type": "Numeric", "distinct_count": 50},
        ]

    def test_nlq_parsing(self):
        prompt = "Show average revenue by region as a line chart"
        res = NLQCompiler.parse_prompt(prompt, self.schema, self.col_profiles)

        self.assertEqual(res["chart_type"], "line")
        self.assertEqual(res["dimension"], "region")
        self.assertEqual(res["metric"], "revenue")
        self.assertEqual(res["aggregation"], "mean")
        self.assertIn("explanation", res)
        self.assertEqual(res["query"]["group_by"], ["region"])
        self.assertEqual(res["query"]["aggregations"][0]["agg_func"], "mean")

    def test_strict_rejection_of_ungrounded_columns(self):
        # Asking for columns that do not exist (like 'time' and 'age') must raise ValueError with explanation
        with self.assertRaises(ValueError) as ctx:
            NLQCompiler.parse_prompt("show time by age", self.schema, self.col_profiles)
        self.assertIn("Could not find columns matching", str(ctx.exception))
        self.assertIn("Available columns", str(ctx.exception))

    def test_fuzzy_column_token_matching(self):
        # Substrings 'rev' and 'reg' should fuzzy match to 'revenue' and 'region'
        res = NLQCompiler.parse_prompt("show avg rev by reg", self.schema, self.col_profiles)
        self.assertEqual(res["dimension"], "region")
        self.assertEqual(res["metric"], "revenue")
        self.assertEqual(res["aggregation"], "mean")

    def test_insights_generation(self):
        df = pl.DataFrame(
            {"cat": ["A", "B", None, "D", None], "val": [10.0, 20.0, 30.0, 40.0, 50.0]}
        ).lazy()

        insights = InsightsEngine.generate_insights(df)
        self.assertGreater(len(insights), 0)


if __name__ == "__main__":
    unittest.main()
