import re
from typing import Any
import polars as pl


class SemanticClassifier:
    """Classifies physical columns into rich semantic analytical types based on

    data types, column name heuristics, cardinality, delimiters, and uniqueness ratios.
    """

    @classmethod
    def classify_column(
        cls,
        col_name: str,
        dtype_str: str,
        series: pl.Series | None = None,
        total_rows: int = 0,
        distinct_count: int = 0,
    ) -> dict[str, Any]:
        dtype_lower = dtype_str.lower()
        clean_name = col_name.strip().lower()

        uniqueness_ratio = (distinct_count / total_rows) if total_rows > 0 else 0.0

        # Sample string analysis
        avg_len = 0
        has_spaces = False
        comma_separated_count = 0
        sample_size = 0

        if series is not None and len(series) > 0:
            try:
                sample_s = series.drop_nulls().head(50)
                sample_size = len(sample_s)
                if sample_size > 0:
                    avg_len = sum(len(str(x)) for x in sample_s) / sample_size
                    has_spaces = any(" " in str(x).strip() for x in sample_s)
                    comma_separated_count = sum(1 for x in sample_s if "," in str(x))
            except Exception:
                avg_len = 0
                has_spaces = False
                comma_separated_count = 0

        # 1. BOOLEAN
        if "bool" in dtype_lower:
            return {
                "semantic_type": "Boolean",
                "cardinality": distinct_count,
                "uniqueness_ratio": round(uniqueness_ratio, 4),
                "is_suitable_for_grouping": True,
                "is_suitable_for_metric": False,
            }

        # 2. DATE & TEMPORAL
        # Physical Date/Datetime
        if any(t in dtype_lower for t in ["datetime"]):
            return {
                "semantic_type": "Datetime",
                "cardinality": distinct_count,
                "uniqueness_ratio": round(uniqueness_ratio, 4),
                "is_suitable_for_grouping": True,
                "is_suitable_for_metric": False,
            }

        if any(t in dtype_lower for t in ["date"]):
            return {
                "semantic_type": "Date",
                "cardinality": distinct_count,
                "uniqueness_ratio": round(uniqueness_ratio, 4),
                "is_suitable_for_grouping": True,
                "is_suitable_for_metric": False,
            }

        # String Date Detection (e.g. "September 9, 2019", "1/1/2020", "2020-05-12", date_added)
        date_name_match = re.search(r"(date_added|added_date|date$|^date|created_at|updated_at|timestamp|dob|release_date|order_date|ship_date)", clean_name)
        if date_name_match:
            return {
                "semantic_type": "Date",
                "cardinality": distinct_count,
                "uniqueness_ratio": round(uniqueness_ratio, 4),
                "is_suitable_for_grouping": True,
                "is_suitable_for_metric": False,
            }

        # Integer/Float Year
        if re.search(r"(year|release_year|birth_year|yr$)", clean_name):
            if any(t in dtype_lower for t in ["int", "float"]):
                return {
                    "semantic_type": "Year",
                    "cardinality": distinct_count,
                    "uniqueness_ratio": round(uniqueness_ratio, 4),
                    "is_suitable_for_grouping": True,
                    "is_suitable_for_metric": False,
                }

        # 3. LIST / MULTI-VALUE (Comma-separated entities like director, cast, genres, tags)
        is_list_name = re.search(r"(director|cast|genres|listed_in|tags|keywords|actors|crew|categories|authors)", clean_name)
        if (is_list_name and comma_separated_count > 0) or (sample_size > 5 and comma_separated_count / sample_size > 0.3):
            return {
                "semantic_type": "List",
                "cardinality": distinct_count,
                "uniqueness_ratio": round(uniqueness_ratio, 4),
                "is_suitable_for_grouping": False,  # Needs unnesting / splitting first
                "is_suitable_for_metric": False,
                "warning": "Multi-value list column. Use 'Split & Unnest' in Clean Data to analyze individual entities.",
            }

        # 4. TITLES, NAMES & FREE TEXT
        is_title_or_name = re.search(r"(title|name|movie|film|song|track|author|actor|director|artist|headline|description|comment|text|notes|review|bio|summary|abstract)", clean_name)
        if is_title_or_name or avg_len > 35 or (has_spaces and distinct_count > 50):
            if distinct_count <= 25 and not is_title_or_name:
                return {
                    "semantic_type": "Category",
                    "cardinality": distinct_count,
                    "uniqueness_ratio": round(uniqueness_ratio, 4),
                    "is_suitable_for_grouping": True,
                    "is_suitable_for_metric": False,
                }
            return {
                "semantic_type": "Text",
                "cardinality": distinct_count,
                "uniqueness_ratio": round(uniqueness_ratio, 4),
                "is_suitable_for_grouping": False,
                "is_suitable_for_metric": False,
                "warning": "Natural language title or unstructured text. Not recommended for numeric aggregation.",
            }

        # 5. IDENTIFIERS (Alphanumeric keys, IDs without spaces)
        id_pattern = re.search(r"(_id$|^id$|uuid|guid|ssn|employee_id|show_id|customer_id|user_id|order_id|code|sku|key$)", clean_name)
        if id_pattern and (uniqueness_ratio > 0.3 or distinct_count > 100):
            return {
                "semantic_type": "Identifier",
                "cardinality": distinct_count,
                "uniqueness_ratio": round(uniqueness_ratio, 4),
                "is_suitable_for_grouping": False,
                "is_suitable_for_metric": False,
                "warning": "High cardinality alphanumeric identifier. Not recommended for chart axes.",
            }

        if uniqueness_ratio >= 0.95 and total_rows > 20 and not has_spaces and not any(t in dtype_lower for t in ["float"]):
            return {
                "semantic_type": "Identifier",
                "cardinality": distinct_count,
                "uniqueness_ratio": round(uniqueness_ratio, 4),
                "is_suitable_for_grouping": False,
                "is_suitable_for_metric": False,
                "warning": "Unique single-token identifier code.",
            }

        # 6. LOCATION (Country, State, City, Zip, Lat/Lon)
        loc_pattern = re.search(r"(country|nation|state|province|city|region|county|zip|postal|latitude|longitude|lat$|lon$|lng$)", clean_name)
        if loc_pattern:
            return {
                "semantic_type": "Location",
                "cardinality": distinct_count,
                "uniqueness_ratio": round(uniqueness_ratio, 4),
                "is_suitable_for_grouping": distinct_count <= 50,
                "is_suitable_for_metric": False,
            }

        # 7. NUMERIC (Measures, Continuous, Aggregatable)
        if any(t in dtype_lower for t in ["int", "float", "decimal", "numeric"]):
            return {
                "semantic_type": "Numeric",
                "cardinality": distinct_count,
                "uniqueness_ratio": round(uniqueness_ratio, 4),
                "is_suitable_for_grouping": distinct_count <= 25,
                "is_suitable_for_metric": True,
            }

        # 8. CATEGORY (for Discrete Strings / Enums)
        return {
            "semantic_type": "Category",
            "cardinality": distinct_count,
            "uniqueness_ratio": round(uniqueness_ratio, 4),
            "is_suitable_for_grouping": distinct_count <= 100,
            "is_suitable_for_metric": False,
        }
