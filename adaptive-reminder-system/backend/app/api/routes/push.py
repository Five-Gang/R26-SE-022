from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.db.mongo import get_db
from app.api.deps import get_current_student_id
from app.schemas.schemas import PushSubscription

router = APIRouter(prefix="/api/v1/push", tags=["push"])

@router.post("/subscribe")
async def subscribe_push(
    sub: PushSubscription,
    student_id: str = Depends(get_current_student_id),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Register or refresh one push subscription for a student."""
    if not sub.keys.get("p256dh") or not sub.keys.get("auth"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Push subscription must include p256dh and auth keys",
        )
    await db.push_subscriptions.update_one(
        {"student_id": student_id, "endpoint": sub.endpoint},
        {
            "$set": {
                "student_id": student_id,
                "endpoint": sub.endpoint,
                "p256dh_key": sub.keys["p256dh"],
                "auth_key": sub.keys["auth"],
                "updated_at": datetime.now(timezone.utc),
            },
            "$setOnInsert": {"created_at": datetime.now(timezone.utc)},
        },
        upsert=True,
    )
    return {"status": "subscribed"}


@router.delete("/subscribe")
async def unsubscribe_push(
    endpoint: str,
    student_id: str = Depends(get_current_student_id),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Remove one subscription owned by the authenticated student."""
    result = await db.push_subscriptions.delete_one(
        {"student_id": student_id, "endpoint": endpoint}
    )
    return {"status": "unsubscribed", "removed": result.deleted_count}

from datetime import datetime
