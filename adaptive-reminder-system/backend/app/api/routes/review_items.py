from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel

from app.api.deps import get_current_student_id
from app.db.mongo import get_db
from app.models.sm2 import (
    StudyItem,
    calculate_quality_score,
    item_to_mongo_update,
    retention_probability,
    calculate_priority_score,
    update_sm2,
)

router = APIRouter(prefix="/api/v1/review-items", tags=["review-items"])


class ReviewItemUpsert(BaseModel):
    item_key: str
    title: str
    topic: Optional[str] = None
    module_id: Optional[str] = None
    week_number: Optional[int] = None
    difficulty: str = "medium"        # "easy" | "medium" | "hard"
    quality_percentage: float = 80.0  # quiz score 0-100 for this item


@router.post("/upsert")
async def upsert_review_item(
    body: ReviewItemUpsert,
    student_id: str = Depends(get_current_student_id),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Register or update a study item after a quiz attempt.

    If the item already exists, update its SM-2 state with the new quiz quality.
    If it doesn't exist, create a fresh item seeded with the provided score.
    This is what populates `review_items` so the scheduler can create reminders.
    """
    now = datetime.now(timezone.utc)

    difficulty_map = {"easy": 0.3, "medium": 0.5, "hard": 0.8}
    difficulty_value = difficulty_map.get(body.difficulty.lower(), 0.5)
    quality = calculate_quality_score(body.quality_percentage)

    existing = await db.review_items.find_one(
        {"student_id": student_id, "item_key": body.item_key}
    )

    if existing:
        # Update SM-2 state from existing document
        item = StudyItem(
            item_id=body.item_key,
            repetitions=existing.get("repetitions", 0),
            interval_days=existing.get("interval_days", 1.0),
            easiness_factor=existing.get("easiness_factor", 2.5),
            difficulty=existing.get("difficulty", difficulty_value),
            last_reviewed=existing.get("last_reviewed"),
            quality_scores=existing.get("quality_scores", []),
        )
        updated = update_sm2(item, quality, now)
        update_payload = item_to_mongo_update(updated)
        update_payload["last_reviewed"] = now
        # Preserve metadata fields if missing
        for field in ("title", "topic", "module_id", "week_number"):
            val = getattr(body, field, None)
            if val is not None:
                update_payload[field] = val
        await db.review_items.update_one(
            {"student_id": student_id, "item_key": body.item_key},
            {"$set": update_payload},
        )
    else:
        # Create fresh SM-2 item
        fresh = StudyItem(
            item_id=body.item_key,
            difficulty=difficulty_value,
        )
        updated = update_sm2(fresh, quality, now)
        ret = retention_probability(updated, now)
        priority = calculate_priority_score(updated, ret, "MEDIUM", now)
        doc = {
            "student_id": student_id,
            "item_key": body.item_key,
            "title": body.title,
            "topic": body.topic,
            "module_id": body.module_id,
            "week_number": body.week_number,
            "difficulty": updated.difficulty,
            "difficulty_level": body.difficulty,
            "repetitions": updated.repetitions,
            "interval_days": updated.interval_days,
            "easiness_factor": updated.easiness_factor,
            "quality_scores": updated.quality_scores,
            "last_reviewed": now,
            "retention_probability": ret,
            "review_priority": priority,
            "created_at": now,
        }
        await db.review_items.insert_one(doc)

    # Re-read to return current state
    saved = await db.review_items.find_one(
        {"student_id": student_id, "item_key": body.item_key}
    )
    return {
        "status": "ok",
        "item_key": body.item_key,
        "repetitions": saved.get("repetitions"),
        "interval_days": saved.get("interval_days"),
        "retention_probability": saved.get("retention_probability"),
    }


@router.get("")
async def list_review_items(
    student_id: str = Depends(get_current_student_id),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """List all review items for the current student."""
    items = await db.review_items.find({"student_id": student_id}).sort("review_priority", -1).to_list(None)
    return {
        "items": [
            {
                "item_key": i.get("item_key"),
                "title": i.get("title", i.get("item_key")),
                "topic": i.get("topic"),
                "module_id": str(i.get("module_id")) if i.get("module_id") else None,
                "repetitions": i.get("repetitions", 0),
                "interval_days": i.get("interval_days", 1.0),
                "easiness": i.get("easiness_factor", 2.5),
                "difficulty": i.get("difficulty", 0.5),
                "retention_probability": i.get("retention_probability", 0.0),
                "review_priority": i.get("review_priority", 0.0),
                "last_reviewed": i.get("last_reviewed"),
            }
            for i in items
        ],
        "count": len(items),
    }
