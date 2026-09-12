from typing import Any

import polars as pl


class JSONParser:
    @classmethod
    def parse(
        cls, file_path: str, sample_rows: int = 1000
    ) -> tuple[int, int, list[dict[str, Any]], pl.LazyFrame]:
        # Attempt reading JSON lines first, then fallback to JSON array
        try:
            lazy_df = pl.scan_ndjson(file_path, infer_schema_length=sample_rows)
            schema_dict = lazy_df.collect_schema()
            row_count = lazy_df.select(pl.len()).collect().item()
        except Exception:
            df = pl.read_json(file_path)
            lazy_df = df.lazy()
            schema_dict = df.schema
            row_count = len(df)

        column_count = len(schema_dict)
        sample_data = lazy_df.limit(5).collect()

        schema_list = []
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
