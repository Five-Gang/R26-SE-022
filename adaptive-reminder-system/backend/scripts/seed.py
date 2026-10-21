"""
Seed script: populate MongoDB with demo data for testing.
Run after creating MongoDB collection indexes.
"""

import asyncio
import sys
import uuid
from datetime import datetime, timedelta, timezone

from bson import ObjectId
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

    student_filter = {"email": "kavya@demo.com"}
    existing_student = await db.students.find_one(student_filter)
    student_id = existing_student["_id"] if existing_student else str(uuid.uuid4())
    student_doc = {
        "_id": student_id,
        "email": "kavya@demo.com",
        "password_hash": hash_password("demo1234"),
        "name": "Kavya",
        "consent_at": datetime.now(timezone.utc),
        "quiet_hours": {"start": 22, "end": 8},
        "timezone": "UTC",
        "created_at": datetime.now(timezone.utc),
    }
    await db.students.update_one(student_filter, {"$set": student_doc}, upsert=True)
    print(f"Ready demo student: kavya@demo.com (ID: {student_id})")

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
        await db.review_items.update_one(
            {"student_id": student_id, "item_key": item_key},
            {
                "$set": {
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
            },
            upsert=True,
        )
    print("Created 8 demo review items")

    hiran = await db.students.find_one({"email": "it22371690@my.sliit.lk"})
    if not hiran:
        print("Hiran Thathsara account was not found; skipped Hiran seed data")
        client.close()
        return

    hiran_id = hiran["_id"]
    hiran_items = [
        ("hiran-ml-ethics", "Artificial Intelligence", "Ethics in Machine Learning"),
        ("hiran-cloud-security", "Cloud Computing", "Cloud Security Fundamentals"),
        ("hiran-software-architecture", "Software Engineering", "Microservices Architecture Patterns"),
        ("hiran-research-methods", "Research Methods", "Quantitative Research Design"),
    ]

    for item_key, topic, title in hiran_items:
        await db.review_items.update_one(
            {"student_id": hiran_id, "item_key": item_key},
            {
                "$set": {
                    "student_id": hiran_id,
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
            },
            upsert=True,
        )

    reminder_data = [
        ("hiran-ml-ethics", "Ethics in Machine Learning", "HIGH", 0.41, 0),
        ("hiran-cloud-security", "Cloud Security Fundamentals", "MEDIUM", 0.56, 0),
        ("hiran-software-architecture", "Microservices Architecture Patterns", "MEDIUM", 0.64, 1),
        ("hiran-research-methods", "Quantitative Research Design", "LOW", 0.72, 3),
    ]

    for item_key, title, readiness_tier, retention_probability, days_from_now in reminder_data:
        scheduled_at = now + timedelta(days=days_from_now)
        await db.reminders.update_one(
            {"student_id": hiran_id, "item_key": item_key, "status": "SENT"},
            {
                "$set": {
                    "student_id": hiran_id,
                    "item_key": item_key,
                    "item_title": title,
                    "content_type": "GUIDED_REVIEW",
                    "readiness_tier": readiness_tier,
                    "readiness_score": {"HIGH": 0.82, "MEDIUM": 0.64, "LOW": 0.38}[readiness_tier],
                    "retention_probability": retention_probability,
                    "bandit_action": "SEND",
                    "activity_type": "Review",
                    "engagement_score": 0.74,
                    "decision_reason": "Seeded personalized reminder for Hiran Thathsara",
                    "scheduled_at": scheduled_at,
                    "sent_at": now,
                    "responded_at": None,
                },
                "$setOnInsert": {"_id": ObjectId()},
            },
            upsert=True,
        )
    print(f"Created {len(hiran_items)} materials and {len(reminder_data)} reminders for Hiran Thathsara")

    client.close()
    print("Seeding complete")


if __name__ == "__main__":
    asyncio.run(seed())
