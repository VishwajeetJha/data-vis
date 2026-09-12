from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from api.routers.datasets import get_dataset_transforms
from db.repositories.dataset_repo import DatasetRepository
from engine.ingest.parser_factory import ParserFactory
from engine.query.query_compiler import QueryCompiler
from engine.query.transform_engine import TransformEngine

router = APIRouter(prefix="/api/v1/query", tags=["Query"])


class FilterConditionDTO(BaseModel):
    column: str
    operator: str
    value: Any | None = None


class AggregationDTO(BaseModel):
    column: str
    agg_func: str
    alias: str | None = None


class SortDTO(BaseModel):
    column: str
    descending: bool = False


class QueryRequest(BaseModel):
    dataset_id: str
    search_term: str | None = None
    select_columns: list[str] | None = None
    filters: list[FilterConditionDTO] = []
    group_by: list[str] = []
    aggregations: list[AggregationDTO] = []
    sort: list[SortDTO] = []
    limit: int | None = 10000
    offset: int | None = 0


class QueryResponse(BaseModel):
    dataset_id: str
    execution_time_ms: float
    total_matching_rows: int
    columns: list[str]
    column_types: list[str]
    data: list[dict[str, Any]]


@router.post("", response_model=QueryResponse)
async def execute_query(req: QueryRequest):
    dataset = await DatasetRepository.get_by_id(req.dataset_id)
    if not dataset:
        raise HTTPException(
            status_code=404,
            detail={
                "error": {
                    "code": "DATASET_NOT_FOUND",
                    "message": f"Dataset not registered with ID: {req.dataset_id}",
                }
            },
        )

    file_path = dataset["file_path"]

    try:
        _, lazy_df = ParserFactory.parse_file(file_path)
        # Apply application-side transformations (calculated columns, cleanings, overrides)
        transforms = get_dataset_transforms(req.dataset_id)
        if transforms:
            lazy_df = TransformEngine.apply_transforms(lazy_df, transforms)

        rows, meta = QueryCompiler.execute_query(lazy_df, req.model_dump())

        return QueryResponse(
            dataset_id=req.dataset_id,
            execution_time_ms=meta["execution_time_ms"],
            total_matching_rows=meta["total_matching_rows"],
            columns=meta["columns"],
            column_types=meta["column_types"],
            data=rows,
        )
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "QUERY_COMPILATION_ERROR",
                    "message": f"Query execution failed: {str(e)}",
                }
            },
        )
