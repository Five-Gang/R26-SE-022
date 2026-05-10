"""
Unit tests for Extended SM-2 Memory Decay Model (Model 2)
Tests memory decay, retention probability, priority scoring, and interval calculations.
"""

import pytest
from datetime import datetime, timedelta, timezone
from app.models.sm2 import (
    StudyItem,
    calculate_quality_score,
    update_sm2,
    retention_probability,
    calculate_priority_score,
    next_review_date,
    process_item,
    item_from_mongo,
    item_to_mongo_update,
)


class TestQualityScore:
    """Test quality score calculation from quiz percentage."""
    
    def test_excellent_score(self):
        assert calculate_quality_score(95) == 5
    
    def test_good_score(self):
        assert calculate_quality_score(80) == 4
    
    def test_ok_score(self):
        assert calculate_quality_score(65) == 3
    
    def test_difficult_score(self):
        assert calculate_quality_score(50) == 2
    
    def test_poor_score(self):
        assert calculate_quality_score(25) == 1
    
    def test_failure_score(self):
        assert calculate_quality_score(10) == 0


class TestSM2Update:
    """Test SM-2 interval and easiness factor updates."""
    
    def test_first_successful_review(self):
        """First successful review (quality >= 3) → interval = 1 day."""
        item = StudyItem(item_id="test_1")
        now = datetime.now(timezone.utc)
        
        updated = update_sm2(item, quality_score=4, now=now)
        
        assert updated.repetitions == 1
        assert updated.interval_days == 1.0
        assert updated.last_reviewed == now
    
    def test_second_successful_review(self):
        """Second successful review → interval = 6 days."""
        item = StudyItem(
            item_id="test_2",
            repetitions=1,
            interval_days=1.0,
            last_reviewed=datetime.now(timezone.utc) - timedelta(days=1),
        )
        now = datetime.now(timezone.utc)
        
        updated = update_sm2(item, quality_score=4, now=now)
        
        assert updated.repetitions == 2
        assert updated.interval_days == 6.0
    
    def test_failed_review_resets(self):
        """Failed review (quality < 3) → reset repetitions to 0."""
        item = StudyItem(
            item_id="test_3",
            repetitions=5,
            interval_days=30.0,
        )
        
        updated = update_sm2(item, quality_score=2)
        
        assert updated.repetitions == 0
        assert updated.interval_days == 1.0
    
    def test_easiness_factor_increases(self):
        """Quality = 5 → easiness factor increases."""
        item = StudyItem(item_id="test_4", easiness_factor=2.5)
        
        updated = update_sm2(item, quality_score=5)
        
        assert updated.easiness_factor > 2.5
    
    def test_easiness_factor_decreases(self):
        """Quality = 2 → easiness factor decreases."""
        item = StudyItem(item_id="test_5", easiness_factor=2.5)
        
        updated = update_sm2(item, quality_score=2)
        
        assert updated.easiness_factor < 2.5
    
    def test_easiness_factor_minimum(self):
        """Easiness factor never goes below 1.3."""
        item = StudyItem(item_id="test_6", easiness_factor=1.4)
        
        updated = update_sm2(item, quality_score=0)
        
        assert updated.easiness_factor >= 1.3


class TestRetentionProbability:
    """Test Ebbinghaus forgetting curve calculations."""
    
    def test_never_reviewed(self):
        """Never reviewed item → retention = 0."""
        item = StudyItem(item_id="test_7")
        retention = retention_probability(item)
        
        assert retention == 0.0
    
    def test_just_reviewed(self):
        """Just reviewed (0 days ago) → retention ≈ 1.0."""
        now = datetime.now(timezone.utc)
        item = StudyItem(
            item_id="test_8",
            last_reviewed=now,
            interval_days=10.0,
        )
        
        retention = retention_probability(item, now=now)
        
        assert retention > 0.99
    
    def test_decay_over_time(self):
        """Retention decays as time passes."""
        now = datetime.now(timezone.utc)
        item = StudyItem(
            item_id="test_9",
            last_reviewed=now,
            interval_days=5.0,
            easiness_factor=2.5,
        )
        
        # Retention immediately after review
        retention_t0 = retention_probability(item, now=now)
        
        # Retention after 5 days
        retention_t5 = retention_probability(item, now=now + timedelta(days=5))
        
        # Retention after 10 days
        retention_t10 = retention_probability(item, now=now + timedelta(days=10))
        
        assert retention_t0 > retention_t5 > retention_t10


class TestPriorityScore:
    """Test priority scoring for scheduling."""
    
    def test_low_retention_high_priority(self):
        """Low retention → high priority."""
        item = StudyItem(
            item_id="test_10",
            last_reviewed=datetime.now(timezone.utc) - timedelta(days=100),
            interval_days=5.0,
        )
        
        priority_low_retention = calculate_priority_score(
            item, retention_prob=0.1, readiness_level="HIGH"
        )
        priority_high_retention = calculate_priority_score(
            item, retention_prob=0.9, readiness_level="HIGH"
        )
        
        assert priority_low_retention > priority_high_retention
    
    def test_readiness_boost(self):
        """HIGH readiness → higher priority than LOW."""
        item = StudyItem(item_id="test_11")
        retention_prob = 0.5
        
        priority_high = calculate_priority_score(item, retention_prob, "HIGH")
        priority_low = calculate_priority_score(item, retention_prob, "LOW")
        
        assert priority_high > priority_low


class TestNextReviewDate:
    """Test next review date calculation."""
    
    def test_never_reviewed(self):
        """Never reviewed item → next review is now."""
        now = datetime.now(timezone.utc)
        item = StudyItem(item_id="test_12")
        
        next_review = next_review_date(item, now=now)
        
        assert next_review == now
    
    def test_scheduled_review_future(self):
        """Review is scheduled for interval_days in future."""
        now = datetime.now(timezone.utc)
        item = StudyItem(
            item_id="test_13",
            last_reviewed=now - timedelta(days=3),
            interval_days=5.0,
        )
        
        next_review = next_review_date(item, now=now)
        
        # Should be ~2 days in the future (5 - 3 already passed)
        assert next_review > now


class TestMongoConversion:
    """Test MongoDB document conversion."""
    
    def test_item_from_mongo(self):
        """Convert MongoDB document to StudyItem."""
        doc = {
            "item_id": "DBMS_01",
            "repetitions": 3,
            "interval_days": 10.5,
            "easiness_factor": 2.7,
            "difficulty": 0.6,
            "last_reviewed": "2026-05-10T10:00:00+00:00",
            "quality_scores": [4, 4, 5],
        }
        
        item = item_from_mongo(doc)
        
        assert item.item_id == "DBMS_01"
        assert item.repetitions == 3
        assert item.interval_days == 10.5
    
    def test_item_to_mongo_update(self):
        """Convert StudyItem to MongoDB update dict."""
        now = datetime.now(timezone.utc)
        item = StudyItem(
            item_id="DBMS_01",
            repetitions=3,
            interval_days=10.5,
            easiness_factor=2.7,
            difficulty=0.6,
            last_reviewed=now,
            quality_scores=[4, 4, 5],
        )
        
        update = item_to_mongo_update(item)
        
        assert update["repetitions"] == 3
        assert update["interval_days"] == 10.5
        assert update["last_reviewed"] == now.isoformat()


class TestProcessItem:
    """Test full item processing workflow."""
    
    def test_process_item_complete(self):
        """Process item returns all required scheduling metrics."""
        now = datetime.now(timezone.utc)
        item = StudyItem(
            item_id="DBMS_01",
            last_reviewed=now - timedelta(days=5),
            interval_days=10.0,
            repetitions=2,
        )
        
        result = process_item(item, readiness_level="HIGH", now=now)
        
        assert "retention_probability" in result
        assert "priority_score" in result
        assert "next_review_date" in result
        assert 0.0 <= result["retention_probability"] <= 1.0
        assert result["priority_score"] >= 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
