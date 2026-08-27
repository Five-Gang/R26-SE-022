from typing import Any


SUPPORTED_EMOTIONS = frozenset({
    "Focused",
    "Neutral",
    "Confused",
    "Frustrated",
    "Bored",
})


def normalize_emotion(value: str) -> str:
    """Normalize Mihiraj's emotion label to the readiness model contract."""
    normalized = str(value or "").strip().lower()
    for emotion in SUPPORTED_EMOTIONS:
        if emotion.lower() == normalized:
            return emotion
    raise ValueError(
        f"Unsupported emotion '{value}'. Expected one of: "
        f"{', '.join(sorted(SUPPORTED_EMOTIONS))}"
    )


def emotion_from_detection_response(payload: dict[str, Any]) -> str:
    """Extract and normalize the emotion from Mihiraj's detection response."""
    if not isinstance(payload, dict):
        raise ValueError("Emotion detection response must be an object")
    return normalize_emotion(payload.get("emotion"))