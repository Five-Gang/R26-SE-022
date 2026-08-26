from datetime import datetime, timezone

from app.models.adaptive_scheduler import AdaptiveScheduler
from app.models.sm2 import (
    StudyItem,
    calculate_priority_score,
    process_item,
)
from app.services.content_personalization_service import ContentPersonalizationService
from app.services.predict_readiness import predict_readiness


_scheduler = AdaptiveScheduler()
_content_service = ContentPersonalizationService()


def run_reminder_pipeline(
    item: StudyItem,
    emotion: str,
    time_of_day: str | None = None,
    difficulty_level: str = "medium",
    now: datetime | None = None,
) -> dict:
    """Run readiness, memory, scheduling, and activity recommendation together."""
    now = now or datetime.now(timezone.utc)
    readiness_level = predict_readiness(emotion, time_of_day)
    metrics = process_item(item, readiness_level, now)
    priority_score = min(metrics["priority_score"], 1.2)
    decision = _scheduler.get_explanation(
        readiness_level=readiness_level,
        retention_probability=metrics["retention_probability"],
        priority_score=priority_score,
    )
    activity = _content_service.recommend_activity(
        readiness_level=readiness_level,
        retention_probability=metrics["retention_probability"],
        priority_percentage=priority_score * 100,
        difficulty_level=difficulty_level,
    )

    return {
        "emotion": emotion,
        "time_of_day": time_of_day,
        "readiness_level": readiness_level,
        "retention_probability": metrics["retention_probability"],
        "priority_score": priority_score,
        "action": decision["action"],
        "reasons": decision["reasons"],
        "activity": activity["activity"],
        "activity_reason": activity["reason"],
        "metrics": metrics,
    }