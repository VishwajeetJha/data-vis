import csv
from typing import Any

import polars as pl


class CSVParser:
    @staticmethod
    def detect_delimiter(file_path: str) -> str:
        try:
            with open(file_path, encoding="utf-8", errors="ignore") as f:
                sample = f.read(8192)
                sniffer = csv.Sniffer()
                dialect = sniffer.sniff(sample, delimiters=[",", "\t", ";", "|"])
                return dialect.delimiter
        except Exception:
            return ","

    @classmethod
    def parse(
        cls, file_path: str, delimiter: str = None, sample_rows: int = 1000
    ) -> tuple[int, int, list[dict[str, Any]], pl.LazyFrame]:
        if not delimiter:
            delimiter = cls.detect_delimiter(file_path)

        # Polars scan_csv for lazy out-of-core execution
        lazy_df = pl.scan_csv(
            file_path,
            separator=delimiter,
            infer_schema_length=sample_rows,
            ignore_errors=True,
        )

        # Evaluate row count and schema using a sample / header inspect
        schema_dict = lazy_df.collect_schema()
        column_count = len(schema_dict)

        # Count total rows safely
        row_count = lazy_df.select(pl.len()).collect().item()

        # Build schema DTO list
        schema_list = []
        sample_data = lazy_df.limit(5).collect()

        for col_name, col_type in schema_dict.items():
            samples = sample_data[col_name].to_list() if col_name in sample_data.columns else []
            schema_list.append(
                {
                    "name": col_name,
                    "data_type": str(col_type),
                    "nullable": True,
                    "sample_values": samples,
                }
            )

        return row_count, column_count, schema_list, lazy_df
