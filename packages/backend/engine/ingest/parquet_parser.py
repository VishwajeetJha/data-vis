from typing import Any

import polars as pl


class ParquetParser:
    @classmethod
    def parse(cls, file_path: str) -> tuple[int, int, list[dict[str, Any]], pl.LazyFrame]:
        lazy_df = pl.scan_parquet(file_path)
        schema_dict = lazy_df.collect_schema()
        column_count = len(schema_dict)
        row_count = lazy_df.select(pl.len()).collect().item()

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
