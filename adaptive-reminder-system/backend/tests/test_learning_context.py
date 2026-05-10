from app.models.learning_context import ActivityType, signal_from_payload


def test_signal_from_payload_supports_nested_aliases():
    signal = signal_from_payload(
        {
            "emotion": {
                "valence": 0.35,
                "arousal": 0.62,
                "attention": 0.81,
            },
            "cues": {
                "blinkRate": 18,
                "fatigue_score": 0.4,
                "headTilt": 12,
            },
            "context": {
                "activity_label": "watching lecture",
                "is_learning_session": True,
                "window_in_focus": True,
            },
            "confidence": 0.88,
        },
        source="http",
    )

    assert signal.activity_type is ActivityType.LECTURE
    assert signal.session_active is True
    assert signal.content_in_focus is True
    assert signal.blink_rate == 18.0
    assert signal.fatigue == 0.4
    assert signal.head_tilt_degrees == 12.0
    assert signal.signal_confidence == 0.88
