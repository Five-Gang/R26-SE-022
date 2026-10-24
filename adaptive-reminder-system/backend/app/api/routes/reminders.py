from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.db.mongo import get_db
from app.api.deps import get_current_student_id
from app.schemas.schemas import ReminderFeedback, ReminderQueueResponse, ReminderResponse
from app.models.sm2 import item_from_mongo, item_to_mongo_update, update_sm2 as update
from app.models.bandit import BanditContext, BanditValidationError, ReminderAction
from app.services.bandit_service import (
    feedback_reward,
    load_student_bandit,
    save_student_bandit,
)
from datetime import datetime, timezone

router = APIRouter(prefix="/api/v1/reminders", tags=["reminders"])


def _scheduled_at(reminder: dict) -> datetime:
    value = reminder.get("scheduled_at") or reminder.get("created_at")
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return datetime.now(timezone.utc)
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc)

@router.get("", response_model=ReminderQueueResponse)
async def get_reminders(
    student_id: str = Depends(get_current_student_id),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Get all SENT reminders for the student."""
    reminders = await db.reminders.find({
        "student_id": student_id,
        "status": {"$in": ["SENT", "SCHEDULED"]}
    }).sort("scheduled_at", 1).to_list(None)

    item_keys = [reminder.get("item_key") for reminder in reminders if reminder.get("item_key")]
    review_items = await db.review_items.find(
        {"student_id": student_id, "item_key": {"$in": item_keys}}
    ).to_list(None) if item_keys else []
    items_by_key = {item.get("item_key"): item for item in review_items}

    def linked_value(reminder, item, key, *fallback_keys):
        value = reminder.get(key)
        if value is not None:
            return value
        for fallback_key in fallback_keys:
            value = item.get(fallback_key)
            if value is not None:
                return value
        return None

    return ReminderQueueResponse(
        reminders=[
            ReminderResponse(
                reminder_id=str(r.get("_id", r.get("item_key", ""))),
                item_key=r.get("item_key", ""),
                item_title=r.get("item_title") or r.get("title") or r.get("item_key", "Study item"),
                content_type=r.get("content_type", "GUIDED_REVIEW"),
                module_id=(
                    str(linked_value(r, items_by_key.get(r["item_key"], {}), "module_id", "moduleId"))
                    if linked_value(r, items_by_key.get(r["item_key"], {}), "module_id", "moduleId")
                    else None
                ),
                week_number=linked_value(r, items_by_key.get(r["item_key"], {}), "week_number", "weekNumber"),
                topic=linked_value(r, items_by_key.get(r["item_key"], {}), "topic", "subject"),
                difficulty_level=linked_value(
                    r,
                    items_by_key.get(r["item_key"], {}),
                    "difficulty_level",
                    "difficulty",
                ),
                readiness_tier=r.get("readiness_tier", "MEDIUM"),
                readiness_score=float(r.get("readiness_score", 0.0)),
                retention_probability=float(r.get("retention_probability", 0.0)),
                bandit_action=r.get("bandit_action", "DELAY"),
                activity_type=r.get("activity_type"),
                engagement_score=r.get("engagement_score"),
                decision_reason=r.get("decision_reason"),
                status=r.get("status", "SCHEDULED"),
                scheduled_at=_scheduled_at(r),
                sent_at=r.get("sent_at"),
                responded_at=r.get("responded_at"),
            )
            for r in reminders
        ],
        count=len(reminders),
    )

@router.post("/{reminder_id}/feedback")
async def submit_feedback(
    reminder_id: str,
    feedback: ReminderFeedback,
    student_id: str = Depends(get_current_student_id),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Submit feedback for a reminder and update SM-2."""
    from bson import ObjectId

    try:
        database_id = ObjectId(reminder_id)
    except (TypeError, ValueError):
        database_id = reminder_id

    reminder = await db.reminders.find_one({"_id": database_id, "student_id": student_id})
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")

    try:
        action = reminder["bandit_action"]
        context = BanditContext.from_mapping(reminder["bandit_context"])
        if action not in ReminderAction.ALL:
            raise BanditValidationError(f"Unknown reminder action: {action}")
    except (KeyError, TypeError, ValueError, BanditValidationError) as exc:
        raise HTTPException(
            status_code=409,
            detail="Reminder is missing a valid bandit action or context",
        ) from exc
    
    reward = feedback_reward(feedback.status)
    now = datetime.now(timezone.utc)
    claimed = await db.reminders.update_one(
        {
            "_id": database_id,
            "student_id": student_id,
            "responded_at": None,
            "status": {"$in": ["SENT", "SCHEDULED"]},
        },
        {"$set": {
            "status": feedback.status,
            "reward": reward,
            "responded_at": now,
        }}
    )
    if claimed.modified_count != 1:
        raise HTTPException(status_code=409, detail="Reminder feedback already submitted")
    
    if feedback.status == "ACCEPTED" and feedback.grade is not None:
        item_doc = await db.review_items.find_one({
            "student_id": student_id,
            "item_key": reminder["item_key"]
        })

        if item_doc:
            item = item_from_mongo(item_doc)
            updated_item = update(item, feedback.grade, now)
            await db.review_items.update_one(
                {"_id": item_doc["_id"]},
                {"$set": item_to_mongo_update(updated_item)}
            )
    
    policy = await load_student_bandit(db, student_id)
    policy.update(action, context, reward)
    await save_student_bandit(db, student_id, policy)
    
    return {"status": "ok"}
