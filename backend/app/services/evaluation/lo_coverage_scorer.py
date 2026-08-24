from __future__ import annotations
from typing import Optional, Union
"""LO Coverage Score (LOCS) — Novel Research Metric.

Measures the proportion of relevant learning outcomes that are
meaningfully addressed in a generated summary. This is one of the
primary research metrics for evaluating LOA-ESS effectiveness.

LOCS = |LOs addressed in summary| / |Total relevant Union[LOs, Each] LO is scored individually using:
1. Keyword presence (30%)
2. Semantic similarity (40%)
3. Bloom's depth matching (30%)
"""

from dataclasses import dataclass, field


@dataclass
class LOCoverageResult:
    """Result of LO Coverage Score computation."""

    overall_score: float = 0.0  # 0.0-1.0
    per_lo_scores: dict[str, float] = field(default_factory=dict)
    per_lo_details: dict[str, dict] = field(default_factory=dict)
    covered_count: int = 0
    total_count: int = 0
    coverage_threshold: float = 0.5  # LO is "covered" if score >= threshold


class LOCoverageScorer:
    """Computes the Learning Outcome Coverage Score (LOCS).

    This is a NOVEL METRIC (Research Contribution RC4).

    LOCS measures how well a generated summary addresses the curriculum's
    intended learning outcomes. Unlike ROUGE/BERTScore which measure
    surface-level text overlap, LOCS evaluates educational alignment.

    Scoring components per LO:
    - Keyword presence: Do topic keywords from the LO appear in the summary?
    - Semantic similarity: Is the LO's meaning represented in the summary?
    - Bloom's depth: Does the summary address the LO at the right cognitive level?
    """

    def __init__(self, embedding_fn=None, coverage_threshold: float = 0.5):
        """
        Args:
            embedding_fn: Async function to generate embeddings. If None,
                          only keyword-based scoring is used.
            coverage_threshold: Minimum score for an LO to be considered "covered".
        """
        self._embed = embedding_fn
        self.threshold = coverage_threshold

    async def compute(
        self,
        summary: str,
        learning_outcomes: list[dict],
    ) -> LOCoverageResult:
        """Compute LOCS for a summary against learning outcomes.

        Args:
            summary: The generated summary text.
            learning_outcomes: List of LO dicts with keys:
                - lo_code: str (e.g., "LO1")
                - text: str (full LO text)
                - bloom_level: str
                - topic_keywords: list[str] (optional)

        Returns:
            LOCoverageResult with overall and per-LO scores.
        """
        result = LOCoverageResult(
            total_count=len(learning_outcomes),
            coverage_threshold=self.threshold,
        )

        if not learning_outcomes:
            result.overall_score = 1.0
            return result

        summary_lower = summary.lower()

        for lo in learning_outcomes:
            lo_code = lo.get("lo_code", "LO?")
            lo_text = lo.get("text", "")
            bloom_level = lo.get("bloom_level", "Understand")
            keywords = lo.get("topic_keywords", [])

            # Component 1: Keyword Presence (30%)
            keyword_score = self._keyword_score(summary_lower, keywords, lo_text)

            # Component 2: Semantic Similarity (40%)
            semantic_score = await self._semantic_score(summary, lo_text) if self._embed else keyword_score

            # Component 3: Bloom's Depth Matching (30%)
            bloom_score = self._bloom_depth_score(summary_lower, bloom_level)

            # Weighted combination
            combined = (
                0.30 * keyword_score
                + 0.40 * semantic_score
                + 0.30 * bloom_score
            )

            result.per_lo_scores[lo_code] = round(combined, 4)
            result.per_lo_details[lo_code] = {
                "keyword_score": round(keyword_score, 4),
                "semantic_score": round(semantic_score, 4),
                "bloom_score": round(bloom_score, 4),
                "combined": round(combined, 4),
                "is_covered": combined >= self.threshold,
            }

            if combined >= self.threshold:
                result.covered_count += 1

        result.overall_score = result.covered_count / result.total_count
        return result

    def _keyword_score(
        self, summary_lower: str, keywords: list[str], lo_text: str
    ) -> float:
        """Score based on presence of LO keywords in the summary."""
        # Combine explicit keywords with extracted words from LO text
        all_keywords = set(kw.lower() for kw in keywords)

        # Extract meaningful words from LO text
        stopwords = {
            "the", "a", "an", "and", "or", "to", "of", "in", "for", "with",
            "on", "at", "by", "from", "be", "is", "are", "was", "were",
            "will", "should", "can", "able", "students", "student",
            "this", "that", "these", "those", "it", "its", "they",
        }
        lo_words = set(
            w.lower() for w in lo_text.split()
            if len(w) > 3 and w.lower() not in stopwords
        )
        all_keywords.update(lo_words)

        if not all_keywords:
            return 0.0

        found = sum(1 for kw in all_keywords if kw in summary_lower)
        return min(1.0, found / len(all_keywords))

    async def _semantic_score(self, summary: str, lo_text: str) -> float:
        """Score based on embedding similarity between summary and LO text."""
        if not self._embed:
            return 0.0

        try:
            summary_emb = await self._embed(summary[:2000])  # Truncate for efficiency
            lo_emb = await self._embed(lo_text)
            return self._cosine_similarity(summary_emb, lo_emb)
        except Exception:
            return 0.0

    def _bloom_depth_score(self, summary_lower: str, bloom_level: str) -> float:
        """Score whether the summary addresses content at the right Bloom's level.

        Checks for presence of indicators appropriate to the Bloom's level.
        """
        bloom_indicators = {
            "Remember": [
                "define", "list", "identify", "name", "state",
                "recall", "definition", "key terms",
            ],
            "Understand": [
                "explain", "describe", "means", "because", "therefore",
                "in other words", "for example", "such as",
            ],
            "Apply": [
                "apply", "example", "step", "procedure", "solve",
                "calculate", "demonstrate", "implement", "solution",
            ],
            "Analyze": [
                "compare", "contrast", "difference", "relationship",
                "component", "structure", "analyze", "distinguish",
            ],
            "Evaluate": [
                "evaluate", "trade-off", "advantage", "disadvantage",
                "pros", "cons", "criteria", "judgment", "assess", "justify",
            ],
            "Create": [
                "design", "create", "propose", "develop", "plan",
                "synthesize", "construct", "novel", "framework",
            ],
        }

        indicators = bloom_indicators.get(bloom_level, bloom_indicators["Understand"])
        found = sum(1 for ind in indicators if ind in summary_lower)
        return min(1.0, found / max(len(indicators) * 0.3, 1))

    @staticmethod
    def _cosine_similarity(vec1: list[float], vec2: list[float]) -> float:
        """Compute cosine similarity between two vectors."""
        dot = sum(a * b for a, b in zip(vec1, vec2))
        norm1 = sum(a * a for a in vec1) ** 0.5
        norm2 = sum(b * b for b in vec2) ** 0.5
        if norm1 == 0 or norm2 == 0:
            return 0.0
        return dot / (norm1 * norm2)
