from app.services.signal_control import signal_control_store


def setup_function():
    signal_control_store.clear_all()


def test_set_get_and_clear_manual_override():
    payload = {
        "valence": 0.25,
        "arousal": 0.61,
        "attention": 0.83,
        "activity_type": "QUIZ",
        "session_active": True,
        "content_in_focus": True,
        "blink_rate": 13.5,
        "fatigue": 0.22,
        "head_tilt_degrees": 5.0,
        "confidence": 0.95,
    }

    signal_control_store.set_override("stu-test", payload)

    assert signal_control_store.has_override("stu-test") is True
    saved_payload = signal_control_store.get_override_payload("stu-test")
    saved_signal = signal_control_store.get_override_signal("stu-test")

    assert saved_payload == payload
    assert saved_signal is not None
    assert saved_signal.activity_type.value == "QUIZ"
    assert saved_signal.session_active is True
    assert saved_signal.source == "manual-override"

    signal_control_store.clear_override("stu-test")

    assert signal_control_store.has_override("stu-test") is False
    assert signal_control_store.get_override_payload("stu-test") is None
