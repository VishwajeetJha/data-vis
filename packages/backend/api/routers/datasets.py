import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from db.repositories.dataset_repo import DatasetRepository
from engine.ai.insights_engine import InsightsEngine
from engine.ingest.parser_factory import ParserFactory
from engine.query.transform_engine import TransformEngine

router = APIRouter(prefix="/api/v1/datasets", tags=["Datasets"])

# Active in-memory transformation registry (dataset_id -> list of transform dicts)
DATASET_TRANSFORMS: dict[str, list[dict[str, Any]]] = {}


def get_dataset_transforms(dataset_id: str) -> list[dict[str, Any]]:
    return DATASET_TRANSFORMS.get(dataset_id, [])


class ColumnUpdateDTO(BaseModel):
    original_name: str
    custom_alias: str
    data_type: str | None = None


class UpdateColumnsRequest(BaseModel):
    columns: list[ColumnUpdateDTO]


class ApplyTransformRequest(BaseModel):
    action: str  # "calculated_column", "impute_nulls", "string_case", "numeric_precision", "clamp_outliers"
    name: str | None = None  # for calculated_column
    formula: str | None = None  # e.g. "Salary * 12"
    column: str | None = None  # target column
    strategy: str | None = None  # "mean", "median", "constant", "zero", "empty_unknown"
    mode: str | None = None  # "trim", "uppercase", "lowercase", "titlecase", "remove_special_chars"
    precision: int | None = 2  # for numeric_precision
    value: Any | None = None


@router.get("/{dataset_id}/stats")
async def get_dataset_stats(dataset_id: str):
    dataset = await DatasetRepository.get_by_id(dataset_id)
    if not dataset:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "DATASET_NOT_FOUND", "message": "Dataset not found"}},
        )

    try:
        profile = InsightsEngine.generate_statistical_profile(dataset["file_path"])
        return {
            "dataset_id": dataset_id,
            "file_name": dataset["file_name"],
            "profile": profile,
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "error": {
                    "code": "STATS_GENERATION_FAILED",
                    "message": f"Failed to generate stats: {str(e)}",
                }
            },
        )


@router.put("/{dataset_id}/columns")
async def update_column_metadata(dataset_id: str, req: UpdateColumnsRequest):
    dataset = await DatasetRepository.get_by_id(dataset_id)
    if not dataset:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "DATASET_NOT_FOUND", "message": "Dataset not found"}},
        )

    col_updates = [c.model_dump() for c in req.columns]
    success = await DatasetRepository.update_column_aliases(dataset_id, col_updates)
    if not success:
        raise HTTPException(
            status_code=500,
            detail={
                "error": {
                    "code": "COLUMN_UPDATE_FAILED",
                    "message": "Failed to update column metadata",
                }
            },
        )

    return {"status": "success", "dataset_id": dataset_id, "updated_columns": len(col_updates)}


@router.post("/{dataset_id}/transforms")
async def add_transform(dataset_id: str, req: ApplyTransformRequest):
    dataset = await DatasetRepository.get_by_id(dataset_id)
    if not dataset:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "DATASET_NOT_FOUND", "message": "Dataset not found"}},
        )

    transform_id = str(uuid.uuid4())
    transform_item = {
        "id": transform_id,
        "action": req.action,
        "name": req.name,
        "formula": req.formula,
        "column": req.column,
        "strategy": req.strategy,
        "mode": req.mode,
        "precision": req.precision,
        "value": req.value,
    }

    if dataset_id not in DATASET_TRANSFORMS:
        DATASET_TRANSFORMS[dataset_id] = []
    DATASET_TRANSFORMS[dataset_id].append(transform_item)

    # Compute updated column list
    _, lazy_df = ParserFactory.parse_file(dataset["file_path"])
    lazy_df = TransformEngine.apply_transforms(lazy_df, DATASET_TRANSFORMS[dataset_id])
    schema = lazy_df.collect_schema()
    columns = [{"name": name, "data_type": str(dtype)} for name, dtype in schema.items()]

    return {
        "status": "success",
        "transform": transform_item,
        "columns": columns,
        "active_transforms": DATASET_TRANSFORMS[dataset_id],
    }


@router.get("/{dataset_id}/transforms")
async def list_transforms(dataset_id: str):
    return {"transforms": DATASET_TRANSFORMS.get(dataset_id, [])}


@router.delete("/{dataset_id}/transforms/{transform_id}")
async def delete_transform(dataset_id: str, transform_id: str):
    if dataset_id in DATASET_TRANSFORMS:
        DATASET_TRANSFORMS[dataset_id] = [
            t for t in DATASET_TRANSFORMS[dataset_id] if t["id"] != transform_id
        ]
    return {"status": "success", "remaining": DATASET_TRANSFORMS.get(dataset_id, [])}
