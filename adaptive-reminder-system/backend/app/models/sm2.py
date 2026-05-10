from dataclasses import dataclass, replace
from datetime import datetime, timezone
import math

@dataclass(frozen=True)
class ReviewItem:
    item_id: str
    repetitions: int = 0
    interval_days: float = 1.0
    easiness: float = 2.5
    difficulty: float = 0.5      # rolling EMA of recent grades — YOUR extension
    last_reviewed: datetime | None = None

def update(item: ReviewItem, grade: int, now: datetime) -> ReviewItem:
    """
    grade 0-5 (SM-2 standard): 0=complete blackout, 5=perfect recall.
    Returns a NEW frozen item — immutability makes this easy to test and replay.
    """
    # Update difficulty as exponential moving average
    new_difficulty = 0.7 * item.difficulty + 0.3 * (grade / 5.0)

    if grade < 3:
        new_reps, new_interval = 0, 1.0
    else:
        new_reps = item.repetitions + 1
        if new_reps == 1:
            new_interval = 1.0
        elif new_reps == 2:
            new_interval = 6.0
        else:
            # Difficulty modulates the interval — harder items reviewed sooner
            new_interval = item.interval_days * item.easiness * (1.5 - new_difficulty)

    new_ef = max(1.3, item.easiness + 0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))

    return replace(
        item,
        repetitions=new_reps,
        interval_days=new_interval,
        easiness=new_ef,
        difficulty=new_difficulty,
        last_reviewed=now,
    )

def retention_probability(item: ReviewItem, now: datetime) -> float:
    """Ebbinghaus forgetting curve: P = e^(-t/S)."""
    if item.last_reviewed is None:
        return 0.0
    
    # Ensure both datetimes are timezone-aware (UTC)
    last_reviewed = item.last_reviewed
    if last_reviewed.tzinfo is None:
        # Make naive datetime timezone-aware (assume UTC)
        last_reviewed = last_reviewed.replace(tzinfo=timezone.utc)
    
    elapsed_days = (now - last_reviewed).total_seconds() / 86400
    stability = max(item.interval_days * item.easiness, 0.1)
    return math.exp(-elapsed_days / stability)

def review_priority(item: ReviewItem, now: datetime) -> float:
    """Higher = needs review more urgently. Weighted by difficulty."""
    p = retention_probability(item, now)
    return (1.0 - p) * (1.0 + item.difficulty)

def item_from_mongo(doc: dict) -> ReviewItem:
    """Deserialise a MongoDB document into a ReviewItem."""
    return ReviewItem(
        item_id=doc["item_key"],
        repetitions=doc.get("repetitions", 0),
        interval_days=doc.get("interval_days", 1.0),
        easiness=doc.get("easiness", 2.5),
        difficulty=doc.get("difficulty", 0.5),
        last_reviewed=doc.get("last_reviewed"),
    )

def item_to_mongo_update(item: ReviewItem) -> dict:
    """Serialise SM-2 state back to a MongoDB $set payload."""
    return {
        "repetitions":   item.repetitions,
        "interval_days": item.interval_days,
        "easiness":      item.easiness,
        "difficulty":    item.difficulty,
        "last_reviewed": item.last_reviewed,
    }
