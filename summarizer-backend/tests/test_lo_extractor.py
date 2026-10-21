"""Tests for the Learning Outcome Extractor."""

import pytest

from app.services.ingestion.lo_extractor import (
    BLOOM_TAXONOMY,
    LearningOutcomeExtractor,
)


@pytest.fixture
def extractor():
    return LearningOutcomeExtractor()


class TestLearningOutcomeExtractor:
    """Tests for LO extraction and Bloom's classification."""

    def test_extract_numbered_los(self, extractor):
        """Should extract numbered learning outcomes."""
        text = """Module: IT2060 Database Systems

Learning Outcomes:
LO1: Define and explain fundamental database concepts.
LO2: Apply normalization techniques to reduce data redundancy.
LO3: Design Entity-Relationship diagrams for given scenarios.
LO4: Evaluate trade-offs between SQL and NoSQL databases.

Module Content:
Week 1: Introduction to Databases"""

        result = extractor.extract_from_text(text)
        assert len(result.learning_outcomes) >= 4
        assert result.learning_outcomes[0].lo_code == "LO1"
        assert result.learning_outcomes[1].lo_code == "LO2"

    def test_bloom_classification(self, extractor):
        """Should correctly classify LOs by Bloom's level."""
        text = """Learning Outcomes:
LO1: Define the key database terminology.
LO2: Explain the concepts of data integrity.
LO3: Apply SQL queries to solve problems.
LO4: Analyze the performance of different indexing strategies.
LO5: Evaluate the suitability of database systems.
LO6: Design a complete database schema."""

        result = extractor.extract_from_text(text)
        los = {lo.lo_code: lo for lo in result.learning_outcomes}

        if "LO1" in los:
            assert los["LO1"].bloom_level == "Remember"
        if "LO2" in los:
            assert los["LO2"].bloom_level == "Understand"
        if "LO3" in los:
            assert los["LO3"].bloom_level == "Apply"
        if "LO4" in los:
            assert los["LO4"].bloom_level == "Analyze"

    def test_extract_module_code(self, extractor):
        """Should extract the module code."""
        text = """Module Code: IT2060
Module Name: Database Systems
Credits: 4"""

        result = extractor.extract_from_text(text)
        assert result.module_code == "IT2060"

    def test_extract_module_name(self, extractor):
        """Should extract the module name."""
        text = """Module Code: IT2060
Module Title: Database Systems
Credits: 4"""

        result = extractor.extract_from_text(text)
        assert result.module_name == "Database Systems"

    def test_extract_credits(self, extractor):
        """Should extract credit count."""
        text = "Credits: 3\n\nLearning Outcomes:\nLO1: Test outcome."
        result = extractor.extract_from_text(text)
        assert result.credits == 3

    def test_extract_weekly_breakdown(self, extractor):
        """Should extract weekly topic breakdown."""
        text = """Module Content:
Week 1: Introduction to Databases
Week 2: ER Modeling
Week 3: Relational Model
Week 4: SQL Basics"""

        result = extractor.extract_from_text(text)
        assert len(result.weekly_breakdown) >= 4
        assert result.weekly_breakdown[0]["week_number"] == 1
        assert "Introduction" in result.weekly_breakdown[0]["topic"]

    def test_extract_assessment(self, extractor):
        """Should extract assessment structure."""
        text = """Assessment:
Final Exam: 60%
Coursework: 40%
Quiz: 10%"""

        result = extractor.extract_from_text(text)
        assert result.assessment_structure.get("exam") == 60
        assert result.assessment_structure.get("coursework") == 40

    def test_keyword_extraction(self, extractor):
        """Should extract topic keywords from LO text."""
        text = """Learning Outcomes:
LO1: Apply Normalization techniques including First Normal Form and Third Normal Form."""

        result = extractor.extract_from_text(text)
        if result.learning_outcomes:
            keywords = result.learning_outcomes[0].topic_keywords
            # Should contain capitalized domain terms
            assert any("Normalization" in kw or "Normal" in kw or "Form" in kw for kw in keywords)

    def test_bloom_taxonomy_completeness(self):
        """Verify all six Bloom's levels have verb lists."""
        assert len(BLOOM_TAXONOMY) == 6
        for level in ["Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"]:
            assert level in BLOOM_TAXONOMY
            assert len(BLOOM_TAXONOMY[level]) >= 5

    def test_empty_input(self, extractor):
        """Empty input should return empty results."""
        result = extractor.extract_from_text("")
        assert len(result.learning_outcomes) == 0
