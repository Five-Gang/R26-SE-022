from app.models.learning_context import ActivityType, LearningSignal
from app.models.readiness_fusion import assess_learning_readiness


class TestReadinessFusion:
    def test_idle_context_blocks_recommendation(self):
        signal = LearningSignal(
            valence=0.4,
            arousal=0.6,
            attention=0.85,
            activity_type=ActivityType.IDLE,
            session_active=False,
            content_in_focus=False,
            fatigue=0.1,
        )

        assessment = assess_learning_readiness(signal)

        assert assessment.should_send_recommendation is False
        assert "No active learning session" in assessment.decision_reason

    def test_quiz_session_can_send_active_recall(self):
        signal = LearningSignal(
            valence=0.45,
            arousal=0.7,
            attention=0.9,
            activity_type=ActivityType.QUIZ,
            session_active=True,
            content_in_focus=True,
            blink_rate=15.0,
            fatigue=0.1,
            head_tilt_degrees=4.0,
        )

        assessment = assess_learning_readiness(signal)

        assert assessment.should_send_recommendation is True
        assert assessment.content_type == "ACTIVE_RECALL"
        assert assessment.readiness_score >= 0.65

    def test_fatigue_and_pose_cues_reduce_effective_attention(self):
        baseline = LearningSignal(
            valence=0.3,
            arousal=0.65,
            attention=0.82,
            activity_type=ActivityType.REVISION,
            session_active=True,
            content_in_focus=True,
            blink_rate=15.0,
            fatigue=0.1,
            head_tilt_degrees=5.0,
        )
        stressed = LearningSignal(
            valence=0.3,
            arousal=0.65,
            attention=0.82,
            activity_type=ActivityType.REVISION,
            session_active=True,
            content_in_focus=True,
            blink_rate=36.0,
            fatigue=0.85,
            head_tilt_degrees=38.0,
        )

        baseline_assessment = assess_learning_readiness(baseline)
        stressed_assessment = assess_learning_readiness(stressed)

        assert stressed_assessment.effective_attention < baseline_assessment.effective_attention
        assert stressed_assessment.readiness_score < baseline_assessment.readiness_score

    def test_lecture_session_caps_content_type(self):
        signal = LearningSignal(
            valence=0.4,
            arousal=0.68,
            attention=0.88,
            activity_type=ActivityType.LECTURE,
            session_active=True,
            content_in_focus=True,
            blink_rate=16.0,
            fatigue=0.1,
            head_tilt_degrees=3.0,
        )

        assessment = assess_learning_readiness(signal)

        assert assessment.should_send_recommendation is True
        assert assessment.content_type == "GUIDED_REVIEW"
