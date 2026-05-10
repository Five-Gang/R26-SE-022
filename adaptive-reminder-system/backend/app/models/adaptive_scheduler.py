"""
Adaptive Reminder Decision Model (Model 3)

Purpose:
Decides whether to SEND, DELAY, or SKIP a reminder based on:
- Student readiness level (from emotion/readiness model)
- Retention probability (from SM-2 memory model)
- Priority score (from SM-2 priority calculation)

This is a rule-based hybrid decision engine (NOT ML-based yet).
After collecting real interaction history, can evolve into RL.

Architecture:
    Readiness Level + Retention Probability + Priority Score
            ↓
    Adaptive Scheduler
            ↓
    SEND_NOW / DELAY / SKIP
"""


class AdaptiveScheduler:
    """
    Rule-based adaptive reminder decision engine.
    
    Combines readiness, retention, and priority signals to determine
    optimal reminder timing and avoid cognitive overload.
    """
    
    def __init__(self, 
                 send_retention_threshold: float = 0.6,
                 send_priority_threshold: float = 0.5,
                 delay_priority_threshold: float = 0.4):
        """
        Initialize scheduler with decision thresholds.
        
        Args:
            send_retention_threshold: Retention prob below this → more urgent to send
            send_priority_threshold: Priority score above this → good time to send
            delay_priority_threshold: Priority score above this → worth delaying for
        """
        self.send_retention_threshold = send_retention_threshold
        self.send_priority_threshold = send_priority_threshold
        self.delay_priority_threshold = delay_priority_threshold
    
    def decide_reminder_action(
        self,
        readiness_level: str,
        retention_probability: float,
        priority_score: float,
    ) -> str:
        """
        Decide reminder action based on student state.
        
        Args:
            readiness_level: "HIGH", "MEDIUM", or "LOW"
            retention_probability: 0.0-1.0 (from SM-2 model)
            priority_score: 0.0+ (from SM-2 priority calculation)
        
        Returns:
            "SEND_NOW" - Send reminder immediately
            "DELAY" - Hold reminder, check later
            "SKIP" - Skip this reminder cycle
        """
        readiness_level = readiness_level.upper() if readiness_level else "MEDIUM"
        
        # SEND_NOW: Perfect reminder moment
        # Student is ready + content about to be forgotten + item is important
        if (
            readiness_level == "HIGH"
            and retention_probability < self.send_retention_threshold
            and priority_score >= self.send_priority_threshold
        ):
            return "SEND_NOW"
        
        # DELAY: Not urgent enough yet, but keep monitoring
        # Either student is medium readiness OR item importance is moderate
        if (
            readiness_level == "MEDIUM"
            and priority_score >= self.delay_priority_threshold
        ):
            return "DELAY"
        
        # SKIP: Avoid annoying the student
        # Student is not ready to study right now
        if readiness_level == "LOW":
            return "SKIP"
        
        # Fallback: Default to DELAY (conservative strategy)
        return "DELAY"
    
    def get_explanation(
        self,
        readiness_level: str,
        retention_probability: float,
        priority_score: float,
    ) -> dict:
        """
        Get decision + reasoning for why action was chosen.
        Useful for debugging and UI explanations.
        
        Args:
            readiness_level: "HIGH", "MEDIUM", or "LOW"
            retention_probability: 0.0-1.0
            priority_score: 0.0+
        
        Returns:
            dict with action, reasoning, and signal breakdown
        """
        action = self.decide_reminder_action(
            readiness_level, retention_probability, priority_score
        )
        
        readiness_level = readiness_level.upper() if readiness_level else "MEDIUM"
        
        # Build reasoning
        reasons = []
        
        if readiness_level == "HIGH":
            reasons.append("✓ Student is mentally ready (HIGH readiness)")
        elif readiness_level == "MEDIUM":
            reasons.append("~ Student is moderately ready (MEDIUM readiness)")
        else:
            reasons.append("✗ Student is not ready (LOW readiness)")
        
        if retention_probability < 0.4:
            reasons.append("⚠ Content at HIGH risk of being forgotten (retention < 40%)")
        elif retention_probability < 0.6:
            reasons.append("⚠ Content at MODERATE risk of being forgotten (retention < 60%)")
        else:
            reasons.append("✓ Content still well remembered (retention ≥ 60%)")
        
        if priority_score >= self.send_priority_threshold:
            reasons.append("★ Item is HIGH priority")
        elif priority_score >= self.delay_priority_threshold:
            reasons.append("◆ Item is MODERATE priority")
        else:
            reasons.append("○ Item is LOW priority")
        
        return {
            "action": action,
            "readiness_level": readiness_level,
            "retention_probability": retention_probability,
            "priority_score": priority_score,
            "reasons": reasons,
        }
