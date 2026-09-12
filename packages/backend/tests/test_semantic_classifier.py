import unittest

import polars as pl

from engine.advisor.semantic_classifier import SemanticClassifier


class TestSemanticClassifier(unittest.TestCase):
    def test_identifier_classification(self):
        # show_id: single-token alphanumeric ID (e.g. s1, s2, s3)
        id_series = pl.Series("show_id", [f"s{i}" for i in range(100)])
        res = SemanticClassifier.classify_column(
            col_name="show_id",
            dtype_str="String",
            series=id_series,
            total_rows=100,
            distinct_count=100,
        )
        self.assertEqual(res["semantic_type"], "Identifier")
        self.assertFalse(res["is_suitable_for_grouping"])
        self.assertIn("High cardinality alphanumeric identifier", res["warning"])

    def test_title_is_classified_as_text_not_identifier(self):
        # title: Movie / show titles with spaces and words (e.g. "Breaking Bad", "The Matrix")
        title_series = pl.Series(
            "title",
            ["Breaking Bad", "The Matrix", "Inception", "Stranger Things", "Pulp Fiction"] * 20,
        )
        res = SemanticClassifier.classify_column(
            col_name="title",
            dtype_str="String",
            series=title_series,
            total_rows=100,
            distinct_count=95,
        )
        self.assertEqual(res["semantic_type"], "Text")
        self.assertFalse(res["is_suitable_for_grouping"])
        self.assertFalse(res["is_suitable_for_metric"])
        self.assertIn("Natural language title or unstructured text", res["warning"])

    def test_category_classification(self):
        # Low cardinality discrete string
        res = SemanticClassifier.classify_column(
            col_name="type",
            dtype_str="String",
            total_rows=8790,
            distinct_count=2,
        )
        self.assertEqual(res["semantic_type"], "Category")
        self.assertTrue(res["is_suitable_for_grouping"])
        self.assertFalse(res["is_suitable_for_metric"])

    def test_numeric_measure_classification(self):
        # Continuous numeric metric
        res = SemanticClassifier.classify_column(
            col_name="Monthly_Salary",
            dtype_str="Float64",
            total_rows=1000,
            distinct_count=950,
        )
        self.assertEqual(res["semantic_type"], "Numeric")
        self.assertTrue(res["is_suitable_for_metric"])

    def test_temporal_year_classification(self):
        # Integer year column
        res = SemanticClassifier.classify_column(
            col_name="release_year",
            dtype_str="Int64",
            total_rows=5000,
            distinct_count=70,
        )
        self.assertEqual(res["semantic_type"], "Year")
        self.assertTrue(res["is_suitable_for_grouping"])

    def test_location_classification(self):
        res = SemanticClassifier.classify_column(
            col_name="Country",
            dtype_str="String",
            total_rows=1000,
            distinct_count=45,
        )
        self.assertEqual(res["semantic_type"], "Location")

    def test_text_classification(self):
        long_series = pl.Series(
            "description",
            [
                "A very long description that spans multiple sentences and represents unstructured free text."
            ]
            * 50,
        )
        res = SemanticClassifier.classify_column(
            col_name="description",
            dtype_str="String",
            series=long_series,
            total_rows=50,
            distinct_count=50,
        )
        self.assertEqual(res["semantic_type"], "Text")
        self.assertFalse(res["is_suitable_for_grouping"])


if __name__ == "__main__":
    unittest.main()
