from __future__ import annotations
from typing import Optional, Union
"""Output Validator — validates generated content for LO coverage and accuracy.

Post-generation validation that checks:
1. LO Coverage: Does the summary address all relevant learning outcomes?
2. Citation Presence: Are source citations included?
3. Bloom's Depth: Does the content match the intended cognitive level?
4. Format Compliance: Does the output match the requested format?
"""

import re
from dataclasses import dataclass, field


@dataclass
class ValidationResult:
    """Result of output validation."""

    is_valid: bool = True
    lo_coverage_scores: dict[str, float] = field(default_factory=dict)
    overall_lo_coverage: float = 0.0
    citation_count: int = 0
    has_citations: bool = False
    uncovered_los: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    extracted_citations: list[dict] = field(default_factory=list)


class OutputValidator:
    """Validates generated summaries for educational quality.

    Checks:
    - LO coverage (keyword and section-based)
    - Citation extraction and counting
    - Format compliance
    - Content length adequacy
    """

    def validate(
        self,
        content: str,
        learning_outcomes: list[dict],
        output_type: str = "summary",
    ) -> ValidationResult:
        """Validate generated content.

        Args:
            content: The generated summary/output text.
            learning_outcomes: List of LO dicts with 'lo_code', 'text', 'topic_keywords'.
            output_type: Type of output (summary, flashcards, quiz).

        Returns:
            ValidationResult with scores and warnings.
        """
        result = ValidationResult()

        # Check LO coverage
        if learning_outcomes:
            result.lo_coverage_scores = self._check_lo_coverage(content, learning_outcomes)
            covered = sum(1 for s in result.lo_coverage_scores.values() if s > 0.3)
            result.overall_lo_coverage = covered / len(learning_outcomes)
            result.uncovered_los = [
                lo_code for lo_code, score in result.lo_coverage_scores.items()
                if score <= 0.3
            ]

        # Extract and count citations
        result.extracted_citations = self._extract_citations(content)
        result.citation_count = len(result.extracted_citations)
        result.has_citations = result.citation_count > 0

        # Check content adequacy
        if output_type == "summary":
            word_count = len(content.split())
            if word_count < 100:
                result.warnings.append(f"Summary is too short ({word_count} words)")
                result.is_valid = False
            if not result.has_citations:
                result.warnings.append("No citations found in summary")

        # Check for potential hallucination indicators
        hallucination_phrases = [
            "as an AI", "I don't have access", "I cannot",
            "based on my training", "as of my knowledge cutoff",
        ]
        for phrase in hallucination_phrases:
            if phrase.lower() in content.lower():
                result.warnings.append(f"Potential meta-response detected: '{phrase}'")

        if result.uncovered_los:
            result.warnings.append(
                f"Uncovered LOs: {', '.join(result.uncovered_los)}"
            )

        return result

    def _check_lo_coverage(
        self, content: str, learning_outcomes: list[dict]
    ) -> dict[str, float]:
        """Check how well the content covers each learning outcome.

        Uses keyword presence as a proxy metric. A more sophisticated
        version would use embedding similarity (future improvement).
        """
        scores = {}
        content_lower = content.lower()

        for lo in learning_outcomes:
            lo_code = lo.get("lo_code", lo.get("code", "LO?"))
            lo_text = lo.get("text", "")
            keywords = lo.get("topic_keywords", [])

            # Score components
            keyword_score = 0.0
            text_presence_score = 0.0
            section_score = 0.0

            # 1. Check if LO code appears in content (section header)
            if lo_code.lower() in content_lower:
                section_score = 0.4

            # 2. Check keyword presence
            if keywords:
                found = sum(1 for kw in keywords if kw.lower() in content_lower)
                keyword_score = (found / len(keywords)) * 0.4

            # 3. Check key phrases from LO text
            lo_words = set(lo_text.lower().split())
            stopwords = {"the", "a", "an", "and", "or", "to", "of", "in", "for", "with", "be"}
            meaningful_words = lo_words - stopwords
            if meaningful_words:
                found = sum(1 for w in meaningful_words if w in content_lower)
                text_presence_score = (found / len(meaningful_words)) * 0.2

            scores[lo_code] = min(1.0, section_score + keyword_score + text_presence_score)

        return scores

    def _extract_citations(self, content: str) -> list[dict]:
        """Extract citation references from generated content."""
        citations = []

        # Pattern: [Source: filename, Slide/Page N]
        pattern = r"\[Source(?:\s*\d*)?:\s*([^,\]]+?)(?:,\s*(?:Union[Slide, Union[Page], p]\.?)\s*(\d+(?:-\d+)?))?\]"
        matches = re.finditer(pattern, content, re.IGNORECASE)

        for i, match in enumerate(matches):
            citation = {
                "index": i + 1,
                "source": match.group(1).strip(),
                "location": match.group(2) if match.group(2) else None,
                "full_match": match.group(0),
            }
            citations.append(citation)

        return citations
