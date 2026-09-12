import os
from typing import Any

import polars as pl

from engine.fingerprint.fingerprint_service import FingerprintService
from engine.ingest.csv_parser import CSVParser
from engine.ingest.excel_parser import ExcelParser
from engine.ingest.json_parser import JSONParser
from engine.ingest.parquet_parser import ParquetParser


class ParserFactory:
    @classmethod
    def parse_file(
        cls, file_path: str, sheet_name: str = None, delimiter: str = None
    ) -> tuple[dict[str, Any], pl.LazyFrame]:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Source file not found: {file_path}")

        file_name = os.path.basename(file_path)
        file_ext = os.path.splitext(file_name)[1].lower().strip(".")
        file_size = os.path.getsize(file_path)

        if file_ext in ["csv", "tsv", "txt"]:
            fmt = "csv"
            row_count, col_count, schema, lazy_df = CSVParser.parse(file_path, delimiter=delimiter)
        elif file_ext in ["xlsx", "xls", "xlsb", "xlsm"]:
            fmt = "excel"
            row_count, col_count, schema, lazy_df = ExcelParser.parse(
                file_path, sheet_name=sheet_name
            )
        elif file_ext in ["json", "jsonl", "ndjson"]:
            fmt = "json"
            row_count, col_count, schema, lazy_df = JSONParser.parse(file_path)
        elif file_ext in ["parquet"]:
            fmt = "parquet"
            row_count, col_count, schema, lazy_df = ParquetParser.parse(file_path)
        else:
            # Fallback to CSV parser
            fmt = "csv"
            row_count, col_count, schema, lazy_df = CSVParser.parse(file_path)

        fingerprint = FingerprintService.compute_fingerprint(file_path, column_count=col_count)

        metadata = {
            "file_path": file_path,
            "file_name": file_name,
            "file_format": fmt,
            "file_size_bytes": file_size,
            "row_count": row_count,
            "column_count": col_count,
            "fingerprint": fingerprint,
            "schema": schema,
        }

        return metadata, lazy_df
