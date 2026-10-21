from typing import Optional
from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel
from app.db.mongo import get_db
from app.api.deps import get_current_student_id
from app.schemas.schemas import ScheduleTickResponse
from app.services.scheduler import run_scheduling_tick
from app.models.learning_context import ActivityType, LearningSignal, signal_from_payload

router = APIRouter(prefix="/api/v1/schedule", tags=["schedule"])


class PostSessionProvider:
    """
    Synthetic emotion provider used when the scheduler is triggered right after
    a study session (e.g. from /study/complete).  The student just finished a
    quiz so we know a session was active; we use good-but-realistic values so
    the readiness model produces MEDIUM/HIGH tier and allows reminders to be
    created even when the live focus-monitor service is offline.
    """
    def __init__(self, score_pct: float = 75.0, difficulty: str = "medium"):
        self.score_pct = score_pct
        self.difficulty = difficulty

    async def read(self, student_id: str) -> LearningSignal:
        # Map score → rough valence/arousal
        norm = max(0.0, min(1.0, self.score_pct / 100.0))
        valence = -0.1 + norm * 0.7          # 0% → -0.1, 100% → 0.6
        arousal = 0.35 + norm * 0.35         # 0% → 0.35, 100% → 0.70
        attention = 0.55 + norm * 0.25       # 0% → 0.55, 100% → 0.80
        return signal_from_payload(
            {
                "valence": valence,
                "arousal": arousal,
                "attention": attention,
                "activity_type": "QUIZ",
                "session_active": True,
                "content_in_focus": True,
                "blink_rate": 15.0,
                "fatigue": max(0.0, 0.5 - norm * 0.3),
                "head_tilt_degrees": 5.0,
                "confidence": 0.85,
            },
            source="post_session",
            default_activity=ActivityType.QUIZ,
            default_session_active=True,
            default_content_in_focus=True,
        )


class TickBody(BaseModel):
    post_session: bool = False      # True when called right after a quiz
    score_pct: float = 75.0        # quiz score percentage (0-100)
    difficulty: str = "medium"     # overall difficulty of the session


@router.post("/tick", response_model=ScheduleTickResponse)
async def trigger_tick(
    body: Optional[TickBody] = None,
    student_id: str = Depends(get_current_student_id),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Trigger a scheduling tick.

    When called from /study/complete pass:
      { "post_session": true, "score_pct": 80, "difficulty": "medium" }
    This injects a synthetic post-quiz signal so the readiness model allows
    reminders even when the live focus-monitor service is offline.
    """
    if body and body.post_session:
        provider = PostSessionProvider(
            score_pct=body.score_pct,
            difficulty=body.difficulty,
        )
    else:
        provider = None  # use the real configured emotion provider

    result = await run_scheduling_tick(
        student_id,
        db,
        provider=provider,
        post_session=bool(body and body.post_session),
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
