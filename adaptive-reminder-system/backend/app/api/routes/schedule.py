from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.db.mongo import get_db
from app.api.deps import get_current_student_id
from app.schemas.schemas import ScheduleTickResponse
# from app.services.scheduler import run_scheduling_tick  # TODO: rebuild Model 3 (RL Scheduler)

router = APIRouter(prefix="/api/v1/schedule", tags=["schedule"])

@router.post("/tick", response_model=ScheduleTickResponse)
async def trigger_tick(
    student_id: str = Depends(get_current_student_id),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Manually trigger a scheduling tick (for dev/testing)."""
    # TODO: Rebuild Model 3 scheduler
    result = {"reminders_created": 0, "items_processed": 0, "status": "scheduler_not_yet_implemented"}

    return ScheduleTickResponse(
        student_id=student_id,
        reminders_created=result["reminders_created"],
        items_processed=result["items_processed"],
        status=result["status"],
        decision=result.get("decision"),
        decision_reason=result.get("decision_reason"),
        activity_type=result.get("activity_type"),
        session_active=result.get("session_active"),
        engagement_score=result.get("engagement_score"),
        readiness_score=result.get("readiness_score"),
        readiness_tier=result.get("readiness_tier"),
        content_type=result.get("content_type"),
    )
