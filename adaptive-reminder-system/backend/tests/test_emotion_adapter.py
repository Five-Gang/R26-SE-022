import pytest

from app.services.emotion_adapter import emotion_from_detection_response, normalize_emotion


@pytest.mark.parametrize("value", ["Focused", "focused", "NEUTRAL", "Confused", "frustrated", "Bored"])
def test_normalize_supported_emotions(value):
    assert normalize_emotion(value) in {"Focused", "Neutral", "Confused", "Frustrated", "Bored"}


def test_extracts_mihiraj_detection_response():
    assert emotion_from_detection_response({"emotion": "Focused", "attentionScore": 95}) == "Focused"


def test_rejects_unknown_emotion():
    with pytest.raises(ValueError, match="Unsupported emotion"):
        normalize_emotion("Happy")