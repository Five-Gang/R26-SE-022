from datetime import datetime, timezone

import pytest

from app.services import push_delivery


class Cursor:
    def __init__(self, values):
        self.values = values

    async def to_list(self, _length):
        return list(self.values)


class Collection:
    def __init__(self, subscriptions):
        self.subscriptions = subscriptions
        self.deleted = []

    def find(self, _query):
        return Cursor(self.subscriptions)

    async def delete_one(self, query):
        self.deleted.append(query)


class Database:
    def __init__(self, subscriptions):
        self.push_subscriptions = Collection(subscriptions)


def subscription():
    return {
        "_id": "subscription-1",
        "endpoint": "https://push.example/subscription-1",
        "p256dh_key": "p256dh",
        "auth_key": "auth",
    }


def reminder():
    return {
        "_id": "reminder-1",
        "item_key": "item-1",
        "item_title": "Derivatives",
        "scheduled_at": datetime(2026, 10, 19, tzinfo=timezone.utc),
    }


@pytest.mark.asyncio
async def test_push_delivery_is_best_effort_when_vapid_is_not_configured(monkeypatch):
    monkeypatch.setattr(push_delivery.settings, "VAPID_PRIVATE_KEY", "")
    monkeypatch.setattr(push_delivery.settings, "VAPID_CONTACT_EMAIL", "")

    result = await push_delivery.deliver_reminder_push(
        Database([subscription()]), "student-1", reminder()
    )

    assert result == {"attempted": 1, "delivered": 0, "failed": 1, "expired": 0}


@pytest.mark.asyncio
async def test_push_delivery_sends_payload(monkeypatch):
    calls = []
    monkeypatch.setattr(push_delivery.settings, "VAPID_PRIVATE_KEY", "private-key")
    monkeypatch.setattr(push_delivery.settings, "VAPID_CONTACT_EMAIL", "mailto:test@example.com")

    def fake_webpush(**kwargs):
        calls.append(kwargs)

    monkeypatch.setattr(push_delivery, "webpush", fake_webpush)

    result = await push_delivery.deliver_reminder_push(
        Database([subscription()]), "student-1", reminder()
    )

    assert result == {"attempted": 1, "delivered": 1, "failed": 0, "expired": 0}
    assert calls[0]["subscription_info"]["endpoint"] == subscription()["endpoint"]
    assert "Derivatives" in calls[0]["data"]


@pytest.mark.asyncio
async def test_expired_subscription_is_removed(monkeypatch):
    monkeypatch.setattr(push_delivery.settings, "VAPID_PRIVATE_KEY", "private-key")
    monkeypatch.setattr(push_delivery.settings, "VAPID_CONTACT_EMAIL", "mailto:test@example.com")

    class Response:
        status_code = 410

    error = push_delivery.WebPushException("expired")
    error.response = Response()

    def fake_webpush(**_kwargs):
        raise error

    monkeypatch.setattr(push_delivery, "webpush", fake_webpush)
    db = Database([subscription()])

    result = await push_delivery.deliver_reminder_push(db, "student-1", reminder())

    assert result == {"attempted": 1, "delivered": 0, "failed": 0, "expired": 1}
    assert db.push_subscriptions.deleted == [{"_id": "subscription-1"}]
