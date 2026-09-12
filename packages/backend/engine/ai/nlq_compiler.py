import difflib
import re
from typing import Any


class NLQCompiler:
    """Compiles natural language user prompts into validated, declarative

    Visualization Plans based on strict column grounding, fuzzy matching, and
    intent analysis.
    """

    STOP_WORDS = {
        "show",
        "plot",
        "graph",
        "chart",
        "display",
        "find",
        "give",
        "the",
        "and",
        "for",
        "with",
        "all",
        "data",
        "dataset",
        "table",
        "view",
        "me",
        "a",
        "an",
        "in",
        "of",
    }

    @classmethod
    def fuzzy_match_column(
        cls, token: str, column_names: list[str], cutoff: float = 0.6
    ) -> str | None:
        """Finds the best matching column name using exact, substring, or Levenshtein matching."""
        token_clean = token.lower().strip()
        if not token_clean or len(token_clean) < 2:
            return None

        # 1. Exact match (case-insensitive)
        for col in column_names:
            if token_clean == col.lower():
                return col

        # 2. Word token match
        for col in column_names:
            words = re.findall(r"\w+", col.lower())
            if token_clean in words:
                return col

        # 3. Substring match (e.g. "sal" -> "Monthly Salary (USD)", "dept" -> "Department")
        for col in column_names:
            col_l = col.lower()
            if token_clean in col_l or col_l in token_clean:
                return col

        # 4. Levenshtein ratio / similarity match (for typos e.g. "departmnt" -> "Department")
        matches = difflib.get_close_matches(
            token_clean, [c.lower() for c in column_names], n=1, cutoff=cutoff
        )
        if matches:
            matched_lower = matches[0]
            for col in column_names:
                if col.lower() == matched_lower:
                    return col

        return None

    @classmethod
    def parse_prompt(
        cls,
        prompt: str,
        schema: list[dict[str, Any]],
        col_profiles: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        prompt_clean = prompt.strip()
        prompt_lower = prompt_clean.lower()
        words = re.findall(r"\w+", prompt_lower)

        column_names = [col["name"] for col in schema]
        profiles_map = {c["name"]: c for c in (col_profiles or [])}

        # 1. Detect Aggregation Function
        agg_func = "sum"
        if any(w in prompt_lower for w in ["average", "avg", "mean"]):
            agg_func = "mean"
        elif any(
            w in prompt_lower
            for w in [
                "count",
                "total number",
                "how many",
                "number of",
                "frequency",
            ]
        ):
            agg_func = "count"
        elif any(
            w in prompt_lower for w in ["max", "maximum", "highest", "top", "peak"]
        ):
            agg_func = "max"
        elif any(
            w in prompt_lower for w in ["min", "minimum", "lowest", "bottom"]
        ):
            agg_func = "min"
        elif any(w in prompt_lower for w in ["median"]):
            agg_func = "median"

        # 2. Extract Explicit Target Tokens from Prompt
        target_dim: str | None = None
        target_metric: str | None = None
        ungrounded_tokens: list[str] = []

        # A. Look for "by [column]" or "across [column]" or "per [column]" pattern
        by_match = re.search(
            r"\b(?:by|across|per|grouped by)\s+([a-zA-Z0-9_\s]+)", prompt_lower
        )
        if by_match:
            by_phrase = by_match.group(1).strip()
            # Clean trailing chart type mentions if any (e.g. "by department as a bar chart")
            by_phrase = re.sub(
                r"\s+(?:as|in|using|with)?\s*(?:a\s+)?(?:bar|line|scatter|pie|area|heatmap|hist|box)?\s*(?:chart|plot)?.*$",
                "",
                by_phrase,
            ).strip()

            matched_col = cls.fuzzy_match_column(by_phrase, column_names)
            if matched_col:
                target_dim = matched_col
            else:
                # If specific words inside the by phrase were given
                phrase_words = [
                    w
                    for w in re.findall(r"\w+", by_phrase)
                    if w not in cls.STOP_WORDS
                ]
                found_word_match = False
                for pw in phrase_words:
                    m = cls.fuzzy_match_column(pw, column_names)
                    if m:
                        target_dim = m
                        found_word_match = True
                        break
                if not found_word_match and phrase_words:
                    ungrounded_tokens.extend(phrase_words)

        # B. Look for metric target in prompt
        metric_match = re.search(
            r"(?:show|plot|compare|average|avg|mean|sum|count of|trend of|proportion of|distribution of|total)\s+([a-zA-Z0-9_\s]+?)(?:\s+(?:by|across|per|vs|against)|$)",
            prompt_lower,
        )
        if metric_match:
            metric_phrase = metric_match.group(1).strip()
            matched_metric = cls.fuzzy_match_column(metric_phrase, column_names)
            if matched_metric:
                target_metric = matched_metric
            else:
                phrase_words = [
                    w
                    for w in re.findall(r"\w+", metric_phrase)
                    if w not in cls.STOP_WORDS
                ]
                found_word_match = False
                for pw in phrase_words:
                    m = cls.fuzzy_match_column(pw, column_names)
                    if m:
                        target_metric = m
                        found_word_match = True
                        break
                if not found_word_match and phrase_words:
                    ungrounded_tokens.extend(phrase_words)

        # C. Scan all other non-stop words in the prompt for column matches
        significant_words = [
            w for w in words if w not in cls.STOP_WORDS and len(w) > 2
        ]
        for w in significant_words:
            matched = cls.fuzzy_match_column(w, column_names)
            if matched:
                col_meta = profiles_map.get(matched, {})
                sem_type = col_meta.get("semantic_type", "")
                data_type = col_meta.get(
                    "data_type",
                    next(
                        (
                            c["data_type"]
                            for c in schema
                            if c["name"] == matched
                        ),
                        "",
                    ),
                )
                is_numeric = sem_type == "Numeric" or any(
                    t in data_type for t in ["Int", "Float", "Decimal", "Double"]
                )
                is_temporal = sem_type in ["Date", "Datetime", "Year"]

                if is_temporal and not target_dim:
                    target_dim = matched
                elif is_numeric and not target_metric:
                    target_metric = matched
                elif not is_numeric and not target_dim:
                    target_dim = matched

        # 3. STRICT GROUNDING VALIDATION
        # If the user explicitly asked for specific entities that could NOT be found anywhere in the dataset
        if not target_dim and not target_metric and ungrounded_tokens:
            unmatched_str = ", ".join(f"'{t}'" for t in set(ungrounded_tokens))
            avail_cols_str = ", ".join(column_names)
            raise ValueError(
                f"Could not find columns matching {unmatched_str} in this dataset. "
                f"Available columns: {avail_cols_str}."
            )

        # Fallback to defaults only if query is generic (e.g. "show overview", "show trend")
        if not target_dim:
            cat_cols = [
                c["name"]
                for c in (col_profiles or [])
                if c.get("semantic_type")
                in ["Category", "Date", "Year", "Location"]
            ]
            if cat_cols:
                target_dim = cat_cols[0]
            else:
                string_cols = [
                    c["name"]
                    for c in schema
                    if any(
                        t in c["data_type"]
                        for t in ["String", "Utf8", "Categorical"]
                    )
                ]
                target_dim = string_cols[0] if string_cols else column_names[0]

        if not target_metric:
            num_cols = [
                c["name"]
                for c in (col_profiles or [])
                if c.get("semantic_type") == "Numeric"
            ]
            if num_cols:
                target_metric = num_cols[0]
            else:
                num_cols_schema = [
                    c["name"]
                    for c in schema
                    if any(
                        t in c["data_type"]
                        for t in ["Int", "Float", "Decimal", "Double"]
                    )
                ]
                target_metric = (
                    num_cols_schema[0]
                    if num_cols_schema
                    else (
                        column_names[1]
                        if len(column_names) > 1
                        else column_names[0]
                    )
                )

        # If target metric is non-numeric, switch aggregation to count
        metric_meta = profiles_map.get(target_metric, {})
        if metric_meta.get("semantic_type") in [
            "Text",
            "Identifier",
            "List",
            "Category",
        ]:
            if agg_func in ["sum", "mean", "median", "min", "max"]:
                agg_func = "count"

        # 4. Detect Chart Type & Intent
        dim_meta = profiles_map.get(target_dim, {})
        is_dim_temporal = dim_meta.get("semantic_type") in [
            "Date",
            "Datetime",
            "Year",
        ]

        chart_type = "bar"
        intent = "compare_categories"

        if (
            any(
                w in prompt_lower
                for w in [
                    "line",
                    "trend",
                    "over time",
                    "chronological",
                    "growth",
                    "history",
                    "timeline",
                ]
            )
            or is_dim_temporal
        ):
            chart_type = "line"
            intent = "trend_analysis"
        elif any(
            w in prompt_lower
            for w in ["pie", "proportion", "share", "composition", "breakdown"]
        ):
            chart_type = "pie"
            intent = "composition"
        elif any(
            w in prompt_lower
            for w in ["scatter", "correlation", "relationship", "vs"]
        ):
            chart_type = "scatter"
            intent = "correlation"
        elif any(
            w in prompt_lower
            for w in ["distribution", "histogram", "binned", "frequency"]
        ):
            chart_type = "hist"
            intent = "distribution"
        elif any(
            w in prompt_lower for w in ["box", "boxplot", "spread", "outliers"]
        ):
            chart_type = "box"
            intent = "distribution"
        elif any(
            w in prompt_lower for w in ["heatmap", "matrix", "cross tab", "crosstab"]
        ):
            chart_type = "heatmap"
            intent = "cross_tabular"

        # 5. Formulate Natural Language Explanation
        if intent == "trend_analysis":
            explanation = f"Analyzing temporal distribution of '{target_metric}' across '{target_dim}' using a Line Chart."
        elif intent == "composition":
            explanation = f"Displaying proportional shares of '{target_dim}' using a Pie Chart."
        elif intent == "correlation":
            explanation = f"Evaluating correlation between continuous measures '{target_dim}' and '{target_metric}' using a Scatter Plot."
        else:
            explanation = f"Comparing {agg_func.upper()} of '{target_metric}' across '{target_dim}' categories using a Bar Chart."

        # 6. Formulate Query DTO & Plan
        alias_name = f"{agg_func}_{target_metric}"
        query_dto = {
            "group_by": [target_dim] if target_dim else [],
            "aggregations": [
                {
                    "column": target_metric,
                    "agg_func": agg_func,
                    "alias": alias_name,
                }
            ],
            "filters": [],
            "sort": [{"column": alias_name, "descending": True}],
            "limit": 100,
        }

        return {
            "intent": intent,
            "chart_type": chart_type,
            "dimension": target_dim,
            "metric": target_metric,
            "aggregation": agg_func,
            "grouping": [target_dim] if target_dim else [],
            "filters": [],
            "sorting": [{"column": alias_name, "descending": True}],
            "explanation": explanation,
            "confidence_score": 0.95,
            "prompt": prompt,
            "x_axis": target_dim,
            "y_axis": target_metric,
            "aggregations": [
                {
                    "column": target_metric,
                    "agg_func": agg_func,
                    "alias": alias_name,
                }
            ],
            "query": query_dto,
            "confidence": 0.95,
        }
