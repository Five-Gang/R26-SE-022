from __future__ import annotations

from copy import deepcopy
from typing import Any

from app.models.learning_context import ActivityType, LearningSignal, signal_from_payload


class SignalControlStore:
    """In-memory manual override store for pre-integration testing."""

    def __init__(self) -> None:
        self._overrides: dict[str, dict[str, Any]] = {}

    def set_override(self, student_id: str, payload: dict[str, Any]) -> LearningSignal:
        stored_payload = deepcopy(payload)
        self._overrides[student_id] = stored_payload
        return self.get_override_signal(student_id)

    def get_override_payload(self, student_id: str) -> dict[str, Any] | None:
        payload = self._overrides.get(student_id)
        if payload is None:
            return None
        return deepcopy(payload)

    def get_override_signal(self, student_id: str) -> LearningSignal | None:
        payload = self._overrides.get(student_id)
        if payload is None:
            return None
        return signal_from_payload(
            payload,
            source="manual-override",
            default_activity=ActivityType.UNKNOWN,
            default_session_active=False,
            default_content_in_focus=False,
        )

    def clear_override(self, student_id: str) -> None:
        self._overrides.pop(student_id, None)

    def has_override(self, student_id: str) -> bool:
        return student_id in self._overrides

    def clear_all(self) -> None:
        self._overrides.clear()


signal_control_store = SignalControlStore()
