from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel
from app.services.predict_readiness import predict_readiness
from app.models.sm2 import StudyItem, calculate_quality_score, update_sm2, retention_probability, calculate_priority_score
from app.models.adaptive_scheduler import AdaptiveScheduler
from app.services.content_personalization_service import ContentPersonalizationService
from datetime import datetime, timezone, timedelta

router = APIRouter(prefix="/api/v1/pipeline", tags=["pipeline"])

scheduler = AdaptiveScheduler()
content_service = ContentPersonalizationService()


class PipelineRequest(BaseModel):
    emotion: str
    time_of_day: Optional[str] = None
    quality_percentage: float = 80.0
    difficulty_level: str = "medium"
    days_since_last_review: float = 2.0


@router.post("/complete")
async def complete_pipeline(req: PipelineRequest):
    """
    Full pipeline orchestration: chains all 4 models together.
    
    Flow:
    1. Readiness Model (emotion + time) → readiness_level
    2. SM-2 Model (quiz score + readiness) → retention_probability, priority_score
    3. Scheduler Model (all inputs) → SEND_NOW/DELAY/SKIP decision
    4. Content Model (all inputs) → activity recommendation
    """
    
    try:
        # ============ MODEL 1: READINESS ============
        readiness_level = predict_readiness(req.emotion, req.time_of_day)
        
        # ============ MODEL 2: SM-2 MEMORY ============
        # Create a study item with a prior review age so retention reflects decay.
        difficulty_value = {
            "easy": 0.3,
            "medium": 0.5,
            "hard": 0.8,
        }.get(req.difficulty_level.lower(), 0.5)

        study_item = StudyItem(
            item_id="pipeline_demo",
            repetitions=1,
            interval_days=1,
            easiness_factor=2.5,
            difficulty=difficulty_value,
            last_reviewed=datetime.now(timezone.utc) - timedelta(days=max(req.days_since_last_review, 0.0)),
            quality_scores=[],
        )
        
        # Calculate quality score from percentage
        quality_score = calculate_quality_score(req.quality_percentage)
        
        # Measure retention before the current review so the result can decay.
        retention_prob = retention_probability(study_item, datetime.now(timezone.utc))

        # Update SM-2 for the next cycle, but keep the current retention signal for decisions.
        updated_item = update_sm2(study_item, quality_score, datetime.now(timezone.utc))

        # Priority score uses the pre-review state and is capped to 120% for UI stability.
        priority_score = min(
            calculate_priority_score(study_item, retention_prob, readiness_level, datetime.now(timezone.utc)),
            1.2,
        )
        
        # ============ MODEL 3: SCHEDULER ============
        scheduler_result = scheduler.get_explanation(
            readiness_level=readiness_level,
            retention_probability=retention_prob,
            priority_score=priority_score,
        )
        
        # ============ MODEL 4: CONTENT PERSONALIZATION ============
        content_result = content_service.recommend_activity(
            readiness_level=readiness_level,
            retention_probability=retention_prob,
            priority_percentage=priority_score * 100,
            difficulty_level=req.difficulty_level,
        )
        
        # ============ RETURN COMPLETE PIPELINE ============
        return {
            "pipeline_status": "success",
            "inputs": {
                "emotion": req.emotion,
                "time_of_day": req.time_of_day,
                "quality_percentage": req.quality_percentage,
                "difficulty_level": req.difficulty_level,
            },
            "stages": {
                "stage_1_readiness": {
                    "name": "Emotional Readiness Assessment",
                    "output": {
                        "readiness_level": readiness_level,
                        "description": f"Student is {readiness_level.lower()} on energy and focus",
                    },
                },
                "stage_2_memory": {
                    "name": "SM-2 Memory Decay Analysis",
                    "output": {
                        "retention_probability": round(retention_prob, 3),
                        "retention_percentage": round(retention_prob * 100, 1),
                        "priority_score": round(priority_score, 3),
                        "priority_percentage": round(priority_score * 100, 1),
                        "interval_days": round(updated_item.interval_days, 1),
                        "easiness_factor": round(updated_item.easiness_factor, 2),
                        "description": f"Estimated recall before review is {round(retention_prob*100, 0):.0f}%",
                    },
                },
                "stage_3_scheduler": {
                    "name": "Adaptive Reminder Decision",
                    "output": {
                        "action": scheduler_result["action"],
                        "reasons": scheduler_result["reasons"],
                        "description": f"Decision: {scheduler_result['action']}",
                    },
                },
                "stage_4_content": {
                    "name": "Content Personalization",
                    "output": {
                        "activity": content_result["activity"],
                        "reason": content_result["reason"],
                        "description": f"Recommended activity: {content_result['activity']}",
                    },
                },
            },
            "final_recommendation": {
                "action": scheduler_result["action"],
                "activity": content_result["activity"],
                "summary": f"{scheduler_result['action']} with {content_result['activity'].lower()}",
                "full_reasoning": {
                    "readiness": readiness_level,
                    "retention_risk": f"{round(retention_prob*100, 0):.0f}%",
                    "priority_urgency": f"{round(priority_score*100, 0):.0f}%",
                    "recommended_activity": content_result["activity"],
                    "why": content_result["reason"],
                },
            },
        }
    
    except Exception as e:
        return {
            "pipeline_status": "error",
            "error": str(e),
        }
