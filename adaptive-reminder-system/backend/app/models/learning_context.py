from dataclasses import dataclass
from enum import Enum
from typing import Any, Mapping, Optional


class ActivityType(str, Enum):
    QUIZ = "QUIZ"
    PRACTICE = "PRACTICE"
    FLASHCARD = "FLASHCARD"
    VIDEO = "VIDEO"
    READING = "READING"
    LECTURE = "LECTURE"
    REVISION = "REVISION"
    IDLE = "IDLE"
    UNKNOWN = "UNKNOWN"


@dataclass
class LearningSignal:
    valence: float
    arousal: float
    attention: float
    activity_type: ActivityType = ActivityType.QUIZ
    session_active: bool = True
    content_in_focus: bool = True
    blink_rate: Optional[float] = None
    fatigue: Optional[float] = None
    head_tilt_degrees: Optional[float] = None
    signal_confidence: float = 1.0
    source: str = "mock"


def _first(payload: Mapping[str, Any], *keys: str, default: Any = None) -> Any:
    for key in keys:
        if key in payload and payload[key] is not None:
            return payload[key]
    return default


def _nested(payload: Mapping[str, Any], group: str, *keys: str, default: Any = None) -> Any:
    nested = payload.get(group)
    if isinstance(nested, Mapping):
        return _first(nested, *keys, default=default)
    return default


def _activity(value: Any, default: ActivityType) -> ActivityType:
    text = str(value or "").strip().upper()
    aliases = {
        "WATCHING LECTURE": ActivityType.LECTURE,
        "WATCHING_VIDEO": ActivityType.VIDEO,
        "WATCHING VIDEO": ActivityType.VIDEO,
        "READING": ActivityType.READING,
        "STUDYING": ActivityType.REVISION,
    }
    if text in aliases:
        return aliases[text]
    try:
        return ActivityType(text)
    except ValueError:
        return default


def signal_from_payload(
    payload: Mapping[str, Any],
    *,
    source: str = "unknown",
    default_activity: ActivityType = ActivityType.UNKNOWN,
    default_session_active: bool = False,
    default_content_in_focus: bool = False,
) -> LearningSignal:
    return LearningSignal(
        valence=float(_first(payload, "valence", default=_nested(payload, "emotion", "valence", default=0.0))),
        arousal=float(_first(payload, "arousal", default=_nested(payload, "emotion", "arousal", default=0.0))),
        attention=float(_first(payload, "attention", default=_nested(payload, "emotion", "attention", default=0.0))),
        activity_type=_activity(
            _first(payload, "activity_type", "activity", default=_nested(payload, "context", "activity_label")),
            default_activity,
        ),
        session_active=bool(
            _first(payload, "session_active", default=_nested(payload, "context", "is_learning_session", default=default_session_active))
        ),
        content_in_focus=bool(
            _first(payload, "content_in_focus", default=_nested(payload, "context", "window_in_focus", default=default_content_in_focus))
        ),
        blink_rate=float(_first(payload, "blink_rate", default=_nested(payload, "cues", "blinkRate"))) if _first(payload, "blink_rate", default=_nested(payload, "cues", "blinkRate")) is not None else None,
        fatigue=float(_first(payload, "fatigue", default=_nested(payload, "cues", "fatigue_score"))) if _first(payload, "fatigue", default=_nested(payload, "cues", "fatigue_score")) is not None else None,
        head_tilt_degrees=float(_first(payload, "head_tilt_degrees", default=_nested(payload, "cues", "headTilt"))) if _first(payload, "head_tilt_degrees", default=_nested(payload, "cues", "headTilt")) is not None else None,
        signal_confidence=float(_first(payload, "confidence", "signal_confidence", default=1.0)),
        source=source,
    )
