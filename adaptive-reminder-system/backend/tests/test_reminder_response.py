from datetime import datetime, timezone

from app.api.routes.reminders import _reminder_response


def test_reminder_response_normalizes_legacy_values():
    response = _reminder_response(
        {
            "_id": "legacy-reminder",
            "item_key": "item-1",
            "item_title": None,
            "content_type": None,
            "readiness_score": None,
            "retention_probability": "invalid",
            "week_number": "not-a-number",
            "sent_at": "not-a-date",
            "scheduled_at": datetime(2026, 11, 3),
            "status": None,
        },
        {
            "item-1": {
                "title": "Legacy item",
                "moduleId": "module-1",
                "subject": "Revision",
                "difficulty": "hard",
            }
        },
    )

    assert response.item_title == "Legacy item"
    assert response.content_type == "GUIDED_REVIEW"
    assert response.module_id == "module-1"
    assert response.topic == "Revision"
    assert response.difficulty_level == "hard"
    assert response.readiness_score == 0.0
    assert response.retention_probability == 0.0
    assert response.week_number is None
    assert response.sent_at is None
    assert response.status == "SCHEDULED"
    assert response.scheduled_at.tzinfo == timezone.utc
