import pytest
from fastapi import HTTPException

from app.api.routes.reminders import submit_feedback
from app.schemas.schemas import ReminderFeedback


class Result:
    def __init__(self, modified_count):
        self.modified_count = modified_count


class Collection:
    def __init__(self, document):
        self.document = document
        self.update_calls = 0

    async def find_one(self, query):
        if "item_key" in query:
            return None
        return self.document

    async def update_one(self, query, update):
        self.update_calls += 1
        if self.document["responded_at"] is not None:
            return Result(0)
        self.document.update(update["$set"])
        return Result(1)


class Database:
    def __init__(self):
        self.reminders = Collection(
            {
                "_id": "reminder-1",
                "student_id": "student-1",
                "item_key": "item-1",
                "bandit_action": "SEND",
                "bandit_context": {
                    "context_version": 2,
                    "readiness_score": 0.8,
                    "retention_probability": 0.3,
                    "priority_score": 0.9,
                    "time_sin": 0.5,
                    "time_cos": 0.8,
                    "time_since_reminder": 0.5,
                    "acceptance_rate": 0.0,
                    "dismissal_rate": 0.0,
                    "engagement_score": 0.8,
                    "bias": 1.0,
                },
                "status": "SENT",
                "responded_at": None,
            }
        )


@pytest.mark.asyncio
async def test_feedback_claim_is_single_use(monkeypatch):
    db = Database()
    policy_updates = []

    async def no_item(*_args, **_kwargs):
        return None

    class Policy:
        def update(self, action, context, reward):
            policy_updates.append((action, context.to_dict(), reward))

    async def load(*_args):
        return Policy()

    async def save(*_args):
        return None

    monkeypatch.setattr("app.api.routes.reminders.load_student_bandit", load)
    monkeypatch.setattr("app.api.routes.reminders.save_student_bandit", save)
    monkeypatch.setattr("app.api.routes.reminders.item_from_mongo", no_item)

    feedback = ReminderFeedback(status="ACCEPTED", grade=None)
    reminder_id = "507f1f77bcf86cd799439011"
    await submit_feedback(reminder_id, feedback, "student-1", db)

    with pytest.raises(HTTPException) as error:
        await submit_feedback(reminder_id, feedback, "student-1", db)

    assert error.value.status_code == 409
    assert db.reminders.update_calls == 2
    assert db.reminders.document["reward"] == 1.0
    assert len(policy_updates) == 1
    action, context, reward = policy_updates[0]
    assert action == "SEND"
    assert context["context_version"] == 2
    assert context["readiness_score"] == 0.8
    assert reward == 1.0
