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

@router.get("", response_model=ReminderQueueResponse)
async def get_reminders(
    student_id: str = Depends(get_current_student_id),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Get all SENT reminders for the student."""
    reminders = await db.reminders.find({
        "student_id": student_id,
        "status": "SENT"
    }).to_list(None)
    
    return ReminderQueueResponse(
        reminders=[
            ReminderResponse(
                reminder_id=str(r["_id"]),
                item_key=r["item_key"],
                item_title=r["item_title"],
                content_type=r["content_type"],
                readiness_tier=r["readiness_tier"],
                readiness_score=r["readiness_score"],
                retention_probability=r["retention_probability"],
                bandit_action=r["bandit_action"],
                activity_type=r.get("activity_type"),
                engagement_score=r.get("engagement_score"),
                decision_reason=r.get("decision_reason"),
                status=r["status"],
                scheduled_at=r["scheduled_at"],
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
    
    reminder = await db.reminders.find_one({"_id": ObjectId(reminder_id), "student_id": student_id})
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
    
    # Update reminder status
    now = datetime.now(timezone.utc)
    await db.reminders.update_one(
        {"_id": ObjectId(reminder_id)},
        {"$set": {
            "status": feedback.status,
            "responded_at": now,
        }}
    )
    
    # Update SM-2 state for the item
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
    policy.update(action, context, feedback_reward(feedback.status))
    await save_student_bandit(db, student_id, policy)
    
    return {"status": "ok"}
