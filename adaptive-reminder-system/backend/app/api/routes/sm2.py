from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from datetime import datetime, timezone
from pydantic import BaseModel
from app.models.sm2 import (
    StudyItem,
    item_from_mongo,
    item_to_mongo_update,
    calculate_quality_score,
    update_sm2,
    process_item,
)

router = APIRouter(prefix="/api/v1/sm2", tags=["sm2"])


class SM2Request(BaseModel):
    item: Optional[dict] = None
    quality_percentage: Optional[float] = None
    readiness_level: str = "MEDIUM"


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

    # If quality provided, convert to SM-2 quality and update
    if req.quality_percentage is not None:
        q = calculate_quality_score(req.quality_percentage)
        item = update_sm2(item, q, now)

    result = process_item(item, req.readiness_level, now)
    return result
