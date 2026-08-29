class ContentPersonalizationService:
    """Model 4: rule-based recommendation of study activity type."""

    def recommend_activity(
        self,
        readiness_level,
        retention_probability,
        priority_percentage,
        difficulty_level,
    ):
        readiness = str(readiness_level or "").lower()
        difficulty = str(difficulty_level or "").lower()

        if readiness == "low":
            return {
                "activity": "Break / Rest",
                "reason": "Student readiness is low, so a reminder may increase cognitive fatigue.",
            }

        if readiness == "high" and priority_percentage >= 60:
            return {
                "activity": "Active Recall",
                "reason": "Student is ready and the item has high priority, so active recall is suitable.",
            }

        if readiness == "medium" and priority_percentage >= 40:
            return {
                "activity": "Guided Review",
                "reason": "Student has moderate readiness, so guided review reduces cognitive load.",
            }

        if retention_probability < 0.4 and difficulty == "hard":
            return {
                "activity": "Guided Review",
                "reason": "The topic is difficult and retention is low, so guided review is safer before active recall.",
            }

        return {
            "activity": "Passive Reading",
            "reason": "The item is not urgent, so light review is sufficient.",
        }
