from typing import Any


class RecommendationEngine:
    """Generates ranked candidate Visualization Plans with natural language

    reasoning based on semantic column types and dataset distributions.
    """

    @classmethod
    def generate_recommendations(cls, col_profiles: list[dict[str, Any]]) -> list[dict[str, Any]]:
        recommendations: list[dict[str, Any]] = []

        categories = [c for c in col_profiles if c.get("semantic_type") == "Category" and c.get("distinct_count", 0) <= 50]
        dates = [c for c in col_profiles if c.get("semantic_type") in ["Date", "Datetime", "Year"]]
        numerics = [c for c in col_profiles if c.get("semantic_type") == "Numeric"]

        # 1. Temporal Trend Recommendation (Line Chart)
        if dates:
            primary_date = dates[0]["name"]
            if numerics:
                metric = numerics[0]["name"]
                recommendations.append({
                    "id": f"rec-trend-{primary_date}-{metric}",
                    "title": f"{metric} Trend over {primary_date}",
                    "chart_type": "line",
                    "dimension": primary_date,
                    "metric": metric,
                    "aggregation": "mean",
                    "confidence_score": 0.95,
                    "explanation": f"'{primary_date}' is temporal and '{metric}' is continuous numeric. Showing trend changes over time is optimal for a Line Chart.",
                })
            else:
                recommendations.append({
                    "id": f"rec-volume-{primary_date}",
                    "title": f"Record Volume by {primary_date}",
                    "chart_type": "line",
                    "dimension": primary_date,
                    "metric": primary_date,
                    "aggregation": "count",
                    "confidence_score": 0.90,
                    "explanation": f"'{primary_date}' is temporal. Analyzing chronological volume distributions is optimal for a Line Chart.",
                })

        # 2. Categorical Comparison Recommendation (Bar Chart)
        if categories:
            primary_cat = categories[0]["name"]
            if numerics:
                metric = numerics[0]["name"]
                recommendations.append({
                    "id": f"rec-cat-metric-{primary_cat}-{metric}",
                    "title": f"Average {metric} by {primary_cat}",
                    "chart_type": "bar",
                    "dimension": primary_cat,
                    "metric": metric,
                    "aggregation": "mean",
                    "confidence_score": 0.92,
                    "explanation": f"'{primary_cat}' is a discrete category ({categories[0].get('distinct_count', 0)} distinct values) and '{metric}' is numeric. Comparing averages across categories is optimal for a Bar Chart.",
                })
            else:
                recommendations.append({
                    "id": f"rec-cat-count-{primary_cat}",
                    "title": f"Count Distribution by {primary_cat}",
                    "chart_type": "bar",
                    "dimension": primary_cat,
                    "metric": primary_cat,
                    "aggregation": "count",
                    "confidence_score": 0.88,
                    "explanation": f"'{primary_cat}' has {categories[0].get('distinct_count', 0)} discrete categories. Comparing frequencies is optimal for a Bar Chart.",
                })

        # 3. Composition Share (Pie / Donut)
        low_card_cats = [c for c in categories if c.get("distinct_count", 0) <= 7]
        if low_card_cats:
            pie_cat = low_card_cats[0]["name"]
            recommendations.append({
                "id": f"rec-composition-{pie_cat}",
                "title": f"Proportion Share of {pie_cat}",
                "chart_type": "pie",
                "dimension": pie_cat,
                "metric": pie_cat,
                "aggregation": "count",
                "confidence_score": 0.85,
                "explanation": f"'{pie_cat}' contains only {low_card_cats[0].get('distinct_count', 0)} slices, making it suitable for a part-to-whole Pie Chart without visual clutter.",
            })

        # 4. Correlation / Relationship (Scatter Plot)
        if len(numerics) >= 2:
            num1 = numerics[0]["name"]
            num2 = numerics[1]["name"]
            recommendations.append({
                "id": f"rec-scatter-{num1}-{num2}",
                "title": f"{num1} vs {num2} Relationship",
                "chart_type": "scatter",
                "dimension": num1,
                "metric": num2,
                "aggregation": "none",
                "confidence_score": 0.87,
                "explanation": f"Both '{num1}' and '{num2}' are continuous numeric metrics. Visualizing point distributions is optimal for evaluating correlations.",
            })

        # 5. Frequency Distribution (Histogram)
        if numerics:
            num_dist = numerics[0]["name"]
            recommendations.append({
                "id": f"rec-hist-{num_dist}",
                "title": f"{num_dist} Frequency Distribution",
                "chart_type": "hist",
                "dimension": num_dist,
                "metric": num_dist,
                "aggregation": "count",
                "confidence_score": 0.83,
                "explanation": f"'{num_dist}' is continuous numeric. Analyzing shape and skewness across 10 binned intervals is optimal for a Histogram.",
            })

        # Sort recommendations by confidence score
        return sorted(recommendations, key=lambda x: x.get("confidence_score", 0), reverse=True)
