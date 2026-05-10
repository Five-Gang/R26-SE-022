"""
Extended SM-2 Memory Decay Model
Predicts student forgetting behavior and retention probability for study items.
Uses spaced repetition algorithm with dynamic difficulty adjustment.

Purpose:
- Models student forgetting using Ebbinghaus decay curve
- Predicts retention probability for each study item
- Calculates optimal review intervals
- Adjusts difficulty based on performance
"""

from dataclasses import dataclass, replace
from datetime import datetime, timedelta, timezone
import math
from typing import Optional


@dataclass(frozen=True)
class StudyItem:
    """Immutable study item state for SM-2 tracking."""
    item_id: str
    repetitions: int = 0
    interval_days: float = 1.0
    easiness_factor: float = 2.5  # SM-2 default
    difficulty: float = 0.5  # Rolling EMA of recent grades (0-1)
    last_reviewed: Optional[datetime] = None
    quality_scores: list[int] = None  # Recent quality scores for trending
    
    def __post_init__(self):
        if self.quality_scores is None:
            object.__setattr__(self, 'quality_scores', [])


def calculate_quality_score(quiz_percentage: float) -> int:
    """
    Convert quiz performance to SM-2 quality score (0-5).
    
    Args:
        quiz_percentage: Score as percentage (0-100)
    
    Returns:
        quality_score: 0-5 scale (SM-2 standard)
        0 = complete failure (0-19%)
        1 = poor (20-39%)
        2 = difficult (40-59%)
        3 = ok (60-74%)
        4 = good (75-89%)
        5 = excellent (90-100%)
    """
    if quiz_percentage >= 90:
        return 5
    elif quiz_percentage >= 75:
        return 4
    elif quiz_percentage >= 60:
        return 3
    elif quiz_percentage >= 40:
        return 2
    elif quiz_percentage >= 20:
        return 1
    else:
        return 0


def update_sm2(item: StudyItem, quality_score: int, now: Optional[datetime] = None) -> StudyItem:
    """
    Update SM-2 parameters after a review.
    
    Args:
        item: Current StudyItem state
        quality_score: Quality (0-5) from quiz performance
        now: Current datetime (defaults to UTC now)
    
    Returns:
        Updated StudyItem with new intervals, easiness, difficulty
    """
    if now is None:
        now = datetime.now(timezone.utc)
    
    # Update difficulty as exponential moving average
    # Incorporate recent quality scores for trend
    new_difficulty = 0.7 * item.difficulty + 0.3 * (quality_score / 5.0)
    
    # Update quality scores history (keep last 10)
    new_quality_scores = (item.quality_scores + [quality_score])[-10:]
    
    # Always calculate new easiness factor using SM-2 formula
    # EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    ef_delta = 0.1 - (5 - quality_score) * (0.08 + (5 - quality_score) * 0.02)
    new_ef = max(1.3, item.easiness_factor + ef_delta)  # Never below 1.3
    
    # SM-2 logic: quality >= 3 is considered success
    if quality_score < 3:
        # Failed review: reset repetitions and interval
        new_reps = 0
        new_interval = 1.0
    else:
        # Successful review
        new_reps = item.repetitions + 1
        
        # Calculate interval based on repetition number
        if new_reps == 1:
            new_interval = 1.0  # Review next day
        elif new_reps == 2:
            new_interval = 6.0  # Review after 6 days
        else:
            # Subsequent reviews: interval = prev_interval * easiness * difficulty_modifier
            # Harder items (high difficulty) reviewed sooner
            difficulty_modifier = 1.5 - new_difficulty  # Range: 0.5-1.5
            new_interval = item.interval_days * item.easiness_factor * difficulty_modifier
    
    return replace(
        item,
        repetitions=new_reps,
        interval_days=new_interval,
        easiness_factor=new_ef,
        difficulty=new_difficulty,
        last_reviewed=now,
        quality_scores=new_quality_scores,
    )


def retention_probability(item: StudyItem, now: Optional[datetime] = None) -> float:
    """
    Calculate retention probability using Ebbinghaus forgetting curve.
    P(retention) = e^(-t/S) where S is strength (related to interval and easiness)
    
    Args:
        item: StudyItem with review history
        now: Current datetime (defaults to UTC now)
    
    Returns:
        Retention probability (0.0-1.0)
    """
    if now is None:
        now = datetime.now(timezone.utc)
    
    if item.last_reviewed is None:
        return 0.0  # Never reviewed = cannot retain
    
    # Days elapsed since last review
    days_elapsed = (now - item.last_reviewed).total_seconds() / (24 * 3600)
    
    # Strength factor: longer intervals + higher easiness = stronger memory
    # S = interval_days * easiness_factor
    strength = max(0.1, item.interval_days * item.easiness_factor)
    
    # Ebbinghaus curve: retention decays exponentially
    retention = math.exp(-days_elapsed / strength)
    
    # Clamp to [0, 1]
    return max(0.0, min(1.0, retention))


def calculate_priority_score(
    item: StudyItem,
    retention_prob: float,
    readiness_level: str,
    now: Optional[datetime] = None,
) -> float:
    """
    Calculate priority for review scheduling.
    Combines retention probability, readiness, and urgency.
    
    Args:
        item: StudyItem
        retention_prob: Current retention probability (0-1)
        readiness_level: "HIGH", "MEDIUM", or "LOW"
        now: Current datetime
    
    Returns:
        Priority score (higher = more urgent)
    """
    if now is None:
        now = datetime.now(timezone.utc)
    
    # Base priority from retention decay (lower retention = higher priority)
    retention_urgency = 1.0 - retention_prob  # 0.0-1.0
    
    # Readiness adjustment: boost priority when student is ready
    readiness_boost = {
        "HIGH": 1.2,
        "MEDIUM": 1.0,
        "LOW": 0.6,
    }.get(readiness_level, 1.0)
    
    # Difficulty factor: harder items get slight boost
    difficulty_boost = 0.8 + (item.difficulty * 0.4)  # Range: 0.8-1.2
    
    # Time pressure: items not reviewed recently get higher priority
    if item.last_reviewed is None:
        time_pressure = 1.5
    else:
        days_since = (now - item.last_reviewed).total_seconds() / (24 * 3600)
        time_pressure = 1.0 + min(0.5, days_since / item.interval_days)  # Cap at 1.5
    
    priority_score = (
        retention_urgency * readiness_boost * difficulty_boost * time_pressure
    )
    
    return priority_score


def next_review_date(item: StudyItem, now: Optional[datetime] = None) -> datetime:
    """
    Calculate the recommended next review date.
    
    Args:
        item: StudyItem
        now: Current datetime
    
    Returns:
        Recommended next review datetime
    """
    if now is None:
        now = datetime.now(timezone.utc)
    
    if item.last_reviewed is None:
        return now  # Review immediately if never reviewed
    
    # Next review = last_reviewed + interval_days
    next_review = item.last_reviewed + timedelta(days=item.interval_days)
    
    # Don't schedule in the past
    return max(next_review, now)


def process_item(
    item: StudyItem,
    readiness_level: str,
    now: Optional[datetime] = None,
) -> dict:
    """
    Process item for scheduling decision.
    Calculate all metrics needed for reminder scheduling.
    
    Args:
        item: StudyItem
        readiness_level: Current readiness from Model 1
        now: Current datetime
    
    Returns:
        Dictionary with retention_probability, priority_score, next_review_date
    """
    if now is None:
        now = datetime.now(timezone.utc)
    
    retention_prob = retention_probability(item, now)
    priority_score = calculate_priority_score(item, retention_prob, readiness_level, now)
    next_review = next_review_date(item, now)
    
    return {
        "item_id": item.item_id,
        "retention_probability": retention_prob,
        "priority_score": priority_score,
        "next_review_date": next_review.isoformat(),
        "repetitions": item.repetitions,
        "interval_days": item.interval_days,
        "easiness_factor": item.easiness_factor,
        "difficulty": item.difficulty,
        "last_reviewed": item.last_reviewed.isoformat() if item.last_reviewed else None,
    }


def item_from_mongo(doc: dict) -> StudyItem:
    """Convert MongoDB document to StudyItem."""
    last_reviewed = None
    if doc.get("last_reviewed"):
        last_reviewed = datetime.fromisoformat(doc["last_reviewed"])
        if last_reviewed.tzinfo is None:
            last_reviewed = last_reviewed.replace(tzinfo=timezone.utc)
    
    return StudyItem(
        item_id=doc["item_id"],
        repetitions=doc.get("repetitions", 0),
        interval_days=doc.get("interval_days", 1.0),
        easiness_factor=doc.get("easiness_factor", 2.5),
        difficulty=doc.get("difficulty", 0.5),
        last_reviewed=last_reviewed,
        quality_scores=doc.get("quality_scores", []),
    )


def item_to_mongo_update(item: StudyItem) -> dict:
    """Convert StudyItem to MongoDB update dict."""
    return {
        "repetitions": item.repetitions,
        "interval_days": item.interval_days,
        "easiness_factor": item.easiness_factor,
        "difficulty": item.difficulty,
        "last_reviewed": item.last_reviewed.isoformat() if item.last_reviewed else None,
        "quality_scores": item.quality_scores,
    }
