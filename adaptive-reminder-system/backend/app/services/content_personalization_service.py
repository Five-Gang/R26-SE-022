from typing import Optional
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

    def generate_adaptive_intervention(
        self,
        emotion: str,
        readiness_level: str,
        focus_score: float = 50.0,
        time_of_day: Optional[str] = None,
        duration_seconds: int = 0,
    ) -> dict:
        """
        Generates a context-aware intervention message and recommendation
        based on real-time affective state and cognitive readiness.
        """
        em = (emotion or "").strip().capitalize()
        readiness = str(readiness_level or "").upper()

        if em == "Frustrated":
            return {
                "intervention_required": True,
                "activity": "Break / Rest & Guided Review",
                "title": "Cognitive Strain Detected",
                "message": "Our adaptive learning model detected signs of frustration and mental fatigue. To prevent cognitive overload and protect memory consolidation, we recommend taking a 3-minute breather or switching from high-difficulty tests to a Guided Review.",
                "reason": "Frustration signals cognitive overload; active recall is temporarily paused to protect retention.",
                "action_label": "Take 3-min Break",
                "suggested_route": "/study/flashcards",
                "severity": "high",
            }
        elif em == "Bored":
            return {
                "intervention_required": True,
                "activity": "Micro-Break or Interactive Quiz",
                "title": "Attention & Alertness Dip",
                "message": "Our focus model observed decreased engagement and alertness. Our adaptive scheduler recommends stepping away for a 2-minute stretch or switching to an interactive micro-quiz to re-energize your focus.",
                "reason": "Boredom indicates low arousal and attentional drift; an interactive modality switch or brief pause restores optimal alertness.",
                "action_label": "Try 2-min Micro-Quiz",
                "suggested_route": "/study/quiz",
                "severity": "medium",
            }
        elif em == "Confused":
            return {
                "intervention_required": True,
                "activity": "AI Tutor Guidance",
                "title": "Concept Difficulty Alert",
                "message": "Our readiness model noticed signs of conceptual confusion. We suggest asking the AI Tutor to break down difficult concepts or reviewing guided flashcards.",
                "reason": "Confusion indicates comprehension hurdles; conceptual scaffolding is recommended before testing recall.",
                "action_label": "Ask AI Tutor",
                "suggested_route": "/tutor",
                "severity": "medium",
            }
        elif readiness == "LOW" or focus_score < 40:
            return {
                "intervention_required": True,
                "activity": "Mindful Rest",
                "title": "Low Readiness Alert",
                "message": "Your current cognitive readiness is low. Our adaptive scheduler recommends a brief rest before continuing intensive study.",
                "reason": "Low readiness diminishes spaced repetition retention efficiency.",
                "action_label": "Take a Rest",
                "suggested_route": "/study",
                "severity": "medium",
            }
        else:
            return {
                "intervention_required": False,
                "activity": "Optimal Flow State",
                "title": "Optimal Focus Detected",
                "message": "You are currently in an optimal cognitive state. Keep up the great work!",
                "reason": "High attention and readiness detected; ideal for active spaced repetition.",
                "action_label": "Continue Study",
                "suggested_route": "/study/flashcards",
                "severity": "low",
            }
