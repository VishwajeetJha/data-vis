from typing import Any

import polars as pl


class ExpressionBuilder:
    @classmethod
    def build_filter_expr(cls, filter_condition: dict[str, Any]) -> pl.Expr:
        col_name = filter_condition["column"]
        op = filter_condition["operator"].lower()
        val = filter_condition.get("value")

        col = pl.col(col_name)

        if op in ["eq", "equals", "="]:
            return col == val
        elif op in ["neq", "not_equals", "!="]:
            return col != val
        elif op in ["gt", ">"]:
            return col > val
        elif op in ["gte", ">="]:
            return col >= val
        elif op in ["lt", "<"]:
            return col < val
        elif op in ["lte", "<="]:
            return col <= val
        elif op in ["contains"]:
            import re
            escaped_val = re.escape(str(val))
            return col.cast(pl.Utf8).str.contains(f"(?i){escaped_val}")
        elif op in ["starts_with"]:
            return col.str.starts_with(str(val))
        elif op in ["ends_with"]:
            return col.str.ends_with(str(val))
        elif op in ["in", "in_list"]:
            if not isinstance(val, list):
                val = [val]
            return col.is_in(val)
        elif op in ["is_null"]:
            return col.is_null()
        elif op in ["not_null"]:
            return col.is_not_null()
        elif op in ["between"]:
            if isinstance(val, list) and len(val) == 2:
                return col.is_between(val[0], val[1])
            return col.is_not_null()
        else:
            return col == val

    @classmethod
    def build_aggregation_expr(cls, agg_dto: dict[str, Any]) -> pl.Expr:
        col_name = agg_dto["column"]
        func = agg_dto["agg_func"].lower()
        alias = agg_dto.get("alias") or f"{func}_{col_name}"

        col = pl.col(col_name)

        if func in ["sum"]:
            expr = pl.coalesce([col.cast(pl.Float64, strict=False), pl.lit(0)]).sum()
        elif func in ["mean", "avg", "average"]:
            expr = col.cast(pl.Float64, strict=False).mean()
        elif func in ["median"]:
            expr = col.cast(pl.Float64, strict=False).median()
        elif func in ["min"]:
            expr = col.min()
        elif func in ["max"]:
            expr = col.max()
        elif func in ["count"]:
            expr = col.count()
        elif func in ["count_distinct", "n_unique"]:
            expr = col.n_unique()
        elif func in ["std", "std_dev"]:
            expr = col.cast(pl.Float64, strict=False).std()
        elif func in ["var", "variance"]:
            expr = col.cast(pl.Float64, strict=False).var()
        else:
            expr = col.count()

        return expr.alias(alias)
