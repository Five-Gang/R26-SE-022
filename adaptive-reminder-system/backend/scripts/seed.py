"""
Seed script: populate MongoDB with demo data for testing.
Run after creating MongoDB collection indexes.
"""

import asyncio
import sys
import uuid
from datetime import datetime, timedelta, timezone

from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.core.security import hash_password


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")


async def seed():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB]

    student_id = str(uuid.uuid4())
    await db.students.insert_one(
        {
            "_id": student_id,
            "email": "kavya@demo.com",
            "password_hash": hash_password("demo1234"),
            "name": "Kavya",
            "consent_at": datetime.now(timezone.utc),
            "quiet_hours": {"start": 22, "end": 8},
            "timezone": "UTC",
            "created_at": datetime.now(timezone.utc),
        }
    )
    print(f"Created demo student: kavya@demo.com (ID: {student_id})")

    now = datetime.now(timezone.utc)
    items_data = [
        ("calculus-1", "Mathematics", "Derivatives of trigonometric functions"),
        ("history-1", "History", "French Revolution timeline"),
        ("chemistry-1", "Chemistry", "Chemical bonding and Lewis structures"),
        ("biology-1", "Biology", "Cellular respiration process"),
        ("physics-1", "Physics", "Newton's laws of motion"),
        ("english-1", "English", "Shakespearean sonnets structure"),
        ("cs-1", "Computer Science", "Binary search algorithm complexity"),
        ("econ-1", "Economics", "Supply and demand curves"),
    ]

    for item_key, topic, title in items_data:
        await db.review_items.insert_one(
            {
                "student_id": student_id,
                "item_key": item_key,
                "topic": topic,
                "title": title,
                "repetitions": 2,
                "interval_days": 6.0,
                "easiness": 2.5,
                "difficulty": 0.5,
                "last_reviewed": now - timedelta(days=3),
                "created_at": now,
            }
        )
    print("Created 8 demo review items")

    client.close()
    print("Seeding complete")


if __name__ == "__main__":
    asyncio.run(seed())
