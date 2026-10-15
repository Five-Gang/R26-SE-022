from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.bandit import (
    BanditContext,
    BanditValidationError,
    LinUCB,
    ReminderAction,
)
from app.models.adaptive_scheduler import AdaptiveScheduler
from app.models.readiness_fusion import assess_learning_readiness
from app.models.sm2 import item_from_mongo, process_item
from app.services.bandit_service import load_student_bandit
from app.services.content_personalization_service import ContentPersonalizationService
from app.services.emotion_provider import create_emotion_provider

_rule_scheduler = AdaptiveScheduler()
_content_service = ContentPersonalizationService()


async def _feedback_rates(db: AsyncIOMotorDatabase, student_id: str) -> tuple[float, float]:
    total = await db.reminders.count_documents(
        {"student_id": student_id, "status": {"$in": ["ACCEPTED", "SNOOZED", "DISMISSED"]}}
    )
    if not total:
        return 0.0, 0.0
    accepted = await db.reminders.count_documents(
        {"student_id": student_id, "status": "ACCEPTED"}
    )
    dismissed = await db.reminders.count_documents(
        {"student_id": student_id, "status": "DISMISSED"}
    )
    return accepted / total, dismissed / total


async def _time_since_reminder(db: AsyncIOMotorDatabase, student_id: str, now: datetime) -> float:
    latest = (
        await db.reminders.find({"student_id": student_id, "sent_at": {"$ne": None}})
        .sort("sent_at", -1)
        .limit(1)
        .to_list(1)
    )
    if not latest:
        return 1.0
    sent_at = latest[0]["sent_at"]
    if sent_at.tzinfo is None:
        sent_at = sent_at.replace(tzinfo=timezone.utc)
    hours = max(0.0, (now - sent_at).total_seconds() / 3600.0)
    return min(hours / 24.0, 1.0)


async def _deliver_due_delays(
    db: AsyncIOMotorDatabase, student_id: str, now: datetime
) -> int:
    result = await db.reminders.update_many(
        {
            "student_id": student_id,
            "status": "SCHEDULED",
            "scheduled_at": {"$lte": now},
        },
        {"$set": {"status": "SENT", "sent_at": now}},
    )
    return result.modified_count


async def run_scheduling_tick(
    student_id: str,
    db: AsyncIOMotorDatabase,
    *,
    provider=None,
    now: Optional[datetime] = None,
) -> dict[str, Any]:
    now = now or datetime.now(timezone.utc)
    provider = provider or create_emotion_provider()
    signal = await provider.read(student_id)
    assessment = assess_learning_readiness(signal)
    delivered_delays = await _deliver_due_delays(db, student_id, now)
    items = await db.review_items.find({"student_id": student_id}).to_list(None)
    try:
        policy: LinUCB = await load_student_bandit(db, student_id)
        bandit_unavailable = False
    except (BanditValidationError, ValueError, KeyError, TypeError):
        policy = LinUCB()
        bandit_unavailable = True
    acceptance_rate, dismissal_rate = await _feedback_rates(db, student_id)
    time_since_reminder = await _time_since_reminder(db, student_id, now)
    has_feedback = await db.reminders.count_documents(
        {"student_id": student_id, "status": {"$in": ["ACCEPTED", "SNOOZED", "DISMISSED"]}}
    ) > 0

    reminders_created = 0
    selected_actions: list[str] = []
    selected_scores: list[dict[str, float]] = []
    for document in items:
        item = item_from_mongo(document)
        metrics = process_item(item, assessment.readiness_tier.value, now)
        context = BanditContext.from_time(
            readiness_score=assessment.readiness_score,
            retention_probability=metrics["retention_probability"],
            priority_score=metrics["priority_score"],
            time_since_reminder=time_since_reminder,
            acceptance_rate=acceptance_rate,
            dismissal_rate=dismissal_rate,
            engagement_score=assessment.engagement_score,
            at=now,
        )
        content = _content_service.recommend_activity(
            readiness_level=assessment.readiness_tier.value,
            retention_probability=metrics["retention_probability"],
            priority_percentage=metrics["priority_score"] * 100,
            difficulty_level=document.get("difficulty_level", document.get("difficulty", "medium")),
        )
        if not has_feedback:
            permitted = (
                (ReminderAction.SEND, ReminderAction.DELAY)
                if (
                    assessment.readiness_tier.value == "HIGH"
                    and metrics["retention_probability"] < 0.6
                    and metrics["priority_score"] >= 0.5
                )
                else (ReminderAction.DELAY, ReminderAction.SKIP)
            )
        else:
            permitted = ReminderAction.ALL
        policy_source = "rule_based_fallback" if bandit_unavailable else "linucb"
        try:
            if bandit_unavailable:
                raise BanditValidationError("LinUCB policy unavailable")
            scores = policy.score_actions(context, permitted)
            selected = policy.select_action(context, permitted)
        except (BanditValidationError, ValueError, KeyError, TypeError):
            policy_source = "rule_based_fallback"
            scores = {}
            selected = _rule_scheduler.decide_reminder_action(
                readiness_level=assessment.readiness_tier.value,
                retention_probability=metrics["retention_probability"],
                priority_score=metrics["priority_score"],
            )
        action = selected if assessment.should_send_recommendation else ReminderAction.SKIP
        selected_actions.append(action)
        selected_scores.append(scores)

        decision_record = {
            "student_id": student_id,
            "item_key": document.get("item_key", item.item_id),
            "action": action,
            "policy_source": policy_source,
            "allowed_actions": list(permitted),
            "scores": scores,
            "context": context.to_dict(),
            "readiness_tier": assessment.readiness_tier.value,
            "created_at": now,
        }
        await db.scheduler_decisions.insert_one(decision_record)

        if action == ReminderAction.SKIP:
            continue

        existing = await db.reminders.find_one(
            {
                "student_id": student_id,
                "item_key": document.get("item_key", item.item_id),
                "status": {"$in": ["SENT", "SCHEDULED"]},
            }
        )
        if existing:
            continue

        scheduled_at = now if action == ReminderAction.SEND else now + timedelta(hours=1)
        await db.reminders.insert_one(
            {
                "student_id": student_id,
                "item_key": document.get("item_key", item.item_id),
                "item_title": document.get("title", document.get("topic", item.item_id)),
                "content_type": assessment.content_type,
                "recommended_activity": content["activity"],
                "content_reason": content["reason"],
                "readiness_tier": assessment.readiness_tier.value,
                "readiness_score": assessment.readiness_score,
                "retention_probability": metrics["retention_probability"],
                "bandit_action": action,
                "bandit_scores": scores,
                "bandit_allowed_actions": list(permitted),
                "bandit_context": context.to_dict(),
                "activity_type": assessment.activity_type.value,
                "engagement_score": assessment.engagement_score,
                "decision_reason": assessment.decision_reason,
                "scheduled_at": scheduled_at,
                "sent_at": now if action == ReminderAction.SEND else None,
                "responded_at": None,
                "status": "SENT" if action == ReminderAction.SEND else "SCHEDULED",
            }
        )
        reminders_created += 1

    return {
        "student_id": student_id,
        "reminders_created": reminders_created + delivered_delays,
        "items_processed": len(items),
        "status": "ok",
        "decision": selected_actions[0] if selected_actions else ReminderAction.SKIP,
        "decision_scores": selected_scores[0] if selected_scores else {},
        "decision_reason": assessment.decision_reason,
        "activity_type": assessment.activity_type.value,
        "session_active": assessment.session_active,
        "engagement_score": assessment.engagement_score,
        "readiness_score": assessment.readiness_score,
        "readiness_tier": assessment.readiness_tier.value,
        "content_type": assessment.content_type,
    }


async def preview_scheduling_state(student_id: str, db: AsyncIOMotorDatabase) -> dict[str, Any]:
    return await run_scheduling_tick(student_id, db)


async def run_scheduling_tick_for_all_students(
    db: AsyncIOMotorDatabase,
) -> list[dict[str, Any]]:
    students = await db.students.find({}, {"_id": 1}).to_list(None)
    results = []
    for student in students:
        results.append(await run_scheduling_tick(str(student["_id"]), db))
    return results
