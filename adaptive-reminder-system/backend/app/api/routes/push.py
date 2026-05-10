from fastapi import APIRouter, Depends
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
    """Register push subscription for a student."""
    await db.push_subscriptions.insert_one({
        "student_id": student_id,
        "endpoint": sub.endpoint,
        "p256dh_key": sub.keys.get("p256dh"),
        "auth_key": sub.keys.get("auth"),
        "created_at": datetime.utcnow(),
    })
    return {"status": "subscribed"}

from datetime import datetime
