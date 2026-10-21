from typing import Any, Optional

from app.models.learning_context import ActivityType, LearningSignal, signal_from_payload


class SignalControlStore:
    def __init__(self) -> None:
        self._payloads: dict[str, dict[str, Any]] = {}
        self._signals: dict[str, LearningSignal] = {}

    def set_override(self, student_id: str, payload: dict[str, Any]) -> LearningSignal:
        signal = signal_from_payload(
            payload,
            source="manual-override",
            default_activity=ActivityType.QUIZ,
            default_session_active=True,
            default_content_in_focus=True,
        )
        self._payloads[student_id] = payload.copy()
        self._signals[student_id] = signal
        return signal

    def get_override_payload(self, student_id: str) -> Optional[dict[str, Any]]:
        payload = self._payloads.get(student_id)
        return payload.copy() if payload is not None else None

    def get_override_signal(self, student_id: str) -> Optional[LearningSignal]:
        return self._signals.get(student_id)

    def has_override(self, student_id: str) -> bool:
        return student_id in self._signals

    def clear_override(self, student_id: str) -> None:
        self._payloads.pop(student_id, None)
        self._signals.pop(student_id, None)

    def clear_all(self) -> None:
        self._payloads.clear()
        self._signals.clear()


signal_control_store = SignalControlStore()
