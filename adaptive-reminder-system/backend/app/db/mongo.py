from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import settings

_client: Optional[AsyncIOMotorClient] = None

async def connect_db() -> None:
    global _client
    _client = AsyncIOMotorClient(settings.MONGODB_URL)
    # Create indexes on first connect
    db = _client[settings.MONGODB_DB]
    await db.students.create_index("email", unique=True)
    await db.review_items.create_index(
        [("student_id", 1), ("item_key", 1)], unique=True
    )
    await db.reminders.create_index("student_id")
    await db.reminders.create_index([("student_id", 1), ("status", 1)])
    await db.scheduler_decisions.create_index([("student_id", 1), ("created_at", -1)])
    await db.scheduler_decisions.create_index(
        [("student_id", 1), ("action", 1), ("created_at", -1)]
    )
    await db.bandit_policies.create_index("student_id", unique=True)
    await db.push_subscriptions.create_index("student_id")
    await db.push_subscriptions.create_index([("student_id", 1), ("endpoint", 1)])

async def disconnect_db() -> None:
    if _client:
        _client.close()

def get_db() -> AsyncIOMotorDatabase:
    return _client[settings.MONGODB_DB]
