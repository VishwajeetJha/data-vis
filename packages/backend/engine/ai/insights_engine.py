from typing import Any
import polars as pl
from engine.advisor.semantic_classifier import SemanticClassifier
from engine.ingest.parser_factory import ParserFactory


class InsightsEngine:
    @classmethod
    def generate_statistical_profile(cls, file_path: str) -> dict[str, Any]:
        metadata, lazy_df = ParserFactory.parse_file(file_path)
        df_sample = lazy_df.limit(10000).collect()
        total_rows = len(df_sample)

        col_profiles: list[dict[str, Any]] = []

        for col in df_sample.columns:
            series = df_sample[col]
            null_count = int(series.null_count())
            null_pct = round((null_count / total_rows) * 100.0, 2) if total_rows > 0 else 0.0
            n_unique = int(series.n_unique())

            # Infer semantic type & cardinality intelligence
            semantic_info = SemanticClassifier.classify_column(
                col_name=col,
                dtype_str=str(series.dtype),
                series=series,
                total_rows=total_rows,
                distinct_count=n_unique,
            )

            col_meta: dict[str, Any] = {
                "name": col,
                "data_type": str(series.dtype),
                "semantic_type": semantic_info["semantic_type"],
                "uniqueness_ratio": semantic_info["uniqueness_ratio"],
                "is_suitable_for_grouping": semantic_info["is_suitable_for_grouping"],
                "is_suitable_for_metric": semantic_info["is_suitable_for_metric"],
                "semantic_warning": semantic_info.get("warning"),
                "null_count": null_count,
                "null_percentage": null_pct,
                "distinct_count": n_unique,
                "min": None,
                "max": None,
                "mean": None,
                "median": None,
                "std": None,
                "top_values": [],
            }

            # Top 5 most frequent values
            try:
                top_v = (
                    df_sample.group_by(col)
                    .len()
                    .sort("len", descending=True)
                    .limit(5)
                )
                col_meta["top_values"] = [
                    {"value": str(row[0]), "count": int(row[1])}
                    for row in top_v.iter_rows()
                    if row[0] is not None
                ]
            except Exception:
                pass

            # Numeric statistics
            if series.dtype in [
                pl.Float32,
                pl.Float64,
                pl.Int8,
                pl.Int16,
                pl.Int32,
                pl.Int64,
                pl.UInt8,
                pl.UInt16,
                pl.UInt32,
                pl.UInt64,
            ]:
                non_null = series.drop_nulls()
                if len(non_null) > 0:
                    col_meta["min"] = float(non_null.min()) if non_null.min() is not None else None
                    col_meta["max"] = float(non_null.max()) if non_null.max() is not None else None
                    col_meta["mean"] = round(float(non_null.mean()), 2) if non_null.mean() is not None else None
                    col_meta["median"] = round(float(non_null.median()), 2) if non_null.median() is not None else None
                    col_meta["std"] = round(float(non_null.std()), 2) if non_null.std() is not None else None

            col_profiles.append(col_meta)

        insights = cls.generate_insights(lazy_df)

        return {
            "file_name": metadata["file_name"],
            "row_count": metadata["row_count"],
            "column_count": metadata["column_count"],
            "file_size_bytes": metadata["file_size_bytes"],
            "duplicate_count": int(df_sample.is_duplicated().sum()),
            "columns": col_profiles,
            "insights": insights,
        }

    @classmethod
    def generate_insights(cls, lazy_df: pl.LazyFrame) -> list[dict[str, Any]]:
        insights: list[dict[str, Any]] = []

        # Collect summary profile
        df_sample = lazy_df.limit(10000).collect()
        total_rows = len(df_sample)

        if total_rows == 0:
            return insights

        for col in df_sample.columns:
            series = df_sample[col]
            null_count = series.null_count()
            null_pct = (null_count / total_rows) * 100.0

            # 1. Null Warning Insight
            if null_pct > 20.0:
                insights.append(
                    {
                        "column": col,
                        "type": "warning",
                        "category": "missing_data",
                        "title": f"High missing values in '{col}'",
                        "description": f"Column '{col}' contains {null_pct:.1f}% missing or null values.",
                    }
                )

            # 2. High Cardinality Insight
            n_unique = series.n_unique()
            if series.dtype == pl.Utf8 and n_unique > 50 and n_unique < total_rows:
                insights.append(
                    {
                        "column": col,
                        "type": "info",
                        "category": "cardinality",
                        "title": f"High cardinality categorical column '{col}'",
                        "description": f"Column '{col}' contains {n_unique} unique categories.",
                    }
                )

            # 3. Numeric Distribution & Skewness Insight
            if series.dtype in [
                pl.Float32,
                pl.Float64,
                pl.Int16,
                pl.Int32,
                pl.Int64,
            ]:
                non_null = series.drop_nulls()
                if len(non_null) > 10:
                    mean_val = float(non_null.mean() or 0)
                    std_val = float(non_null.std() or 0)
                    min_val = float(non_null.min() or 0)
                    max_val = float(non_null.max() or 0)

                    if std_val > 0 and (max_val - mean_val) > 3 * std_val:
                        insights.append(
                            {
                                "column": col,
                                "type": "info",
                                "category": "distribution",
                                "title": f"Positive skew / potential outliers in '{col}'",
                                "description": f"Maximum value ({max_val}) is over 3 standard deviations above the mean ({mean_val:.2f}).",
                            }
                        )

        return insights
