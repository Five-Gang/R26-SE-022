from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any


class ActivityType(str, Enum):
    QUIZ = "QUIZ"
    PRACTICE = "PRACTICE"
    FLASHCARD = "FLASHCARD"
    ASSIGNMENT = "ASSIGNMENT"
    VIDEO = "VIDEO"
    LECTURE = "LECTURE"
    READING = "READING"
    REVISION = "REVISION"
    IDLE = "IDLE"
    BREAK = "BREAK"
    DISTRACTED = "DISTRACTED"
    UNKNOWN = "UNKNOWN"


ACTIVE_LEARNING_ACTIVITIES = {
    ActivityType.QUIZ,
    ActivityType.PRACTICE,
    ActivityType.FLASHCARD,
    ActivityType.ASSIGNMENT,
    ActivityType.VIDEO,
    ActivityType.LECTURE,
    ActivityType.READING,
    ActivityType.REVISION,
}

DEEP_FOCUS_ACTIVITIES = {
    ActivityType.QUIZ,
    ActivityType.PRACTICE,
    ActivityType.FLASHCARD,
    ActivityType.ASSIGNMENT,
    ActivityType.REVISION,
}

CONTENT_CONSUMPTION_ACTIVITIES = {
    ActivityType.VIDEO,
    ActivityType.LECTURE,
    ActivityType.READING,
}


@dataclass(frozen=True)
class LearningSignal:
    valence: float
    arousal: float
    attention: float
    activity_type: ActivityType = ActivityType.UNKNOWN
    session_active: bool = False
    content_in_focus: bool = False
    blink_rate: float | None = None
    fatigue: float | None = None
    head_tilt_degrees: float | None = None
    signal_confidence: float = 0.0
    source: str = "unknown"
    captured_at: datetime | None = None
    raw_payload: dict[str, Any] = field(default_factory=dict)


def clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(upper, value))


def clamp_signed_unit(value: float) -> float:
    return clamp(value, -1.0, 1.0)


def activity_learning_score(activity_type: ActivityType) -> float:
    return {
        ActivityType.QUIZ: 1.0,
        ActivityType.PRACTICE: 1.0,
        ActivityType.FLASHCARD: 0.95,
        ActivityType.ASSIGNMENT: 0.9,
        ActivityType.REVISION: 0.85,
        ActivityType.VIDEO: 0.75,
        ActivityType.LECTURE: 0.75,
        ActivityType.READING: 0.7,
        ActivityType.IDLE: 0.0,
        ActivityType.BREAK: 0.0,
        ActivityType.DISTRACTED: 0.0,
        ActivityType.UNKNOWN: 0.0,
    }[activity_type]


def flatten_signal_payload(payload: dict[str, Any]) -> dict[str, Any]:
    merged = dict(payload)
    for key in ("emotion", "engagement", "cues", "context", "signals", "features"):
        nested = payload.get(key)
        if isinstance(nested, dict):
            for nested_key, nested_value in nested.items():
                merged.setdefault(nested_key, nested_value)
    return merged


def _lookup(payload: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        if key in payload and payload[key] is not None:
            return payload[key]
    return None


def _coerce_float(value: Any, default: float | None = None) -> float | None:
    if value is None:
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _coerce_bool(value: Any, default: bool = False) -> bool:
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "y", "active", "focused"}
    return default


def coerce_activity_type(value: Any) -> ActivityType:
    if value is None:
        return ActivityType.UNKNOWN

    normalized = str(value).strip().replace("-", "_").replace(" ", "_").upper()
    aliases = {
        "ACTIVE_RECALL": ActivityType.FLASHCARD,
        "FLASHCARDS": ActivityType.FLASHCARD,
        "WATCHING_VIDEO": ActivityType.VIDEO,
        "WATCHING_LECTURE": ActivityType.LECTURE,
        "LECTURE_VIDEO": ActivityType.LECTURE,
        "LECTURE_MATERIAL": ActivityType.LECTURE,
        "READING_MATERIAL": ActivityType.READING,
        "STUDYING": ActivityType.REVISION,
        "STUDY_SESSION": ActivityType.REVISION,
    }
    normalized = aliases.get(normalized, normalized)

    try:
        return ActivityType(normalized)
    except ValueError:
        return ActivityType.UNKNOWN


def signal_from_payload(
    payload: dict[str, Any],
    *,
    source: str,
    default_activity: ActivityType = ActivityType.UNKNOWN,
    default_session_active: bool = False,
    default_content_in_focus: bool = False,
) -> LearningSignal:
    flattened = flatten_signal_payload(payload)

    activity_type = coerce_activity_type(
        _lookup(
            flattened,
            "activity_type",
            "activity",
            "study_activity",
            "activity_label",
            "content_type",
        )
    )
    if activity_type is ActivityType.UNKNOWN:
        activity_type = default_activity

    session_active = _coerce_bool(
        _lookup(
            flattened,
            "session_active",
            "study_session_active",
            "is_learning_session",
            "is_studying",
        ),
        default=default_session_active,
    )
    content_in_focus = _coerce_bool(
        _lookup(
            flattened,
            "content_in_focus",
            "window_in_focus",
            "learning_window_focused",
            "tab_focused",
        ),
        default=default_content_in_focus or session_active,
    )

    return LearningSignal(
        valence=clamp_signed_unit(
            _coerce_float(_lookup(flattened, "valence"), default=0.3) or 0.3
        ),
        arousal=clamp(
            _coerce_float(_lookup(flattened, "arousal"), default=0.5) or 0.5,
            0.0,
            1.0,
        ),
        attention=clamp(
            _coerce_float(_lookup(flattened, "attention"), default=0.7) or 0.7,
            0.0,
            1.0,
        ),
        activity_type=activity_type,
        session_active=session_active,
        content_in_focus=content_in_focus,
        blink_rate=_coerce_float(
            _lookup(flattened, "blink_rate", "blinkRate", "blink_rate_per_min")
        ),
        fatigue=clamp(
            _coerce_float(_lookup(flattened, "fatigue", "fatigue_score"), default=0.0)
            or 0.0,
            0.0,
            1.0,
        ),
        head_tilt_degrees=_coerce_float(
            _lookup(flattened, "head_tilt", "head_tilt_degrees", "headTilt")
        ),
        signal_confidence=clamp(
            _coerce_float(_lookup(flattened, "confidence", "signal_confidence"), default=0.0)
            or 0.0,
            0.0,
            1.0,
        ),
        source=source,
        raw_payload=payload,
    )
