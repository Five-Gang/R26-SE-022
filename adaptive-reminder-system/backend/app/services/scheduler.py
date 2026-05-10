from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.db.mongo import get_db
from app.models.bandit import Action, LinUCB, build_context
from app.models.readiness_fusion import ReadinessAssessment, assess_learning_readiness
from app.models.sm2 import item_from_mongo, retention_probability, review_priority
from app.services.emotion_provider import create_emotion_provider
from app.services.signal_control import signal_control_store

_bandit = LinUCB()
_emotion = create_emotion_provider()


def _build_tick_summary(
    *,
    student_id: str,
    status: str,
    reminders_created: int,
    items_processed: int,
    decision: str,
    decision_reason: str,
    assessment: ReadinessAssessment,
) -> dict:
    return {
        "student_id": student_id,
        "status": status,
        "reminders_created": reminders_created,
        "items_processed": items_processed,
        "decision": decision,
        "decision_reason": decision_reason,
        "activity_type": assessment.activity_type.value,
        "session_active": assessment.session_active,
        "engagement_score": assessment.engagement_score,
        "readiness_score": assessment.readiness_score,
        "readiness_tier": assessment.readiness_tier.value,
        "content_type": assessment.content_type,
    }


def _serialize_signal(signal) -> dict:
    return {
        "source": signal.source,
        "valence": signal.valence,
        "arousal": signal.arousal,
        "attention": signal.attention,
        "activity_type": signal.activity_type.value,
        "session_active": signal.session_active,
        "content_in_focus": signal.content_in_focus,
        "blink_rate": signal.blink_rate,
        "fatigue": signal.fatigue,
        "head_tilt_degrees": signal.head_tilt_degrees,
        "signal_confidence": signal.signal_confidence,
    }


def _serialize_assessment(assessment: ReadinessAssessment) -> dict:
    return {
        "activity_type": assessment.activity_type.value,
        "session_active": assessment.session_active,
        "content_in_focus": assessment.content_in_focus,
        "is_learning_activity": assessment.is_learning_activity,
        "should_send_recommendation": assessment.should_send_recommendation,
        "decision_reason": assessment.decision_reason,
        "engagement_score": assessment.engagement_score,
        "activity_learning_score": assessment.activity_learning_score,
        "effective_valence": assessment.effective_valence,
        "effective_arousal": assessment.effective_arousal,
        "effective_attention": assessment.effective_attention,
        "blink_quality": assessment.blink_quality,
        "fatigue_penalty": assessment.fatigue_penalty,
        "head_alignment": assessment.head_alignment,
        "readiness_score": assessment.readiness_score,
        "readiness_tier": assessment.readiness_tier.value,
        "content_type": assessment.content_type,
    }


def _minutes_since_last_reminder(now: datetime, last_reminder: dict | None) -> float:
    if not last_reminder or not last_reminder.get("sent_at"):
        return 999.0

    sent_at = last_reminder["sent_at"]
    if isinstance(sent_at, str):
        sent_at = datetime.fromisoformat(sent_at)
    if sent_at.tzinfo is None:
        sent_at = sent_at.replace(tzinfo=timezone.utc)
    return max((now - sent_at).total_seconds() / 60.0, 0.0)


async def preview_scheduling_state(student_id: str, db: AsyncIOMotorDatabase) -> dict:
    """
    Inspect how the current signal configuration affects readiness, content choice,
    bandit context, and the final scheduling decision without mutating state.
    """
    now = datetime.now(timezone.utc)
    signal = await _emotion.read(student_id)
    assessment = assess_learning_readiness(signal)

    items_docs = await db.review_items.find({"student_id": student_id}).to_list(None)
    pending_reminder = await db.reminders.find_one({
        "student_id": student_id,
        "status": "SENT",
    })
    last_reminder = await db.reminders.find_one(
        {"student_id": student_id},
        sort=[("sent_at", -1)],
    )

    total_reminders = await db.reminders.count_documents({"student_id": student_id})
    accepted_reminders = await db.reminders.count_documents({
        "student_id": student_id,
        "status": "ACCEPTED",
    })
    accept_rate = (accepted_reminders / total_reminders) if total_reminders > 0 else 0.5
    mins_since_last = _minutes_since_last_reminder(now, last_reminder)

    top_item_payload = None
    bandit_preview = None
    scheduler_status = "NO_ITEMS"
    scheduler_reason = "No review items are available for scheduling."
    would_send_now = False

    if items_docs:
        items = [item_from_mongo(doc) for doc in items_docs]
        priorities = [(index, review_priority(item, now)) for index, item in enumerate(items)]
        priorities.sort(key=lambda row: row[1], reverse=True)

        if priorities:
            top_index, top_priority = priorities[0]
            top_item = items[top_index]
            top_doc = items_docs[top_index]
            top_retention = retention_probability(top_item, now)
            context = build_context(
                readiness_score=assessment.readiness_score,
                item_priority=top_priority,
                hour_of_day=now.hour,
                minutes_since_last_reminder=mins_since_last,
                recent_accept_rate=accept_rate,
                engagement_score=assessment.engagement_score,
                activity_learning_score=assessment.activity_learning_score,
            )
            action, ucb_scores = _bandit.select(context)

            top_item_payload = {
                "item_key": top_item.item_id,
                "title": top_doc.get("title", "Untitled"),
                "topic": top_doc.get("topic", "Unknown"),
                "priority": top_priority,
                "retention_probability": top_retention,
            }
            bandit_preview = {
                "action": action.name,
                "ucb_scores": ucb_scores,
                "context": context.tolist(),
                "minutes_since_last_reminder": mins_since_last,
                "recent_accept_rate": accept_rate,
            }

            if pending_reminder:
                scheduler_status = "PENDING_REMINDER"
                scheduler_reason = "An earlier reminder is still pending."
            elif not assessment.should_send_recommendation:
                scheduler_status = "INACTIVE_CONTEXT"
                scheduler_reason = assessment.decision_reason
            elif action != Action.SEND:
                scheduler_status = action.name
                scheduler_reason = f"Bandit selected {action.name} for the current study state."
            else:
                scheduler_status = "SENT"
                scheduler_reason = assessment.decision_reason
                would_send_now = True
        else:
            scheduler_status = "NO_PRIORITY"
            scheduler_reason = "No review item qualified for scheduling."

    return {
        "student_id": student_id,
        "timestamp": now.isoformat(),
        "override_active": signal_control_store.has_override(student_id),
        "signal": _serialize_signal(signal),
        "assessment": _serialize_assessment(assessment),
        "counts": {
            "review_items": len(items_docs),
            "total_reminders": total_reminders,
            "accepted_reminders": accepted_reminders,
        },
        "pending_reminder": pending_reminder is not None,
        "top_item": top_item_payload,
        "bandit_preview": bandit_preview,
        "scheduler_preview": {
            "status": scheduler_status,
            "reason": scheduler_reason,
            "would_send_now": would_send_now,
        },
    }


async def run_scheduling_tick_for_all_students() -> None:
    """Called every 60 seconds by APScheduler."""
    db = get_db()
    students = await db.students.find({}).to_list(None)
    for student_doc in students:
        await run_scheduling_tick(student_doc["_id"], db)


async def run_scheduling_tick(student_id: str, db: AsyncIOMotorDatabase) -> dict:
    """
    Scheduling tick for one student:
    1. Read study activity plus affective signals
    2. Get all review items
    3. Gate reminder delivery unless the student is actively learning
    4. Prioritise items
    5. Build bandit context and select an action
    6. If SEND: create reminder
    """
    now = datetime.now(timezone.utc)

    signal = await _emotion.read(student_id)
    assessment = assess_learning_readiness(signal)

    items_docs = await db.review_items.find({"student_id": student_id}).to_list(None)
    if not items_docs:
        return _build_tick_summary(
            student_id=student_id,
            status="NO_ITEMS",
            reminders_created=0,
            items_processed=0,
            decision="SKIP",
            decision_reason="No review items are available for scheduling.",
            assessment=assessment,
        )

    existing_pending = await db.reminders.find_one({
        "student_id": student_id,
        "status": "SENT",
    })
    if existing_pending:
        return _build_tick_summary(
            student_id=student_id,
            status="PENDING_REMINDER",
            reminders_created=0,
            items_processed=len(items_docs),
            decision="SKIP",
            decision_reason="An earlier reminder is still pending.",
            assessment=assessment,
        )

    if not assessment.should_send_recommendation:
        return _build_tick_summary(
            student_id=student_id,
            status="INACTIVE_CONTEXT",
            reminders_created=0,
            items_processed=len(items_docs),
            decision="SKIP",
            decision_reason=assessment.decision_reason,
            assessment=assessment,
        )

    items = [item_from_mongo(doc) for doc in items_docs]
    priorities = [(index, review_priority(item, now)) for index, item in enumerate(items)]
    priorities.sort(key=lambda row: row[1], reverse=True)

    if not priorities:
        return _build_tick_summary(
            student_id=student_id,
            status="NO_PRIORITY",
            reminders_created=0,
            items_processed=len(items_docs),
            decision="SKIP",
            decision_reason="No review item qualified for scheduling.",
            assessment=assessment,
        )

    index, item_priority = priorities[0]
    item = items[index]
    item_retention = retention_probability(item, now)

    context = build_context(
        readiness_score=assessment.readiness_score,
        item_priority=item_priority,
        hour_of_day=now.hour,
        minutes_since_last_reminder=60.0,
        recent_accept_rate=0.75,
        engagement_score=assessment.engagement_score,
        activity_learning_score=assessment.activity_learning_score,
    )
    action, ucb_scores = _bandit.select(context)

    if action != Action.SEND:
        return _build_tick_summary(
            student_id=student_id,
            status=action.name,
            reminders_created=0,
            items_processed=len(items_docs),
            decision=action.name,
            decision_reason=f"Bandit selected {action.name} for the current study state.",
            assessment=assessment,
        )

    await db.reminders.insert_one({
        "student_id": student_id,
        "item_key": item.item_id,
        "item_title": items_docs[index].get("title", "Untitled"),
        "content_type": assessment.content_type,
        "readiness_tier": assessment.readiness_tier.value,
        "readiness_score": assessment.readiness_score,
        "retention_probability": item_retention,
        "bandit_action": action.name,
        "bandit_context": context.tolist(),
        "bandit_ucb_scores": ucb_scores,
        "activity_type": assessment.activity_type.value,
        "session_active": assessment.session_active,
        "engagement_score": assessment.engagement_score,
        "decision_reason": assessment.decision_reason,
        "effective_signals": {
            "valence": assessment.effective_valence,
            "arousal": assessment.effective_arousal,
            "attention": assessment.effective_attention,
        },
        "sensor_cues": {
            "blink_rate": signal.blink_rate,
            "blink_quality": assessment.blink_quality,
            "fatigue": signal.fatigue,
            "head_tilt_degrees": signal.head_tilt_degrees,
            "head_alignment": assessment.head_alignment,
        },
        "status": "SENT",
        "scheduled_at": now,
        "sent_at": now,
        "responded_at": None,
    })

    return _build_tick_summary(
        student_id=student_id,
        status="SENT",
        reminders_created=1,
        items_processed=len(items_docs),
        decision=action.name,
        decision_reason=assessment.decision_reason,
        assessment=assessment,
    )
