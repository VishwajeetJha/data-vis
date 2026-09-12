from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from db.repositories.dataset_repo import DatasetRepository
from engine.advisor.plan_validator import PlanValidator
from engine.advisor.recommendation_engine import RecommendationEngine
from engine.ai.insights_engine import InsightsEngine

router = APIRouter(prefix="/api/v1/advisor", tags=["Visualization Advisor"])


class ValidatePlanRequest(BaseModel):
    dataset_id: str
    chart_type: str
    dimension_col: str | None = None
    metric_col: str | None = None
    aggregation: str | None = None


@router.post("/validate")
async def validate_plan(request: ValidatePlanRequest):
    ds = await DatasetRepository.get_by_id(request.dataset_id)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found")

    stats = InsightsEngine.generate_statistical_profile(ds["file_path"])
    col_profiles = stats.get("columns", [])

    validation = PlanValidator.validate_plan(
        chart_type=request.chart_type,
        dimension_col=request.dimension_col,
        metric_col=request.metric_col,
        aggregation=request.aggregation,
        col_profiles=col_profiles,
    )
    return validation


@router.get("/recommendations/{dataset_id}")
async def get_recommendations(dataset_id: str):
    ds = await DatasetRepository.get_by_id(dataset_id)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found")

    stats = InsightsEngine.generate_statistical_profile(ds["file_path"])
    col_profiles = stats.get("columns", [])

    recs = RecommendationEngine.generate_recommendations(col_profiles)
    return {"dataset_id": dataset_id, "recommendations": recs}
