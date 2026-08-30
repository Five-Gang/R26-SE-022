from dataclasses import dataclass
from enum import Enum


# from app.models.learning_context import (  # TODO: rebuild Models 2-5
#     ACTIVE_LEARNING_ACTIVITIES,
#     CONTENT_CONSUMPTION_ACTIVITIES,
#     DEEP_FOCUS_ACTIVITIES,
#     ActivityType,
#     LearningSignal,
#     activity_learning_score,
#     clamp,
#     clamp_signed_unit,
# )

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

ACTIVE_LEARNING_ACTIVITIES = {
    ActivityType.QUIZ,
    ActivityType.PRACTICE,
    ActivityType.FLASHCARD,
    ActivityType.REVISION,
}
CONTENT_CONSUMPTION_ACTIVITIES = {
    ActivityType.VIDEO,
    ActivityType.LECTURE,
    ActivityType.READING,
}
DEEP_FOCUS_ACTIVITIES = {
    ActivityType.QUIZ,
    ActivityType.PRACTICE,
    ActivityType.FLASHCARD,
    ActivityType.REVISION,
}

@dataclass
class LearningSignal:
    valence: float
    arousal: float
    attention: float
    activity_type: ActivityType = ActivityType.QUIZ
    session_active: bool = True
    content_in_focus: bool = True
    blink_rate: float | None = None
    fatigue: float | None = None
    head_tilt_degrees: float | None = None
    signal_confidence: float = 1.0
    source: str = "mock"

def clamp(value, min_val, max_val):
    return max(min_val, min(max_val, value))

def clamp_signed_unit(value):
    return clamp(value, -1.0, 1.0)

def activity_learning_score(activity_type):
    return 0.8  # Placeholder

class ReadinessTier(str, Enum):
    HIGH   = "HIGH"
    MEDIUM = "MEDIUM"
    LOW    = "LOW"

# Weights: attention dominates (are you receptive right now?),
# then valence (mood), then arousal (energy level)
W_ATTENTION, W_VALENCE, W_AROUSAL = 0.5, 0.3, 0.2
MIN_ENGAGEMENT_FOR_RECOMMENDATION = 0.45


@dataclass(frozen=True)
class ReadinessAssessment:
    activity_type: ActivityType
    session_active: bool
    content_in_focus: bool
    is_learning_activity: bool
    should_send_recommendation: bool
    decision_reason: str
    engagement_score: float
    activity_learning_score: float
    effective_valence: float
    effective_arousal: float
    effective_attention: float
    blink_quality: float
    fatigue_penalty: float
    head_alignment: float
    readiness_score: float
    readiness_tier: ReadinessTier
    content_type: str

def compute_readiness(
    valence: float, arousal: float, attention: float
) -> tuple[float, ReadinessTier]:
    v_norm = (valence + 1) / 2       # [-1,1] → [0,1]
    score = float(clamp(
        W_ATTENTION * attention + W_VALENCE * v_norm + W_AROUSAL * arousal,
        0.0, 1.0
    ))
    tier = (ReadinessTier.HIGH   if score >= 0.65 else
            ReadinessTier.MEDIUM if score >= 0.35 else
            ReadinessTier.LOW)
    return score, tier


def _blink_quality(blink_rate: float | None) -> float:
    if blink_rate is None:
        return 0.7
    distance = abs(blink_rate - 16.0)
    return clamp(1.0 - (distance / 20.0), 0.0, 1.0)


def _head_alignment(head_tilt_degrees: float | None) -> float:
    if head_tilt_degrees is None:
        return 0.75
    excess_tilt = max(abs(head_tilt_degrees) - 10.0, 0.0)
    return clamp(1.0 - (excess_tilt / 35.0), 0.0, 1.0)


def select_content_type(readiness_tier: ReadinessTier, activity_type: ActivityType) -> str:
    default_type = CONTENT_TYPE_MAP.get(readiness_tier, "PASSIVE_READING")
    if activity_type in CONTENT_CONSUMPTION_ACTIVITIES:
        return "GUIDED_REVIEW" if readiness_tier is not ReadinessTier.LOW else "PASSIVE_READING"
    return default_type


def assess_learning_readiness(signal: LearningSignal) -> ReadinessAssessment:
    blink_quality = _blink_quality(signal.blink_rate)
    head_alignment = _head_alignment(signal.head_tilt_degrees)
    fatigue_penalty = clamp(signal.fatigue or 0.0, 0.0, 1.0)
    activity_score = activity_learning_score(signal.activity_type)

    effective_attention = clamp(
        signal.attention
        - ((1.0 - blink_quality) * 0.18)
        - ((1.0 - head_alignment) * 0.14)
        - (fatigue_penalty * 0.20)
        + (activity_score * 0.10)
        + (0.05 if signal.content_in_focus else -0.05),
        0.0,
        1.0,
    )
    effective_arousal = clamp(
        signal.arousal
        - (fatigue_penalty * 0.15)
        - ((1.0 - head_alignment) * 0.08)
        + (0.05 if signal.activity_type in DEEP_FOCUS_ACTIVITIES else 0.0),
        0.0,
        1.0,
    )
    effective_valence = clamp_signed_unit(
        signal.valence
        - (fatigue_penalty * 0.25)
        - ((1.0 - blink_quality) * 0.10)
        - ((1.0 - head_alignment) * 0.10)
        + (activity_score * 0.08),
    )

    engagement_score = clamp(
        (effective_attention * 0.40)
        + (activity_score * 0.25)
        + ((1.0 - fatigue_penalty) * 0.15)
        + (blink_quality * 0.10)
        + (head_alignment * 0.10),
        0.0,
        1.0,
    )

    readiness_score, readiness_tier = compute_readiness(
        effective_valence,
        effective_arousal,
        effective_attention,
    )
    is_learning_activity = signal.activity_type in ACTIVE_LEARNING_ACTIVITIES

    if not signal.session_active:
        should_send = False
        reason = "No active learning session detected."
    elif not is_learning_activity:
        should_send = False
        reason = f"Current activity '{signal.activity_type.value}' is not a study task."
    elif engagement_score < MIN_ENGAGEMENT_FOR_RECOMMENDATION:
        should_send = False
        reason = "Engagement is too low to interrupt with a reminder."
    else:
        should_send = True
        reason = "Student is actively engaged in a learning activity."

    return ReadinessAssessment(
        activity_type=signal.activity_type,
        session_active=signal.session_active,
        content_in_focus=signal.content_in_focus,
        is_learning_activity=is_learning_activity,
        should_send_recommendation=should_send,
        decision_reason=reason,
        engagement_score=engagement_score,
        activity_learning_score=activity_score,
        effective_valence=effective_valence,
        effective_arousal=effective_arousal,
        effective_attention=effective_attention,
        blink_quality=blink_quality,
        fatigue_penalty=fatigue_penalty,
        head_alignment=head_alignment,
        readiness_score=readiness_score,
        readiness_tier=readiness_tier,
        content_type=select_content_type(readiness_tier, signal.activity_type),
    )

CONTENT_TYPE_MAP = {
    ReadinessTier.HIGH:   "ACTIVE_RECALL",
    ReadinessTier.MEDIUM: "GUIDED_REVIEW",
    ReadinessTier.LOW:    "PASSIVE_READING",
}
