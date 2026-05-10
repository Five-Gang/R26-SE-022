from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from datetime import datetime, timezone, timedelta
from dataclasses import replace
from pydantic import BaseModel
from app.models.sm2 import (
    StudyItem,
    item_from_mongo,
    item_to_mongo_update,
    calculate_quality_score,
    update_sm2,
    retention_probability,
    calculate_priority_score,
    next_review_date,
)

router = APIRouter(prefix="/api/v1/sm2", tags=["sm2"])


class SM2Request(BaseModel):
    item: Optional[dict] = None
    quality_percentage: Optional[float] = None
    readiness_level: str = "MEDIUM"
    days_since_last_review: float = 2.0


@router.post("/process")
async def sm2_process(req: SM2Request):
    """Process an SM-2 item. Useful for frontend demo/testing.

    Accepts an optional `item` dict representing the StudyItem fields and an optional
    `quality_percentage` to update the item. Returns processed metrics.
    """
    now = datetime.now(timezone.utc)

    # Build StudyItem from provided doc or use defaults
    if req.item:
        try:
            item = item_from_mongo(req.item)
        except Exception:
            # Fallback: minimal StudyItem
            item = StudyItem(item_id=req.item.get("item_id", "demo_item"))
    else:
        item = StudyItem(item_id="demo_item")

    # If the demo item has no review history, simulate a previous review so the
    # retention curve reflects decay instead of always evaluating at t = 0.
    if item.last_reviewed is None and req.quality_percentage is not None:
        item = replace(
            item,
            last_reviewed=now - timedelta(days=max(req.days_since_last_review, 0.0)),
        )

    retention_before_review = retention_probability(item, now)
    priority_score = calculate_priority_score(item, retention_before_review, req.readiness_level, now)

    # If quality provided, convert to SM-2 quality and update
    if req.quality_percentage is not None:
        q = calculate_quality_score(req.quality_percentage)
        updated_item = update_sm2(item, q, now)
    else:
        updated_item = item

    return {
        "item_id": updated_item.item_id,
        "retention_probability": retention_before_review,
        "priority_score": priority_score,
        "next_review_date": next_review_date(updated_item, now).isoformat(),
        "repetitions": updated_item.repetitions,
        "interval_days": updated_item.interval_days,
        "easiness_factor": updated_item.easiness_factor,
        "difficulty": updated_item.difficulty,
        "last_reviewed": updated_item.last_reviewed.isoformat() if updated_item.last_reviewed else None,
        "quality_scores": updated_item.quality_scores,
    }
