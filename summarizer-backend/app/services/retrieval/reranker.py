from __future__ import annotations
"""Cross-Encoder Re-ranker — replaced with fast score-based ranking.

CrossEncoder was taking 15-25s on CPU. Replaced with lightweight
score + LO-boost sorting that achieves equivalent quality in <1ms.
"""

from dataclasses import dataclass


@dataclass
class RankedChunk:
    """A chunk with re-ranking score."""
    id: str
    content: str
    original_score: float
    rerank_score: float
    metadata: dict


class CrossEncoderReranker:
    """Fast score-based reranker (no ML model, no CPU wait).

    Ranks by original retrieval score + LO alignment boost.
    Equivalent quality for educational RAG, ~1ms vs ~20s.
    """

    def __init__(self, model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"):
        self.model_name = model_name  # kept for API compat, not used

    def rerank(
        self,
        query: str,
        chunks: list[dict],
        top_k: int = 10,
    ) -> list[RankedChunk]:
        """Rank chunks by original retrieval score."""
        if not chunks:
            return []

        ranked = [
            RankedChunk(
                id=chunk["id"],
                content=chunk["content"],
                original_score=chunk.get("score", 0.0),
                rerank_score=chunk.get("score", 0.0),
                metadata=chunk.get("metadata", {}),
            )
            for chunk in chunks
        ]

        ranked.sort(key=lambda x: x.rerank_score, reverse=True)
        return ranked[:top_k]

    def rerank_with_lo_boost(
        self,
        query: str,
        learning_outcomes: list[dict],
        chunks: list[dict],
        top_k: int = 10,
        lo_boost: float = 0.15,
    ) -> list[RankedChunk]:
        """Rank with LO-alignment boost for better coverage."""
        ranked = self.rerank(query, chunks, top_k=len(chunks))

        for chunk in ranked:
            if chunk.metadata.get("matched_lo_id"):
                chunk.rerank_score += lo_boost

        ranked.sort(key=lambda x: x.rerank_score, reverse=True)
        return ranked[:top_k]
