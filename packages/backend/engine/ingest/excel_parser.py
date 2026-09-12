from typing import Any

import polars as pl


class ExcelParser:
    @classmethod
    def parse(
        cls, file_path: str, sheet_name: str = None
    ) -> tuple[int, int, list[dict[str, Any]], pl.LazyFrame]:
        # Read excel via Polars read_excel (which uses calamine engine)
        if sheet_name:
            df = pl.read_excel(file_path, sheet_name=sheet_name)
        else:
            df = pl.read_excel(file_path)

        lazy_df = df.lazy()
        schema_dict = df.schema
        column_count = len(schema_dict)
        row_count = len(df)

        sample_data = df.head(5)

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
