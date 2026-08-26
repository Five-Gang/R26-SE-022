from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.db.mongo import get_db
from app.api.deps import get_current_student_id
from app.schemas.schemas import ScheduleTickResponse
from app.schemas.schemas import ScheduleTickRequest
from app.services.scheduling import schedule_for_student

router = APIRouter(prefix="/api/v1/schedule", tags=["schedule"])

@router.post("/tick", response_model=ScheduleTickResponse)
async def trigger_tick(
    request: ScheduleTickRequest | None = None,
    student_id: str = Depends(get_current_student_id),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Process review items and persist reminders that should be sent now."""
    request = request or ScheduleTickRequest()
    result = await schedule_for_student(
        db, student_id, request.emotion, request.time_of_day, request.topic_id
    )

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
