from fastapi import APIRouter
from pydantic import BaseModel
from app.services.content_personalization_service import ContentPersonalizationService

router = APIRouter(prefix="/api/v1/content", tags=["content"])

service = ContentPersonalizationService()


class ContentRequest(BaseModel):
    readiness_level: str = "MEDIUM"
    retention_probability: float = 0.5
    priority_score: float = 0.5
    difficulty_level: str = "medium"


@router.post("/recommend")
async def recommend_content_activity(req: ContentRequest):
    """Recommend the best study activity type for the current state."""
    priority_percentage = req.priority_score * 100

    result = service.recommend_activity(
        readiness_level=req.readiness_level,
        retention_probability=req.retention_probability,
        priority_percentage=priority_percentage,
        difficulty_level=req.difficulty_level,
    )

    return {
        "readiness_level": req.readiness_level,
        "retention_probability": req.retention_probability,
        "priority_score": req.priority_score,
        "priority_percentage": priority_percentage,
        "difficulty_level": req.difficulty_level,
        **result,
    }
