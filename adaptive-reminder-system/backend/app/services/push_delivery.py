"""Best-effort Web Push delivery for persisted reminders."""

from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime
from typing import Any

from pywebpush import WebPushException, webpush
from py_vapid import Vapid
from requests import RequestException

from app.core.config import settings

logger = logging.getLogger(__name__)


class PushConfigurationError(RuntimeError):
    """Raised when Web Push is requested without complete VAPID configuration."""


def _vapid_claims() -> dict[str, str]:
    if not settings.VAPID_PRIVATE_KEY or not settings.VAPID_CONTACT_EMAIL:
        raise PushConfigurationError(
            "VAPID_PRIVATE_KEY and VAPID_CONTACT_EMAIL must be configured"
        )
    return {"sub": settings.VAPID_CONTACT_EMAIL}


def _vapid_private_key() -> Vapid | str:
    key = settings.VAPID_PRIVATE_KEY
    if "BEGIN" in key:
        return Vapid.from_pem(key.encode())
    return key


def _payload(reminder: dict[str, Any]) -> str:
    return json.dumps(
        {
            "title": "AuraLearn reminder",
            "body": (
                f"{reminder.get('item_title', reminder.get('item_key', 'Study item'))} "
                "is ready for review."
            ),
            "url": "/study/queue",
            "reminder_id": str(reminder.get("_id", "")),
            "scheduled_at": reminder.get("scheduled_at").isoformat()
            if isinstance(reminder.get("scheduled_at"), datetime)
            else reminder.get("scheduled_at"),
        }
    )


async def deliver_reminder_push(
    db: Any,
    student_id: str,
    reminder: dict[str, Any],
) -> dict[str, int]:
    """Deliver a reminder to all subscriptions without failing scheduling.

    Persisted reminders remain valid when delivery is unavailable. Expired
    subscriptions are removed so future ticks do not repeatedly retry them.
    """

    collection = getattr(db, "push_subscriptions", None)
    if collection is None:
        return {"attempted": 0, "delivered": 0, "failed": 0, "expired": 0}

    subscriptions = await collection.find({"student_id": student_id}).to_list(None)
    if not subscriptions:
        return {"attempted": 0, "delivered": 0, "failed": 0, "expired": 0}

    try:
        payload = _payload(reminder)
        claims = _vapid_claims()
    except PushConfigurationError as exc:
        logger.warning("Web Push is disabled: %s", exc)
        return {
            "attempted": len(subscriptions),
            "delivered": 0,
            "failed": len(subscriptions),
            "expired": 0,
        }

    result = {"attempted": 0, "delivered": 0, "failed": 0, "expired": 0}
    for subscription in subscriptions:
        result["attempted"] += 1
        try:
            await asyncio.to_thread(
                webpush,
                subscription_info={
                    "endpoint": subscription["endpoint"],
                    "keys": {
                        "p256dh": subscription["p256dh_key"],
                        "auth": subscription["auth_key"],
                    },
                },
                data=payload,
                vapid_private_key=_vapid_private_key(),
                vapid_claims=claims,
            )
            result["delivered"] += 1
        except WebPushException as exc:
            status_code = getattr(getattr(exc, "response", None), "status_code", None)
            if status_code in (404, 410):
                await collection.delete_one({"_id": subscription["_id"]})
                result["expired"] += 1
            else:
                result["failed"] += 1
            logger.warning(
                "Web Push delivery failed for student %s (status=%s)",
                student_id,
                status_code,
            )
        except (KeyError, TypeError, ValueError) as exc:
            result["failed"] += 1
            logger.warning("Invalid Web Push subscription for student %s: %s", student_id, exc)
        except (OSError, RequestException, RuntimeError) as exc:
            result["failed"] += 1
            logger.warning(
                "Web Push delivery failed for student %s: %s", student_id, exc
            )
    return result
