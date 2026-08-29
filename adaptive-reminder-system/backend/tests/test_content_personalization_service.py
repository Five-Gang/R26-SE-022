"""Tests for Model 4: Reminder Content Personalization."""

import unittest
from app.services.content_personalization_service import ContentPersonalizationService


class TestContentPersonalizationService(unittest.TestCase):
    def setUp(self):
        self.service = ContentPersonalizationService()

    def test_low_readiness_returns_break(self):
        result = self.service.recommend_activity(
            readiness_level="LOW",
            retention_probability=0.2,
            priority_percentage=90,
            difficulty_level="hard",
        )
        self.assertEqual(result["activity"], "Break / Rest")

    def test_high_readiness_high_priority_returns_active_recall(self):
        result = self.service.recommend_activity(
            readiness_level="High",
            retention_probability=0.42,
            priority_percentage=69,
            difficulty_level="Hard",
        )
        self.assertEqual(result["activity"], "Active Recall")

    def test_medium_readiness_medium_priority_returns_guided_review(self):
        result = self.service.recommend_activity(
            readiness_level="MEDIUM",
            retention_probability=0.6,
            priority_percentage=45,
            difficulty_level="medium",
        )
        self.assertEqual(result["activity"], "Guided Review")

    def test_low_retention_hard_topic_returns_guided_review(self):
        result = self.service.recommend_activity(
            readiness_level="HIGH",
            retention_probability=0.2,
            priority_percentage=30,
            difficulty_level="hard",
        )
        self.assertEqual(result["activity"], "Guided Review")

    def test_default_returns_passive_reading(self):
        result = self.service.recommend_activity(
            readiness_level="HIGH",
            retention_probability=0.8,
            priority_percentage=20,
            difficulty_level="easy",
        )
        self.assertEqual(result["activity"], "Passive Reading")


if __name__ == "__main__":
    unittest.main()
