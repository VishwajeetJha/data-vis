import re
from typing import Any

import polars as pl


class TransformEngine:
    @classmethod
    def apply_transforms(
        cls, lazy_df: pl.LazyFrame, transforms: list[dict[str, Any]]
    ) -> pl.LazyFrame:
        df_plan = lazy_df

        for t in transforms:
            action = t.get("action")

            # 1. Calculated Column
            if action == "calculated_column":
                col_name = t.get("name")
                formula = t.get("formula", "")
                if col_name and formula:
                    df_plan = cls._apply_formula(df_plan, col_name, formula)

            # 2. Impute Null Values
            elif action == "impute_nulls":
                col_name = t.get("column")
                strategy = t.get("strategy", "mean")
                const_val = t.get("value")
                if col_name:
                    df_plan = cls._apply_imputation(df_plan, col_name, strategy, const_val)

            # 3. String Operations
            elif action in ["trim_strings", "string_case", "string_transform"]:
                col_name = t.get("column")
                mode = t.get("mode") or t.get("strategy") or "trim"
                if col_name:
                    df_plan = cls._apply_string_transform(df_plan, col_name, mode)

            # 4. Numeric Precision & Rounding
            elif action == "numeric_precision":
                col_name = t.get("column")
                precision = int(t.get("precision", 2))
                if col_name:
                    df_plan = df_plan.with_columns(pl.col(col_name).round(precision))

            # 5. Outlier Clamping
            elif action == "clamp_outliers":
                col_name = t.get("column")
                if col_name:
                    df_plan = cls._apply_outlier_clamping(df_plan, col_name)

            # 6. Split & Unnest Multi-Value List
            elif action in ["split_and_unnest", "explode_list"]:
                col_name = t.get("column")
                delimiter = t.get("delimiter", ",")
                if col_name:
                    df_plan = (
                        df_plan.with_columns(pl.col(col_name).cast(pl.Utf8).str.split(delimiter))
                        .explode(col_name)
                        .with_columns(pl.col(col_name).str.strip_chars())
                    )

        return df_plan

    @classmethod
    def _apply_formula(cls, lazy_df: pl.LazyFrame, col_name: str, formula: str) -> pl.LazyFrame:
        tokens = re.split(r"([+\-*/()])", formula)
        expr_parts = []
        schema_cols = lazy_df.collect_schema().names()

        for token in tokens:
            t = token.strip()
            if not t:
                continue
            if t in schema_cols:
                expr_parts.append(f'pl.col("{t}")')
            elif t in ["+", "-", "*", "/", "(", ")"]:
                expr_parts.append(t)
            elif re.match(r"^-?\d+(\.\d+)?$", t):
                expr_parts.append(t)

        built_expr_str = " ".join(expr_parts)
        try:
            safe_expr = eval(built_expr_str, {"pl": pl, "__builtins__": {}})
            return lazy_df.with_columns(safe_expr.alias(col_name))
        except Exception:
            return lazy_df

    @classmethod
    def _apply_imputation(
        cls, lazy_df: pl.LazyFrame, col_name: str, strategy: str, const_val: Any
    ) -> pl.LazyFrame:
        col = pl.col(col_name)
        if strategy == "mean":
            return lazy_df.with_columns(col.fill_null(col.mean()))
        elif strategy == "median":
            return lazy_df.with_columns(col.fill_null(col.median()))
        elif strategy == "constant" and const_val is not None:
            return lazy_df.with_columns(col.fill_null(const_val))
        elif strategy == "empty_unknown":
            return lazy_df.with_columns(col.fill_null("Unknown"))
        elif strategy == "zero":
            return lazy_df.with_columns(col.fill_null(0))
        return lazy_df

    @classmethod
    def _apply_string_transform(
        cls, lazy_df: pl.LazyFrame, col_name: str, mode: str
    ) -> pl.LazyFrame:
        col = pl.col(col_name).cast(pl.Utf8)
        if mode == "trim":
            return lazy_df.with_columns(col.str.strip_chars())
        elif mode == "uppercase":
            return lazy_df.with_columns(col.str.to_uppercase())
        elif mode == "lowercase":
            return lazy_df.with_columns(col.str.to_lowercase())
        elif mode == "titlecase":
            return lazy_df.with_columns(col.str.to_titlecase())
        elif mode == "remove_special_chars":
            return lazy_df.with_columns(col.str.replace_all(r"[^\w\s]", ""))
        return lazy_df.with_columns(col.str.strip_chars())

    @classmethod
    def _apply_outlier_clamping(cls, lazy_df: pl.LazyFrame, col_name: str) -> pl.LazyFrame:
        col = pl.col(col_name)
        mean_expr = col.mean()
        std_expr = col.std()
        lower_bound = mean_expr - 3 * std_expr
        upper_bound = mean_expr + 3 * std_expr
        return lazy_df.with_columns(col.clip(lower_bound, upper_bound))
