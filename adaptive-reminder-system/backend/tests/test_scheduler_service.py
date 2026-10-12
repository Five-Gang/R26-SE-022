from datetime import datetime, timezone

import pytest

from app.models.learning_context import ActivityType, LearningSignal
from app.services.scheduler import run_scheduling_tick


class Cursor:
    def __init__(self, values):
        self.values = values

    def sort(self, *_args):
        return self

    def limit(self, *_args):
        return self

    async def to_list(self, _length):
        return list(self.values)


class Collection:
    def __init__(self, values=None):
        self.values = list(values or [])

    def find(self, query):
        if "sent_at" in query:
            values = [value for value in self.values if value.get("sent_at") is not None]
        else:
            values = [
                value for value in self.values
                if all(value.get(key) == expected for key, expected in query.items())
            ]
        return Cursor(values)

    async def find_one(self, query):
        for value in self.values:
            if all(value.get(key) == expected for key, expected in query.items()):
                return value
        return None

    async def count_documents(self, query):
        return len([
            value for value in self.values
            if all(
                (value.get(key) in expected["$in"])
                if isinstance(expected, dict) and "$in" in expected
                else value.get(key) == expected
                for key, expected in query.items()
            )
        ])

    async def insert_one(self, value):
        self.values.append(value)


class Database:
    def __init__(self):
        self.review_items = Collection(
            [
                {
                    "student_id": "student-1",
                    "item_key": "item-1",
                    "title": "Derivatives",
                    "repetitions": 2,
                    "interval_days": 6.0,
                    "easiness": 2.5,
                    "difficulty": 0.5,
                    "last_reviewed": "2026-10-09T12:00:00+00:00",
                }
            ]
        )
        self.reminders = Collection()
        self.bandit_policies = Collection()


class Provider:
    async def read(self, _student_id):
        return LearningSignal(
            valence=0.4,
            arousal=0.7,
            attention=0.9,
            activity_type=ActivityType.QUIZ,
            session_active=True,
            content_in_focus=True,
            fatigue=0.1,
        )


@pytest.mark.asyncio
async def test_tick_creates_sendable_reminder_with_bandit_context():
    db = Database()
    result = await run_scheduling_tick(
        "student-1",
        db,
        provider=Provider(),
        now=datetime(2026, 10, 12, tzinfo=timezone.utc),
    )

    assert result["status"] == "ok"
    assert result["items_processed"] == 1
    assert result["reminders_created"] in (0, 1)
    if result["reminders_created"]:
        reminder = db.reminders.values[0]
        assert reminder["bandit_action"] == "SEND"
        assert len(reminder["bandit_context"]) == 10


@pytest.mark.asyncio
async def test_tick_skips_when_no_active_learning_session():
    db = Database()

    class IdleProvider:
        async def read(self, _student_id):
            return LearningSignal(
                valence=0.0,
                arousal=0.2,
                attention=0.2,
                activity_type=ActivityType.IDLE,
                session_active=False,
                content_in_focus=False,
            )

    result = await run_scheduling_tick("student-1", db, provider=IdleProvider())

    assert result["reminders_created"] == 0
    assert result["decision"] == "SKIP"
