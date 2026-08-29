from __future__ import annotations
"""Cross-Encoder Re-ranker — re-scores retrieved chunks for relevance.

Uses a cross-encoder model that sees query and chunk together,
providing more accurate relevance scoring than bi-encoder retrieval.
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
    """Re-ranks retrieved chunks using a cross-encoder model.

    Cross-encoders are more accurate than bi-encoders because they
    process query and document together, capturing fine-grained
    interactions. However, they are slower — hence used only on
    pre-filtered top-k results.

    Models:
    - Local: cross-encoder/ms-marco-MiniLM-L-6-v2 (free, ~50ms/batch)
    - API: Cohere Rerank (higher accuracy, $1/1K queries)
    """

    def __init__(self, model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"):
        self.model_name = model_name
        self._model = None

    def _load_model(self):
        """Lazy-load the cross-encoder model."""
        if self._model is None:
            from sentence_transformers import CrossEncoder
            self._model = CrossEncoder(self.model_name)

    def rerank(
        self,
        query: str,
        chunks: list[dict],
        top_k: int = 10,
    ) -> list[RankedChunk]:
        """Re-rank chunks against the query using cross-encoder scoring.

        Args:
            query: The combined query string (may include LO text).
            chunks: List of chunk dicts with 'id', 'content', 'score', 'metadata'.
            top_k: Number of top-ranked chunks to return.

        Returns:
            Top-k chunks sorted by cross-encoder score.
        """
        if not chunks:
            return []

        self._load_model()

        # Prepare query-document pairs
        pairs = [(query, chunk["content"]) for chunk in chunks]

        # Score all pairs
        scores = self._model.predict(pairs)

        # Combine with original data
        ranked = []
        for chunk, score in zip(chunks, scores):
            ranked.append(
                RankedChunk(
                    id=chunk["id"],
                    content=chunk["content"],
                    original_score=chunk.get("score", 0.0),
                    rerank_score=float(score),
                    metadata=chunk.get("metadata", {}),
                )
            )

        # Sort by rerank score descending
        ranked.sort(key=lambda x: x.rerank_score, reverse=True)

        return ranked[:top_k]

    def rerank_with_lo_boost(
        self,
        query: str,
        learning_outcomes: list[dict],
        chunks: list[dict],
        top_k: int = 10,
        lo_boost: float = 0.1,
    ) -> list[RankedChunk]:
        """Re-rank with additional boost for LO-aligned chunks.

        Chunks that matched via LO-anchored retrieval get a score
        boost after re-ranking, ensuring LO coverage is maintained.

        Args:
            query: User query.
            learning_outcomes: List of relevant LO dicts.
            chunks: Retrieved chunks.
            top_k: Number to return.
            lo_boost: Score boost for LO-aligned chunks.
        """
        # Build combined query with LOs for re-ranking
        lo_text = "; ".join(lo.get("text", "") for lo in learning_outcomes)
        combined_query = f"{query} | Learning Outcomes: {lo_text}"

        ranked = self.rerank(combined_query, chunks, top_k=len(chunks))

        # Apply LO boost
        for chunk in ranked:
            if chunk.metadata.get("matched_lo_id"):
                chunk.rerank_score += lo_boost

        # Re-sort after boost
        ranked.sort(key=lambda x: x.rerank_score, reverse=True)

        return ranked[:top_k]
