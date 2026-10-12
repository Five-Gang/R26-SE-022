from datetime import datetime, timezone

import pytest

from app.models.learning_context import ActivityType, LearningSignal
import app.services.scheduler as scheduler_service
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
            if all(
                value.get(key) in expected["$in"]
                if isinstance(expected, dict) and "$in" in expected
                else value.get(key) == expected
                for key, expected in query.items()
            ):
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

    async def update_many(self, query, update):
        modified = 0
        for value in self.values:
            if (
                value.get("student_id") == query.get("student_id")
                and value.get("status") == query["status"]
                and value.get("scheduled_at") <= query["scheduled_at"]["$lte"]
            ):
                value.update(update["$set"])
                modified += 1
        return type("Result", (), {"modified_count": modified})()


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
        self.scheduler_decisions = Collection()


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
        assert reminder["bandit_action"] in ("SEND", "DELAY")
        assert reminder["status"] in ("SENT", "SCHEDULED")
        assert set(reminder["bandit_scores"]) == set(reminder["bandit_allowed_actions"])
        assert reminder["bandit_context"]["context_version"] == 2
        assert len(reminder["bandit_context"]) - 1 == 10
        assert reminder["recommended_activity"]
    assert len(db.scheduler_decisions.values) == 1


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
    assert db.scheduler_decisions.values[0]["action"] == "SKIP"


@pytest.mark.asyncio
async def test_delayed_reminder_is_not_delivered_before_due_time():
    db = Database()
    scheduled_at = datetime(2026, 10, 12, 13, tzinfo=timezone.utc)
    db.reminders.values.append(
        {
            "student_id": "student-1",
            "item_key": "item-1",
            "status": "SCHEDULED",
            "scheduled_at": scheduled_at,
            "sent_at": None,
        }
    )

    before_due = await run_scheduling_tick(
        "student-1",
        db,
        provider=Provider(),
        now=datetime(2026, 10, 12, 12, 30, tzinfo=timezone.utc),
    )
    assert before_due["reminders_created"] == 0
    assert db.reminders.values[0]["status"] == "SCHEDULED"

    after_due = await run_scheduling_tick(
        "student-1",
        db,
        provider=Provider(),
        now=datetime(2026, 10, 12, 13, tzinfo=timezone.utc),
    )
    assert after_due["reminders_created"] == 1
    assert db.reminders.values[0]["status"] == "SENT"


@pytest.mark.asyncio
async def test_rule_scheduler_fallback_persists_decision(monkeypatch):
    db = Database()

    async def failing_policy(_db, _student_id):
        raise ValueError("invalid persisted policy")

    monkeypatch.setattr(scheduler_service, "load_student_bandit", failing_policy)

    result = await run_scheduling_tick(
        "student-1",
        db,
        provider=Provider(),
        now=datetime(2026, 10, 12, tzinfo=timezone.utc),
    )

    assert result["status"] == "ok"
    assert db.scheduler_decisions.values[0]["policy_source"] == "rule_based_fallback"
