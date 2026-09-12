from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from db.repositories.dataset_repo import DatasetRepository
from engine.advisor.plan_validator import PlanValidator
from engine.ai.insights_engine import InsightsEngine
from engine.ai.nlq_compiler import NLQCompiler
from engine.ingest.parser_factory import ParserFactory

router = APIRouter(prefix="/api/v1/ai", tags=["AI & NLQ"])


class NLQRequest(BaseModel):
    dataset_id: str
    prompt: str


class NLQResponse(BaseModel):
    prompt: str
    chart_type: str
    x_axis: str
    y_axis: str
    query: dict[str, Any]
    confidence: float
    intent: str | None = None
    dimension: str | None = None
    metric: str | None = None
    aggregation: str | None = None
    explanation: str | None = None
    validation: dict[str, Any] | None = None


@router.post("/nlq", response_model=NLQResponse)
async def compile_nlq_prompt(req: NLQRequest):
    dataset = await DatasetRepository.get_by_id(req.dataset_id)
    if not dataset:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "DATASET_NOT_FOUND", "message": "Dataset not found"}},
        )

    try:
        stats = InsightsEngine.generate_statistical_profile(dataset["file_path"])
        col_profiles = stats.get("columns", [])

        result = NLQCompiler.parse_prompt(req.prompt, dataset["schema"], col_profiles)

        # Pre-execution validation of generated plan
        validation = PlanValidator.validate_plan(
            chart_type=result["chart_type"],
            dimension_col=result["dimension"],
            metric_col=result["metric"],
            aggregation=result["aggregation"],
            col_profiles=col_profiles,
        )
        result["validation"] = validation

        return NLQResponse(**result)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "NLQ_PARSING_FAILED", "message": str(e)}},
        )


@router.get("/insights/{dataset_id}")
async def get_dataset_insights(dataset_id: str):
    dataset = await DatasetRepository.get_by_id(dataset_id)
    if not dataset:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "DATASET_NOT_FOUND", "message": "Dataset not found"}},
        )

    try:
        _, lazy_df = ParserFactory.parse_file(dataset["file_path"])
        insights = InsightsEngine.generate_insights(lazy_df)
        return {"dataset_id": dataset_id, "insights": insights}
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "INSIGHTS_FAILED", "message": str(e)}},
        )
