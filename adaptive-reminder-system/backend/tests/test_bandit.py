from datetime import datetime
import math

import pytest

from app.models.bandit import (
    BanditContext,
    BanditValidationError,
    LinUCB,
    ReminderAction,
)
from app.services.bandit_service import (
    feedback_reward,
    load_student_bandit,
    save_student_bandit,
)


def make_context(**overrides):
    values = {
        "readiness_score": 0.8,
        "retention_probability": 0.3,
        "priority_score": 0.9,
        "time_sin": 0.5,
        "time_cos": 0.866,
        "time_since_reminder": 1.0,
        "acceptance_rate": 0.6,
        "dismissal_rate": 0.1,
        "engagement_score": 0.75,
    }
    values.update(overrides)
    return BanditContext.from_mapping(values)


class FakeCollection:
    def __init__(self):
        self.document = None

    async def find_one(self, query):
        if self.document and self.document["student_id"] == query["student_id"]:
            return self.document
        return None

    async def update_one(self, query, update, upsert):
        self.document = update["$set"]


class FakeDatabase:
    def __init__(self):
        self.bandit_policies = FakeCollection()


def test_context_has_complete_ten_feature_vector():
    context = make_context()

    assert context.vector().shape == (10,)
    assert context.vector()[-1] == 1.0


def test_cyclical_time_features_are_normalized():
    context = BanditContext.from_time(
        readiness_score=0.5,
        retention_probability=0.5,
        priority_score=0.5,
        time_since_reminder=0,
        acceptance_rate=0,
        dismissal_rate=0,
        engagement_score=0.5,
        at=datetime(2026, 1, 1, 6),
    )

    assert math.isclose(context.time_sin, 1.0)
    assert math.isclose(context.time_cos, 0.0, abs_tol=1e-12)


def test_initial_selection_is_deterministic():
    assert LinUCB(alpha=0).select_action(make_context()) == ReminderAction.SEND


def test_update_changes_action_estimate():
    model = LinUCB(alpha=0)
    context = make_context()

    model.update(ReminderAction.DELAY, context, reward=1.0)

    assert model.select_action(context) == ReminderAction.DELAY


def test_state_round_trip_preserves_selection_and_statistics():
    model = LinUCB(alpha=0.5)
    context = make_context()
    model.update(ReminderAction.SKIP, context, reward=1.0)

    restored = LinUCB.from_dict(model.to_dict())

    assert restored.to_dict() == model.to_dict()
    assert restored.select_action(context) == model.select_action(context)


def test_invalid_context_is_rejected():
    with pytest.raises(BanditValidationError):
        make_context(readiness_score=1.1)
    with pytest.raises(BanditValidationError):
        make_context(time_since_reminder=1.1)


def test_action_selection_can_be_restricted_for_cold_start():
    model = LinUCB(alpha=0)

    assert model.select_action(
        make_context(),
        actions=(ReminderAction.DELAY, ReminderAction.SKIP),
    ) == ReminderAction.DELAY


@pytest.mark.asyncio
async def test_student_policy_persists_and_restores():
    db = FakeDatabase()
    model = LinUCB(alpha=0.25)
    model.update(ReminderAction.SEND, make_context(), 1.0)

    await save_student_bandit(db, "student-1", model)
    restored = await load_student_bandit(db, "student-1")

    assert restored.to_dict() == model.to_dict()


def test_feedback_reward_mapping():
    assert feedback_reward("ACCEPTED") == 1.0
    assert feedback_reward("SNOOZED") == 0.0
    assert feedback_reward("DISMISSED") == -1.0
    with pytest.raises(ValueError):
        feedback_reward("UNKNOWN")
