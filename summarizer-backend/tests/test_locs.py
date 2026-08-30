"""Tests for the LO Coverage Score (LOCS) metric."""

import asyncio

import pytest

from app.services.evaluation.lo_coverage_scorer import LOCoverageScorer


@pytest.fixture
def scorer():
    return LOCoverageScorer(coverage_threshold=0.5)


@pytest.fixture
def sample_los():
    return [
        {
            "lo_code": "LO1",
            "text": "Define and explain fundamental database concepts including entities, attributes, and relationships",
            "bloom_level": "Understand",
            "topic_keywords": ["database", "entity", "attribute", "relationship"],
        },
        {
            "lo_code": "LO2",
            "text": "Apply normalization techniques to reduce data redundancy up to Third Normal Form",
            "bloom_level": "Apply",
            "topic_keywords": ["normalization", "1NF", "2NF", "3NF", "redundancy"],
        },
        {
            "lo_code": "LO3",
            "text": "Evaluate trade-offs between relational and NoSQL databases for given use cases",
            "bloom_level": "Evaluate",
            "topic_keywords": ["relational", "NoSQL", "trade-off", "scalability"],
        },
    ]


class TestLOCoverageScorer:
    """Tests for LOCS metric computation."""

    def test_empty_summary(self, scorer, sample_los):
        """LOCS should be 0 for an empty summary."""
        result = asyncio.get_event_loop().run_until_complete(
            scorer.compute("", sample_los)
        )
        assert result.overall_score == 0.0
        assert result.covered_count == 0
        assert result.total_count == 3

    def test_no_los_returns_perfect(self, scorer):
        """If there are no LOs, coverage should be 1.0 by default."""
        result = asyncio.get_event_loop().run_until_complete(
            scorer.compute("Any summary text here", [])
        )
        assert result.overall_score == 1.0

    def test_full_coverage(self, scorer, sample_los, sample_summary):
        """Summary that covers all LOs should have high LOCS."""
        result = asyncio.get_event_loop().run_until_complete(
            scorer.compute(sample_summary, sample_los)
        )
        # LO2 should be well covered (normalization content in sample)
        assert result.per_lo_scores["LO2"] > 0.3
        assert result.total_count == 3

    def test_partial_coverage(self, scorer, sample_los):
        """Summary covering only one LO should have partial score."""
        summary = (
            "Database normalization is a process of organizing data "
            "to reduce redundancy. First Normal Form (1NF) requires "
            "atomic values. Second Normal Form (2NF) builds on 1NF. "
            "Third Normal Form (3NF) eliminates transitive dependencies."
        )
        result = asyncio.get_event_loop().run_until_complete(
            scorer.compute(summary, sample_los)
        )
        # LO2 keywords should match strongly
        assert result.per_lo_scores["LO2"] > result.per_lo_scores["LO3"]

    def test_bloom_depth_scoring(self, scorer):
        """Test Bloom's depth scoring for different levels."""
        # Remember-level content
        remember_summary = "Define the key terms. List the main concepts. Identify the components."
        los = [{"lo_code": "LO1", "text": "Remember key terms", "bloom_level": "Remember", "topic_keywords": []}]

        result = asyncio.get_event_loop().run_until_complete(
            scorer.compute(remember_summary, los)
        )
        assert "LO1" in result.per_lo_scores

    def test_per_lo_details(self, scorer, sample_los, sample_summary):
        """Each LO should have detailed breakdown."""
        result = asyncio.get_event_loop().run_until_complete(
            scorer.compute(sample_summary, sample_los)
        )
        for lo_code, details in result.per_lo_details.items():
            assert "keyword_score" in details
            assert "semantic_score" in details
            assert "bloom_score" in details
            assert "combined" in details
            assert "is_covered" in details
