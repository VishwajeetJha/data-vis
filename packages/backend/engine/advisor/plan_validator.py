from typing import Any


class PlanValidator:
    """Pre-execution validation layer enforcing mathematical compatibility,

    cardinality sanity, and analytical meaningfulness.
    """

    @classmethod
    def validate_plan(
        cls,
        chart_type: str,
        dimension_col: str | None,
        metric_col: str | None,
        aggregation: str | None,
        col_profiles: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """Validates a proposed chart configuration against dataset column profiles.

        Returns a structured validation result with error tiers and actionable suggestions.
        """
        # Map profiles for quick lookup
        profile_map = {c["name"]: c for c in col_profiles}

        dim_meta = profile_map.get(dimension_col) if dimension_col else None
        metric_meta = profile_map.get(metric_col) if metric_col else None

        # -------------------------------------------------------------
        # TIER 2: ANALYTICAL INCOMPATIBILITY (Hard Block)
        # -------------------------------------------------------------

        # 1. Non-numeric column with mathematical aggregation
        if metric_meta and aggregation in ["sum", "mean", "avg", "median", "std", "std_dev"]:
            sem_type = metric_meta.get("semantic_type", "")
            dtype = metric_meta.get("data_type", "")
            if sem_type in ["Text", "Identifier", "List", "Boolean"] or any(
                t in dtype.lower() for t in ["str", "utf8"]
            ):
                return {
                    "is_valid": False,
                    "tier": 2,
                    "status": "incompatible",
                    "title": "Analytical Incompatibility",
                    "message": f"Cannot calculate {aggregation.upper()} on '{metric_col}' because it is a {sem_type or 'Text'} column.",
                    "suggestions": [
                        {
                            "action": "change_aggregation",
                            "value": "count",
                            "label": "Use 'Count' aggregation instead",
                        },
                        {
                            "action": "change_aggregation",
                            "value": "count_distinct",
                            "label": "Use 'Count Distinct' aggregation instead",
                        },
                    ],
                }

        # 2. Histogram requires a numeric measure
        if chart_type == "hist" and metric_meta:
            sem_type = metric_meta.get("semantic_type", "")
            if sem_type in ["Text", "Identifier", "List", "Date", "Datetime"]:
                return {
                    "is_valid": False,
                    "tier": 2,
                    "status": "incompatible",
                    "title": "Invalid Histogram Target",
                    "message": f"Histograms require continuous numeric intervals, but '{metric_col}' is a {sem_type} column.",
                    "suggestions": [
                        {
                            "action": "change_chart_type",
                            "value": "bar",
                            "label": "Switch to Bar Chart",
                        },
                    ],
                }

        # 3. Scatter plot requires numeric continuous measures
        if chart_type == "scatter":
            if dim_meta and dim_meta.get("semantic_type") in ["Text", "Identifier"]:
                return {
                    "is_valid": False,
                    "tier": 2,
                    "status": "incompatible",
                    "title": "Invalid Scatter Dimension",
                    "message": f"Scatter plots explore relationships between continuous measures. '{dimension_col}' is a {dim_meta.get('semantic_type')}.",
                    "suggestions": [
                        {
                            "action": "change_chart_type",
                            "value": "bar",
                            "label": "Switch to Bar Chart",
                        },
                    ],
                }

        # -------------------------------------------------------------
        # TIER 3: POOR / DEGRADED VISUALIZATION WARNING
        # -------------------------------------------------------------

        # 1. High-cardinality dimension on Bar or Pie chart
        if chart_type in ["bar", "pie", "area"] and dim_meta:
            distinct_cnt = dim_meta.get("distinct_count", 0)
            sem_type = dim_meta.get("semantic_type", "")

            if distinct_cnt > 50 or sem_type == "Identifier":
                return {
                    "is_valid": True,
                    "tier": 3,
                    "status": "warning",
                    "title": "High Cardinality Warning",
                    "message": f"'{dimension_col}' contains {distinct_cnt:,} unique categories. Plotting this will create a crowded, unreadable chart.",
                    "suggestions": [
                        {"action": "add_filter", "label": "Filter top categories"},
                        {
                            "action": "change_dimension",
                            "label": "Choose a lower-cardinality category or date",
                        },
                    ],
                }

        # 2. Multi-value List column warning
        if dim_meta and dim_meta.get("semantic_type") == "List":
            return {
                "is_valid": True,
                "tier": 3,
                "status": "warning",
                "title": "Multi-Value List Column",
                "message": f"'{dimension_col}' contains comma-separated values. Unnesting in 'Clean Data' is recommended for accurate counts.",
                "suggestions": [
                    {"action": "clean_data", "label": "Split and Unnest in Clean Data"},
                ],
            }

        # Valid & clean
        return {
            "is_valid": True,
            "tier": 0,
            "status": "valid",
            "title": "Valid Configuration",
            "message": "Analytical mapping is mathematically and visually sound.",
            "suggestions": [],
        }
