import pytest
from datetime import datetime, timedelta, timezone
from app.models.sm2 import ReviewItem, update, retention_probability, review_priority

def now():
    return datetime.now(timezone.utc)

class TestSM2:
    def test_grade_below_3_resets(self):
        """Test 1: grade < 3 resets repetitions and interval to 1."""
        item = ReviewItem(item_id="test", repetitions=5, interval_days=16.0, easiness=2.5)
        updated = update(item, grade=2, now=now())
        assert updated.repetitions == 0
        assert updated.interval_days == 1.0

    def test_grade_3_or_higher_increments(self):
        """Test 2: two consecutive 5-grades give 6-day interval."""
        item1 = ReviewItem(item_id="test", repetitions=0, interval_days=1.0, easiness=2.5)
        item2 = update(item1, grade=5, now=now())
        assert item2.repetitions == 1
        item3 = update(item2, grade=5, now=now())
        assert item3.repetitions == 2
        assert 5.5 <= item3.interval_days <= 6.5  # ≈6, modulated by difficulty

    def test_difficulty_reduces_interval(self):
        """Test 3: higher difficulty (harder items) reduces review interval."""
        item_easy   = ReviewItem(item_id="e1", repetitions=2, interval_days=6.0, easiness=2.5, difficulty=0.2)
        item_hard   = ReviewItem(item_id="h1", repetitions=2, interval_days=6.0, easiness=2.5, difficulty=0.8)
        upd_easy    = update(item_easy, grade=4, now=now())
        upd_hard    = update(item_hard, grade=4, now=now())
        # Hard items should have shorter interval
        assert upd_hard.interval_days < upd_easy.interval_days

    def test_retention_probability_decays(self):
        """Test 4: retention probability decays exponentially with elapsed time."""
        past = now() - timedelta(days=3)
        item = ReviewItem(item_id="test", repetitions=2, interval_days=6.0, easiness=2.5, last_reviewed=past)
        p_now   = retention_probability(item, now())
        future  = now() + timedelta(days=3)
        p_later = retention_probability(item, future)
        # Retention should monotonically decrease
        assert p_now > p_later

    def test_review_priority_weights_difficulty(self):
        """Test 5: harder items (higher difficulty) get higher priority when retention is low."""
        past = now() - timedelta(days=7)
        item_easy   = ReviewItem(item_id="e1", repetitions=2, interval_days=6.0, easiness=2.5, difficulty=0.2, last_reviewed=past)
        item_hard   = ReviewItem(item_id="h1", repetitions=2, interval_days=6.0, easiness=2.5, difficulty=0.8, last_reviewed=past)
        pri_easy    = review_priority(item_easy, now())
        pri_hard    = review_priority(item_hard, now())
        # Harder items should have higher priority
        assert pri_hard > pri_easy

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
