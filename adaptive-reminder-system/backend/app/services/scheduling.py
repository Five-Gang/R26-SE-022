from datetime import datetime, timezone

from app.models.sm2 import item_from_mongo
from app.services.reminder_pipeline import run_reminder_pipeline


async def schedule_for_student(db, student_id: str, emotion: str | None = None, time_of_day: str | None = None, topic_id: str | None = None) -> dict:
    if not emotion:
        return {
            "reminders_created": 0,
            "items_processed": 0,
            "status": "waiting_for_live_emotion",
            "decision": None,
            "decision_reason": "A live emotion result from Mihiraj is required.",
            "activity_type": None,
            "readiness_score": None,
            "readiness_tier": None,
            "content_type": None,
        }

    query = {"student_id": student_id}
    if topic_id:
        query["item_key"] = topic_id
    items = await db.review_items.find(query).to_list(None)
    now = datetime.now(timezone.utc)
    reminders_created = 0
    first_result = None

    for item_doc in items:
        result = run_reminder_pipeline(item_from_mongo(item_doc), emotion, time_of_day, now=now)
        first_result = first_result or result
        if result["action"] != "SEND_NOW":
            continue
        existing = await db.reminders.find_one({
            "student_id": student_id,
            "item_key": item_doc["item_key"],
            "status": "SENT",
        })
        if existing:
            continue
        await db.reminders.insert_one({
            "student_id": student_id,
            "item_key": item_doc["item_key"],
            "item_title": item_doc.get("title", item_doc["item_key"]),
            "content_type": result["activity"],
            "readiness_tier": result["readiness_level"],
            "readiness_score": {"HIGH": 1.0, "MEDIUM": 0.5, "LOW": 0.0}.get(result["readiness_level"], 0.5),
            "retention_probability": result["retention_probability"],
            "priority_score": result["priority_score"],
            "emotion": emotion,
            "bandit_action": result["action"],
            "activity_type": result["activity"],
            "decision_reason": result["activity_reason"],
            "status": "SENT",
            "scheduled_at": now,
            "sent_at": now,
        })
        reminders_created += 1

    return {
        "reminders_created": reminders_created,
        "items_processed": len(items),
        "status": "completed",
        "decision": first_result["action"] if first_result else None,
        "decision_reason": first_result["activity_reason"] if first_result else None,
        "activity_type": first_result["activity"] if first_result else None,
        "readiness_score": {"HIGH": 1.0, "MEDIUM": 0.5, "LOW": 0.0}.get(first_result["readiness_level"], 0.5) if first_result else None,
        "readiness_tier": first_result["readiness_level"] if first_result else None,
        "content_type": first_result["activity"] if first_result else None,
    }


async def schedule_for_all_students(db, emotion: str | None = None) -> None:
    async for student in db.students.find({}, {"_id": 1}):
        await schedule_for_student(db, str(student["_id"]))