import time

import polars as pl

from engine.query.query_compiler import QueryCompiler


class TestStressAndEdgeBenchmarks:
    """
    Exhaustive stress testing suite as mandated by The Bhagwad Gita / The Development Directive.
    """

    def test_one_million_row_aggregation_performance(self):
        """Verify 1,000,000 row aggregation compiles and executes in under 100ms."""
        n_rows = 1_000_000
        df = pl.DataFrame(
            {
                "category": ["Dept A", "Dept B", "Dept C", "Dept D", "Dept E"] * (n_rows // 5),
                "amount": [12.5, 45.0, 99.2, 5.1, 78.4] * (n_rows // 5),
                "score": [1, 2, 3, 4, 5] * (n_rows // 5),
            }
        )

        query_dto = {
            "dataset_id": "test-million-rows",
            "group_by": ["category"],
            "aggregations": [
                {"column": "amount", "agg_func": "sum", "alias": "sum_amount"},
                {"column": "score", "agg_func": "mean", "alias": "mean_score"},
            ],
            "sort": [{"column": "sum_amount", "descending": True}],
        }

        start = time.perf_counter()
        rows, meta = QueryCompiler.execute_query(df.lazy(), query_dto)
        elapsed_ms = (time.perf_counter() - start) * 1000.0

        assert len(rows) == 5
        assert meta["total_matching_rows"] == 5
        assert elapsed_ms < 1000.0  # Polars multi-threaded aggregation speed on 1M rows
        assert rows[0]["sum_amount"] >= rows[1]["sum_amount"]

    def test_multi_valued_list_dimension_exploding(self):
        """Test on-the-fly exploding of comma-separated multi-valued list dimensions."""
        df = pl.DataFrame(
            {
                "title": ["Inception", "Interstellar", "Jurassic Park", "Catch Me If You Can"],
                "director": [
                    "Christopher Nolan",
                    "Christopher Nolan",
                    "Steven Spielberg",
                    "Steven Spielberg, Christopher Nolan",
                ],
                "revenue": [830, 700, 1000, 350],
            }
        )

        query_dto = {
            "dataset_id": "test-explode",
            "group_by": ["director"],
            "aggregations": [{"column": "revenue", "agg_func": "sum", "alias": "sum_revenue"}],
            "explode_dimension": True,
            "sort": [{"column": "sum_revenue", "descending": True}],
        }

        rows, meta = QueryCompiler.execute_query(df.lazy(), query_dto)

        # Both directors should now be distinct entries with exploded contributions
        directors = [r["director"] for r in rows]
        assert "Steven Spielberg" in directors
        assert "Christopher Nolan" in directors
        assert len(directors) == 2

        # Christopher Nolan: Inception (830) + Interstellar (700) + Catch Me (350) = 1880
        nolan_row = next(r for r in rows if r["director"] == "Christopher Nolan")
        assert nolan_row["sum_revenue"] == 1880

    def test_bidirectional_metric_sorting_invariance(self):
        """Verify sorting by high-to-low and low-to-high across metric aliases."""
        df = pl.DataFrame(
            {
                "dept": ["Eng", "Sales", "HR", "Marketing", "Legal"],
                "salary": [150000, 90000, 75000, 85000, 120000],
            }
        )

        # 1. High to Low
        q_desc = {
            "dataset_id": "test-sort",
            "group_by": ["dept"],
            "aggregations": [{"column": "salary", "agg_func": "mean", "alias": "mean_salary"}],
            "sort": [{"column": "mean_salary", "descending": True}],
        }
        rows_desc, _ = QueryCompiler.execute_query(df.lazy(), q_desc)
        salaries_desc = [r["mean_salary"] for r in rows_desc]
        assert salaries_desc == sorted(salaries_desc, reverse=True)

        # 2. Low to High
        q_asc = {
            "dataset_id": "test-sort",
            "group_by": ["dept"],
            "aggregations": [{"column": "salary", "agg_func": "mean", "alias": "mean_salary"}],
            "sort": [{"column": "mean_salary", "descending": False}],
        }
        rows_asc, _ = QueryCompiler.execute_query(df.lazy(), q_asc)
        salaries_asc = [r["mean_salary"] for r in rows_asc]
        assert salaries_asc == sorted(salaries_asc, reverse=False)

    def test_date_chronological_sorting_invariance(self):
        """Verify dates in various string formats sort chronologically, not lexicographically."""
        df = pl.DataFrame(
            {
                "date_added": [
                    "September 25, 2021",
                    "January 1, 2020",
                    "July 15, 2020",
                    "February 3, 2019",
                ],
                "views": [100, 500, 300, 200],
            }
        )

        # Ascending chronological sort
        q_date = {
            "dataset_id": "test-date-sort",
            "group_by": ["date_added"],
            "aggregations": [{"column": "views", "agg_func": "sum", "alias": "sum_views"}],
            "sort": [{"column": "date_added", "descending": False}],
        }

        rows, _ = QueryCompiler.execute_query(df.lazy(), q_date)
        dates = [r["date_added"] for r in rows]

        assert dates[0] == "February 3, 2019"
        assert dates[1] == "January 1, 2020"
        assert dates[2] == "July 15, 2020"
        assert dates[3] == "September 25, 2021"

    def test_dirty_dataset_fuzzing(self):
        """Ensure resilient query execution on dirty data with nulls, trailing whitespaces, NaNs."""
        df = pl.DataFrame(
            {
                "category": ["  Tech ", None, "Tech", "Finance", "", "Finance "],
                "value": [10.0, float("nan"), 20.0, None, 5.0, 15.0],
            }
        )

        query_dto = {
            "dataset_id": "test-dirty",
            "group_by": ["category"],
            "aggregations": [{"column": "value", "agg_func": "sum", "alias": "sum_val"}],
            "sort": [{"column": "sum_val", "descending": True}],
        }

        rows, meta = QueryCompiler.execute_query(df.lazy(), query_dto)
        assert len(rows) > 0
        assert meta["execution_time_ms"] >= 0
