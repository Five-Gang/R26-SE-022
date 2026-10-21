from fastapi import APIRouter
from typing import Optional
from pydantic import BaseModel
from app.models.adaptive_scheduler import AdaptiveScheduler

router = APIRouter(prefix="/api/v1/scheduler", tags=["scheduler"])

# Initialize scheduler with default thresholds
scheduler = AdaptiveScheduler()


class SchedulerRequest(BaseModel):
    readiness_level: str = "MEDIUM"
    retention_probability: float = 0.5
    priority_score: float = 0.5


@router.post("/decide")
async def decide_reminder_action(req: SchedulerRequest):
    """
    Decide whether to SEND_NOW, DELAY, or SKIP a reminder.
    
    This is the adaptive scheduler (Model 3) that combines:
    - Readiness level from emotion/readiness model
    - Retention probability from SM-2 memory model
    - Priority score from SM-2 priority calculation
    
    Returns the recommended action and reasoning.
    """
    result = scheduler.get_explanation(
        readiness_level=req.readiness_level,
        retention_probability=req.retention_probability,
        priority_score=req.priority_score,
    )
    return result
