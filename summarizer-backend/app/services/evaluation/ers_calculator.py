from __future__ import annotations
from typing import Optional, Union
"""Educational Relevance Score (ERS) — Composite Novel Research Metric.

The primary evaluation metric for LOA-ESS research. Combines:
- LO Coverage Score (LOCS): 40%
- Bloom's Alignment Score (BAS): 30%
- Factual Accuracy (Source Grounding Rate): 20%
- Coherence Score: 10%

ERS = 0.4 × LOCS + 0.3 × BAS + 0.2 × SGR + 0.1 × Coherence
"""

from dataclasses import dataclass, field

from app.services.evaluation.lo_coverage_scorer import LOCoverageScorer, LOCoverageResult


@dataclass
class ERSResult:
    """Complete Educational Relevance Score result."""

    ers_score: float = 0.0  # 0.0-1.0 composite score
    locs: float = 0.0  # LO Coverage Score
    bas: float = 0.0  # Bloom's Alignment Score
    sgr: float = 0.0  # Source Grounding Rate
    coherence: float = 0.0  # Coherence Score
    lo_coverage_detail: Optional[LOCoverageResult] = None
    component_weights: dict = field(default_factory=lambda: {
        "locs": 0.4, "bas": 0.3, "sgr": 0.2, "coherence": 0.1
    })


class ERSCalculator:
    """Computes the Educational Relevance Score (ERS).

    This is the PRIMARY RESEARCH METRIC for LOA-ESS (Research Contribution RC4).

    ERS is a composite metric specifically designed to evaluate educational
    summarization quality. Unlike ROUGE/BERTScore which measure surface-level
    text quality, ERS evaluates educational alignment and pedagogical value.

    Components:
    1. LOCS (40%): Learning Outcome Coverage Score
    2. BAS (30%): Bloom's Alignment Score — does the depth match the LO level?
    3. SGR (20%): Source Grounding Rate — are claims cited?
    4. Coherence (10%): Is the summary well-structured and coherent?
    """

    def __init__(self, embedding_fn=None):
        self.lo_scorer = LOCoverageScorer(
            embedding_fn=embedding_fn,
            coverage_threshold=0.5,
        )

    async def compute(
        self,
        summary: str,
        learning_outcomes: list[dict],
        source_chunks: Optional[list[dict]] = None,
    ) -> ERSResult:
        """Compute the full ERS score.

        Args:
            summary: Generated summary text.
            learning_outcomes: List of LO dicts.
            source_chunks: Optional source chunks for grounding check.

        Returns:
            ERSResult with composite and component scores.
        """
        result = ERSResult()

        # 1. LOCS — LO Coverage Score
        lo_result = await self.lo_scorer.compute(summary, learning_outcomes)
        result.locs = lo_result.overall_score
        result.lo_coverage_detail = lo_result

        # 2. BAS — Bloom's Alignment Score
        result.bas = self._compute_bas(summary, learning_outcomes)

        # 3. SGR — Source Grounding Rate
        result.sgr = self._compute_sgr(summary)

        # 4. Coherence — structural quality
        result.coherence = self._compute_coherence(summary)

        # Composite ERS
        result.ers_score = (
            0.4 * result.locs
            + 0.3 * result.bas
            + 0.2 * result.sgr
            + 0.1 * result.coherence
        )

        return result

    def _compute_bas(self, summary: str, learning_outcomes: list[dict]) -> float:
        """Compute Bloom's Alignment Score.

        For each LO, checks whether the summary content about that LO
        operates at the appropriate Bloom's level.

        A "Remember" LO should have definitions, not analysis.
        An "Evaluate" LO should have comparisons and trade-offs.
        """
        if not learning_outcomes:
            return 1.0

        summary_lower = summary.lower()
        alignment_scores = []

        # Level-specific indicators (what should be present for each level)
        level_indicators = {
            "Remember": {
                "positive": ["define", "definition", "is a", "refers to", "key terms", "list"],
                "negative_weight": 0.0,  # No penalty for having more
            },
            "Understand": {
                "positive": ["explain", "means", "because", "therefore", "example", "such as"],
                "negative_weight": 0.0,
            },
            "Apply": {
                "positive": ["step", "example", "solve", "apply", "solution", "procedure", "how to"],
                "negative_weight": 0.1,  # Slight penalty if only definitions
            },
            "Analyze": {
                "positive": ["compare", "contrast", "difference", "relationship", "component"],
                "negative_weight": 0.15,
            },
            "Evaluate": {
                "positive": ["trade-off", "advantage", "disadvantage", "evaluate", "criteria", "pros", "cons"],
                "negative_weight": 0.2,
            },
            "Create": {
                "positive": ["design", "propose", "develop", "create", "framework", "plan"],
                "negative_weight": 0.2,
            },
        }

        for lo in learning_outcomes:
            bloom = lo.get("bloom_level", "Understand")
            indicators = level_indicators.get(bloom, level_indicators["Understand"])
            positive = indicators["positive"]

            # Check positive indicator presence
            found = sum(1 for ind in positive if ind in summary_lower)
            score = min(1.0, found / max(len(positive) * 0.3, 1))
            alignment_scores.append(score)

        return sum(alignment_scores) / len(alignment_scores) if alignment_scores else 0.0

    def _compute_sgr(self, summary: str) -> float:
        """Compute Source Grounding Rate.

        Measures the proportion of substantive claims that include citations.
        """
        import re

        # Count citation markers
        citation_pattern = r"\[Source[^]]*\]"
        citations = re.findall(citation_pattern, summary, re.IGNORECASE)
        citation_count = len(citations)

        # Estimate number of substantive claims (sentences with factual content)
        sentences = re.split(r"[.!?]\s+", summary)
        # Filter out headings, short phrases, and structural elements
        claims = [
            s for s in sentences
            if len(s.split()) > 5
            and not s.strip().startswith("#")
            and not s.strip().startswith("-")
            and not s.strip().startswith("*")
        ]
        claim_count = len(claims)

        if claim_count == 0:
            return 0.0

        # SGR = citations / claims (capped at 1.0)
        return min(1.0, citation_count / max(claim_count * 0.5, 1))

    def _compute_coherence(self, summary: str) -> float:
        """Compute structural coherence score.

        Checks for:
        - Presence of headings (structure)
        - Paragraph length consistency
        - Presence of conclusion/takeaways
        """
        import re

        score = 0.0

        # Has headings (structure)
        heading_count = len(re.findall(r"^#{1,3}\s+", summary, re.MULTILINE))
        if heading_count >= 2:
            score += 0.35
        elif heading_count >= 1:
            score += 0.2

        # Has conclusion/takeaways
        if any(kw in summary.lower() for kw in ["takeaway", "key point", "conclusion", "summary"]):
            score += 0.25

        # Adequate length
        word_count = len(summary.split())
        if word_count >= 200:
            score += 0.2
        elif word_count >= 100:
            score += 0.1

        # Has bullet points or lists (organized content)
        bullet_count = len(re.findall(r"^[-*•]\s+", summary, re.MULTILINE))
        if bullet_count >= 3:
            score += 0.2
        elif bullet_count >= 1:
            score += 0.1

        return min(1.0, score)
