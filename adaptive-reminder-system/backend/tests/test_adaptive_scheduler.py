"""
Comprehensive tests for Adaptive Scheduler (Model 3)
"""

import unittest
from app.models.adaptive_scheduler import AdaptiveScheduler


class TestAdaptiveSchedulerInit(unittest.TestCase):
    """Test scheduler initialization."""
    
    def test_default_thresholds(self):
        scheduler = AdaptiveScheduler()
        self.assertEqual(scheduler.send_retention_threshold, 0.6)
        self.assertEqual(scheduler.send_priority_threshold, 0.5)
        self.assertEqual(scheduler.delay_priority_threshold, 0.4)
    
    def test_custom_thresholds(self):
        scheduler = AdaptiveScheduler(
            send_retention_threshold=0.5,
            send_priority_threshold=0.4,
            delay_priority_threshold=0.3,
        )
        self.assertEqual(scheduler.send_retention_threshold, 0.5)
        self.assertEqual(scheduler.send_priority_threshold, 0.4)
        self.assertEqual(scheduler.delay_priority_threshold, 0.3)


class TestSendNowDecision(unittest.TestCase):
    """Test SEND_NOW decision scenarios."""
    
    def setUp(self):
        self.scheduler = AdaptiveScheduler()
    
    def test_perfect_send_moment(self):
        """High readiness + low retention + high priority = SEND NOW"""
        action = self.scheduler.decide_reminder_action(
            readiness_level="HIGH",
            retention_probability=0.42,
            priority_score=0.71,
        )
        self.assertEqual(action, "SEND_NOW")
    
    def test_send_with_very_low_retention(self):
        """Even lower retention should trigger SEND NOW"""
        action = self.scheduler.decide_reminder_action(
            readiness_level="HIGH",
            retention_probability=0.10,
            priority_score=0.5,
        )
        self.assertEqual(action, "SEND_NOW")
    
    def test_send_with_high_priority(self):
        """High priority + good conditions"""
        action = self.scheduler.decide_reminder_action(
            readiness_level="HIGH",
            retention_probability=0.3,
            priority_score=0.95,
        )
        self.assertEqual(action, "SEND_NOW")
    
    def test_send_boundary_retention(self):
        """Retention just below threshold"""
        action = self.scheduler.decide_reminder_action(
            readiness_level="HIGH",
            retention_probability=0.59,
            priority_score=0.5,
        )
        self.assertEqual(action, "SEND_NOW")
    
    def test_send_boundary_priority(self):
        """Priority exactly at threshold"""
        action = self.scheduler.decide_reminder_action(
            readiness_level="HIGH",
            retention_probability=0.5,
            priority_score=0.50,
        )
        self.assertEqual(action, "SEND_NOW")
    
    def test_no_send_if_retention_too_high(self):
        """High readiness + retention HIGH = not urgent"""
        action = self.scheduler.decide_reminder_action(
            readiness_level="HIGH",
            retention_probability=0.95,
            priority_score=0.71,
        )
        self.assertNotEqual(action, "SEND_NOW")
    
    def test_no_send_if_priority_too_low(self):
        """High readiness + low priority = DELAY not SEND"""
        action = self.scheduler.decide_reminder_action(
            readiness_level="HIGH",
            retention_probability=0.3,
            priority_score=0.49,
        )
        self.assertNotEqual(action, "SEND_NOW")
    
    def test_no_send_if_readiness_not_high(self):
        """Even with perfect retention/priority, need HIGH readiness"""
        action = self.scheduler.decide_reminder_action(
            readiness_level="MEDIUM",
            retention_probability=0.2,
            priority_score=0.9,
        )
        self.assertNotEqual(action, "SEND_NOW")


class TestDelayDecision(unittest.TestCase):
    """Test DELAY decision scenarios."""
    
    def setUp(self):
        self.scheduler = AdaptiveScheduler()
    
    def test_delay_medium_readiness(self):
        """Medium readiness + moderate priority = DELAY"""
        action = self.scheduler.decide_reminder_action(
            readiness_level="MEDIUM",
            retention_probability=0.5,
            priority_score=0.45,
        )
        self.assertEqual(action, "DELAY")
    
    def test_delay_high_readiness_low_priority(self):
        """High readiness but low priority = DELAY"""
        action = self.scheduler.decide_reminder_action(
            readiness_level="HIGH",
            retention_probability=0.8,
            priority_score=0.3,
        )
        self.assertEqual(action, "DELAY")
    
    def test_delay_medium_readiness_high_priority(self):
        """Medium readiness + high priority = DELAY (check later)"""
        action = self.scheduler.decide_reminder_action(
            readiness_level="MEDIUM",
            retention_probability=0.3,
            priority_score=0.8,
        )
        self.assertEqual(action, "DELAY")
    
    def test_delay_boundary_priority(self):
        """Priority exactly at delay threshold"""
        action = self.scheduler.decide_reminder_action(
            readiness_level="MEDIUM",
            retention_probability=0.5,
            priority_score=0.40,
        )
        self.assertEqual(action, "DELAY")
    
    def test_delay_high_retention_medium_readiness(self):
        """Even with high retention, medium readiness = DELAY"""
        action = self.scheduler.decide_reminder_action(
            readiness_level="MEDIUM",
            retention_probability=0.95,
            priority_score=0.5,
        )
        self.assertEqual(action, "DELAY")


class TestSkipDecision(unittest.TestCase):
    """Test SKIP decision scenarios."""
    
    def setUp(self):
        self.scheduler = AdaptiveScheduler()
    
    def test_skip_low_readiness(self):
        """Low readiness always = SKIP"""
        action = self.scheduler.decide_reminder_action(
            readiness_level="LOW",
            retention_probability=0.1,
            priority_score=0.95,
        )
        self.assertEqual(action, "SKIP")
    
    def test_skip_low_readiness_high_urgency(self):
        """Even high urgency can't override low readiness"""
        action = self.scheduler.decide_reminder_action(
            readiness_level="LOW",
            retention_probability=0.05,
            priority_score=1.0,
        )
        self.assertEqual(action, "SKIP")
    
    def test_skip_low_readiness_various_states(self):
        """Low readiness with various retention/priority combinations"""
        for retention in [0.1, 0.5, 0.9]:
            for priority in [0.1, 0.5, 0.9]:
                action = self.scheduler.decide_reminder_action(
                    readiness_level="LOW",
                    retention_probability=retention,
                    priority_score=priority,
                )
                self.assertEqual(action, "SKIP")


class TestCaseInsensitivity(unittest.TestCase):
    """Test readiness level case handling."""
    
    def setUp(self):
        self.scheduler = AdaptiveScheduler()
    
    def test_lowercase_high(self):
        action = self.scheduler.decide_reminder_action(
            readiness_level="high",
            retention_probability=0.3,
            priority_score=0.6,
        )
        self.assertEqual(action, "SEND_NOW")
    
    def test_mixed_case_medium(self):
        action = self.scheduler.decide_reminder_action(
            readiness_level="MeDiUm",
            retention_probability=0.5,
            priority_score=0.5,
        )
        self.assertEqual(action, "DELAY")
    
    def test_none_readiness_defaults_to_medium(self):
        action = self.scheduler.decide_reminder_action(
            readiness_level=None,
            retention_probability=0.5,
            priority_score=0.5,
        )
        self.assertEqual(action, "DELAY")


class TestExplanation(unittest.TestCase):
    """Test explanation generation."""
    
    def setUp(self):
        self.scheduler = AdaptiveScheduler()
    
    def test_explanation_structure(self):
        result = self.scheduler.get_explanation(
            readiness_level="HIGH",
            retention_probability=0.3,
            priority_score=0.7,
        )
        
        self.assertIn("action", result)
        self.assertIn("readiness_level", result)
        self.assertIn("retention_probability", result)
        self.assertIn("priority_score", result)
        self.assertIn("reasons", result)
        
        self.assertEqual(result["action"], "SEND_NOW")
        self.assertIsInstance(result["reasons"], list)
        self.assertGreater(len(result["reasons"]), 0)
    
    def test_explanation_high_readiness(self):
        result = self.scheduler.get_explanation(
            readiness_level="HIGH",
            retention_probability=0.5,
            priority_score=0.6,
        )
        
        reason_text = " ".join(result["reasons"])
        self.assertIn("mentally ready", reason_text.lower())
    
    def test_explanation_medium_readiness(self):
        result = self.scheduler.get_explanation(
            readiness_level="MEDIUM",
            retention_probability=0.5,
            priority_score=0.5,
        )
        
        reason_text = " ".join(result["reasons"])
        self.assertIn("moderately", reason_text.lower())
    
    def test_explanation_low_readiness(self):
        result = self.scheduler.get_explanation(
            readiness_level="LOW",
            retention_probability=0.5,
            priority_score=0.5,
        )
        
        reason_text = " ".join(result["reasons"])
        self.assertIn("not ready", reason_text.lower())
    
    def test_explanation_high_retention_risk(self):
        result = self.scheduler.get_explanation(
            readiness_level="HIGH",
            retention_probability=0.2,
            priority_score=0.6,
        )
        
        reason_text = " ".join(result["reasons"])
        self.assertIn("high risk", reason_text.lower())
    
    def test_explanation_moderate_retention_risk(self):
        result = self.scheduler.get_explanation(
            readiness_level="HIGH",
            retention_probability=0.5,
            priority_score=0.6,
        )
        
        reason_text = " ".join(result["reasons"])
        self.assertIn("moderate", reason_text.lower())
    
    def test_explanation_high_priority(self):
        result = self.scheduler.get_explanation(
            readiness_level="HIGH",
            retention_probability=0.5,
            priority_score=0.7,
        )
        
        reason_text = " ".join(result["reasons"])
        self.assertIn("high priority", reason_text.lower())
    
    def test_explanation_low_priority(self):
        result = self.scheduler.get_explanation(
            readiness_level="HIGH",
            retention_probability=0.5,
            priority_score=0.2,
        )
        
        reason_text = " ".join(result["reasons"])
        self.assertIn("low priority", reason_text.lower())


class TestRealWorldScenarios(unittest.TestCase):
    """Test realistic student scheduling scenarios."""
    
    def setUp(self):
        self.scheduler = AdaptiveScheduler()
    
    def test_scenario_student_energized_forgets_topic(self):
        """Student is ready + starting to forget important topic"""
        action = self.scheduler.decide_reminder_action(
            readiness_level="HIGH",
            retention_probability=0.35,
            priority_score=0.65,
        )
        self.assertEqual(action, "SEND_NOW")
    
    def test_scenario_student_tired_low_priority(self):
        """Student is tired + low priority item"""
        action = self.scheduler.decide_reminder_action(
            readiness_level="LOW",
            retention_probability=0.9,
            priority_score=0.2,
        )
        self.assertEqual(action, "SKIP")
    
    def test_scenario_student_neutral_moderate_priority(self):
        """Student is neutral mood + moderate priority"""
        action = self.scheduler.decide_reminder_action(
            readiness_level="MEDIUM",
            retention_probability=0.6,
            priority_score=0.5,
        )
        self.assertEqual(action, "DELAY")
    
    def test_scenario_student_ready_not_forgetting_yet(self):
        """Student is ready but content still well-remembered"""
        action = self.scheduler.decide_reminder_action(
            readiness_level="HIGH",
            retention_probability=0.92,
            priority_score=0.6,
        )
        self.assertEqual(action, "DELAY")
    
    def test_scenario_critical_content_student_medium_energy(self):
        """Critical content but student has medium energy"""
        action = self.scheduler.decide_reminder_action(
            readiness_level="MEDIUM",
            retention_probability=0.25,
            priority_score=0.95,
        )
        self.assertEqual(action, "DELAY")


if __name__ == "__main__":
    unittest.main()
