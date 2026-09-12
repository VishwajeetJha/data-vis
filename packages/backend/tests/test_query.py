import unittest

import polars as pl

from engine.query.query_compiler import QueryCompiler


class TestQueryCompiler(unittest.TestCase):
    def setUp(self):
        self.df = pl.DataFrame(
            {
                "region": ["North", "North", "South", "South", "East"],
                "revenue": [100.0, 200.0, 150.0, 300.0, 50.0],
                "units": [10, 20, 15, 30, 5],
            }
        ).lazy()

    def test_filter_and_aggregation(self):
        query_dto = {
            "filters": [{"column": "revenue", "operator": "gte", "value": 100.0}],
            "group_by": ["region"],
            "aggregations": [
                {"column": "revenue", "agg_func": "sum", "alias": "total_revenue"},
                {"column": "units", "agg_func": "mean", "alias": "avg_units"},
            ],
            "sort": [{"column": "total_revenue", "descending": True}],
        }

        rows, meta = QueryCompiler.execute_query(self.df, query_dto)

        self.assertGreater(meta["execution_time_ms"], 0)
        self.assertEqual(meta["total_matching_rows"], 2)  # North and South
        self.assertEqual(rows[0]["region"], "South")
        self.assertEqual(rows[0]["total_revenue"], 450.0)

    def test_limit_offset(self):
        query_dto = {"sort": [{"column": "revenue", "descending": True}], "limit": 2, "offset": 1}
        rows, meta = QueryCompiler.execute_query(self.df, query_dto)
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]["revenue"], 200.0)

    def test_search_term(self):
        query_dto = {"search_term": "sou"}
        rows, meta = QueryCompiler.execute_query(self.df, query_dto)
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]["region"], "South")


if __name__ == "__main__":
    unittest.main()
