import re
import time
from typing import Any

import polars as pl

from engine.query.expression_builder import ExpressionBuilder


class QueryCompiler:
    @classmethod
    def execute_query(
        cls, lazy_df: pl.LazyFrame, query_dto: dict[str, Any]
    ) -> tuple[list[dict[str, Any]], dict[str, Any]]:
        start_time = time.perf_counter()

        df_plan = lazy_df

        # 1. Apply Global Search Term (across all columns)
        search_term = query_dto.get("search_term")
        if search_term and str(search_term).strip():
            escaped_term = re.escape(str(search_term).strip())
            cols = df_plan.collect_schema().names()
            or_exprs = [pl.col(c).cast(pl.Utf8).str.contains(f"(?i){escaped_term}") for c in cols]
            if or_exprs:
                combined_expr = or_exprs[0]
                for e in or_exprs[1:]:
                    combined_expr = combined_expr | e
                df_plan = df_plan.filter(combined_expr)

        # 2. Apply Filters
        filters = query_dto.get("filters", [])
        for f in filters:
            expr = ExpressionBuilder.build_filter_expr(f)
            df_plan = df_plan.filter(expr)

        # 2. Apply Group-by & Aggregations
        group_by = query_dto.get("group_by", [])
        aggregations = query_dto.get("aggregations", [])

        # Explode multi-valued list dimensions on the fly
        if query_dto.get("explode_dimension") and group_by:
            for dim in group_by:
                df_plan = (
                    df_plan.with_columns(pl.col(dim).cast(pl.String).str.split(","))
                    .explode(dim)
                    .with_columns(pl.col(dim).str.strip_chars())
                    .filter(pl.col(dim).is_not_null() & (pl.col(dim) != ""))
                )

        if group_by or aggregations:
            agg_exprs = [ExpressionBuilder.build_aggregation_expr(a) for a in aggregations]
            if group_by:
                df_plan = df_plan.group_by(group_by).agg(agg_exprs)
            else:
                df_plan = df_plan.select(agg_exprs)

        # 3. Select columns if specified
        select_cols = query_dto.get("select_columns")
        if select_cols and not group_by and not aggregations:
            df_plan = df_plan.select(select_cols)

        # 4. Apply Sort
        sort_rules = query_dto.get("sort", [])
        if sort_rules:
            by_exprs = []
            desc_list = []

            # Map raw column names to aggregation aliases
            agg_alias_map = {a["column"]: a.get("alias", a["column"]) for a in aggregations}

            for s in sort_rules:
                col_name = s.get("column", "")
                descending = s.get("descending", False)

                # If col_name was mapped to an aggregation alias, resolve it
                if col_name in agg_alias_map:
                    col_name = agg_alias_map[col_name]
                elif aggregations:
                    # If col_name matches any aggregation alias suffix
                    matched = next(
                        (
                            a.get("alias")
                            for a in aggregations
                            if a.get("alias", "").endswith(col_name)
                        ),
                        None,
                    )
                    if matched:
                        col_name = matched

                if col_name:
                    if re.search(r"(date|created_at|updated_at|timestamp|dob)", col_name.lower()):
                        date_expr = pl.coalesce(
                            [
                                pl.col(col_name).str.to_date("%B %d, %Y", strict=False),
                                pl.col(col_name).str.to_date("%m/%d/%Y", strict=False),
                                pl.col(col_name).str.to_date("%d/%m/%Y", strict=False),
                                pl.col(col_name).str.to_date("%Y-%m-%d", strict=False),
                                pl.col(col_name).cast(pl.Date, strict=False),
                                pl.col(col_name),
                            ]
                        )
                        by_exprs.append(date_expr)
                    else:
                        by_exprs.append(pl.col(col_name))
                    desc_list.append(descending)

            if by_exprs:
                df_plan = df_plan.sort(by_exprs, descending=desc_list)
        elif group_by:
            # Default to sorting by grouping column so categories/numeric X-axis are naturally ordered
            df_plan = df_plan.sort(group_by, descending=False)

        # 5. Evaluate Total Matching Rows
        total_rows_plan = df_plan.select(pl.len())

        # 6. Apply Limit & Offset
        limit = query_dto.get("limit", 10000)
        offset = query_dto.get("offset", 0)

        if offset:
            df_plan = df_plan.slice(offset, limit)
        elif limit:
            df_plan = df_plan.limit(limit)

        # Collect materialized results
        result_df = df_plan.collect()
        total_rows = total_rows_plan.collect().item()

        elapsed_ms = (time.perf_counter() - start_time) * 1000.0

        cols = result_df.columns
        col_types = [str(t) for t in result_df.dtypes]

        # Convert to dictionary array
        rows_data = result_df.to_dicts()

        meta = {
            "execution_time_ms": round(elapsed_ms, 2),
            "total_matching_rows": total_rows,
            "columns": cols,
            "column_types": col_types,
        }

        return rows_data, meta
