from datetime import datetime, timezone
from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.bandit import BanditContext, LinUCB, ReminderAction
from app.models.readiness_fusion import assess_learning_readiness
from app.models.sm2 import item_from_mongo, process_item
from app.services.bandit_service import load_student_bandit
from app.services.emotion_provider import create_emotion_provider


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
        return 24.0
    sent_at = latest[0]["sent_at"]
    if sent_at.tzinfo is None:
        sent_at = sent_at.replace(tzinfo=timezone.utc)
    return max(0.0, (now - sent_at).total_seconds() / 3600.0)


async def run_scheduling_tick(
    student_id: str,
    db: AsyncIOMotorDatabase,
    *,
    provider=None,
    now: datetime | None = None,
) -> dict[str, Any]:
    now = now or datetime.now(timezone.utc)
    provider = provider or create_emotion_provider()
    signal = await provider.read(student_id)
    assessment = assess_learning_readiness(signal)
    items = await db.review_items.find({"student_id": student_id}).to_list(None)
    policy: LinUCB = await load_student_bandit(db, student_id)
    acceptance_rate, dismissal_rate = await _feedback_rates(db, student_id)
    hours_since_reminder = await _time_since_reminder(db, student_id, now)

    reminders_created = 0
    selected_actions: list[str] = []
    for document in items:
        item = item_from_mongo(document)
        metrics = process_item(item, assessment.readiness_tier.value, now)
        context = BanditContext.from_time(
            readiness_score=assessment.readiness_score,
            retention_probability=metrics["retention_probability"],
            priority_score=metrics["priority_score"],
            time_since_reminder=hours_since_reminder,
            acceptance_rate=acceptance_rate,
            dismissal_rate=dismissal_rate,
            engagement_score=assessment.engagement_score,
            at=now,
        )
        selected = policy.select_action(context)
        action = selected if assessment.should_send_recommendation else ReminderAction.SKIP
        selected_actions.append(action)

        if action != ReminderAction.SEND:
            continue

        existing = await db.reminders.find_one(
            {"student_id": student_id, "item_key": document.get("item_key", item.item_id), "status": "SENT"}
        )
        if existing:
            continue

        await db.reminders.insert_one(
            {
                "student_id": student_id,
                "item_key": document.get("item_key", item.item_id),
                "item_title": document.get("title", document.get("topic", item.item_id)),
                "content_type": assessment.content_type,
                "readiness_tier": assessment.readiness_tier.value,
                "readiness_score": assessment.readiness_score,
                "retention_probability": metrics["retention_probability"],
                "bandit_action": action,
                "bandit_context": context.to_dict(),
                "activity_type": assessment.activity_type.value,
                "engagement_score": assessment.engagement_score,
                "decision_reason": assessment.decision_reason,
                "scheduled_at": now,
                "sent_at": now,
                "responded_at": None,
                "status": "SENT",
            }
        )
        reminders_created += 1

    return {
        "student_id": student_id,
        "reminders_created": reminders_created,
        "items_processed": len(items),
        "status": "ok",
        "decision": selected_actions[0] if selected_actions else ReminderAction.SKIP,
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
