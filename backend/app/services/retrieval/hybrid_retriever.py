from __future__ import annotations
from typing import Optional, Union
"""Hybrid Retriever — combines dense (vector) and sparse (BM25) retrieval.

Implements reciprocal rank fusion (RRF) to merge results from
dense embeddings and keyword-based BM25 search.
"""

import re
from collections import defaultdict
from dataclasses import dataclass, field

from app.services.processing.embedding_service import EmbeddingService


@dataclass
class HybridResult:
    """Result from hybrid retrieval."""

    id: str
    content: str
    rrf_score: float
    dense_rank: Optional[int] = None
    sparse_rank: Optional[int] = None
    metadata: dict = field(default_factory=dict)


class HybridRetriever:
    """Combines dense (vector) and sparse (BM25) retrieval with RRF fusion.

    Dense retrieval captures semantic meaning while BM25 catches
    exact keyword matches. Reciprocal Rank Fusion (RRF) merges
    rankings from both retrievers.

    RRF(d) = Σ 1 / (k + rank_i(d))
    where k=60 (standard constant).
    """

    def __init__(
        self,
        embedding_service: EmbeddingService,
        alpha: float = 0.7,
        rrf_k: int = 60,
    ):
        """
        Args:
            embedding_service: Embedding and vector search service.
            alpha: Weight for dense retrieval (1-alpha for sparse).
            rrf_k: RRF constant (default 60).
        """
        self.embedding_service = embedding_service
        self.alpha = alpha
        self.rrf_k = rrf_k
        self._bm25_index: dict[str, Optional["BM25Lite"]] = None

    async def retrieve(
        self,
        query: str,
        module_code: str,
        week_number: Optional[int] = None,
        top_k: int = 20,
    ) -> list[HybridResult]:
        """Execute hybrid retrieval combining dense + sparse.

        Args:
            query: User query string.
            module_code: Module code for filtering.
            week_number: Optional week for scoping.
            top_k: Number of results to return.

        Returns:
            List of HybridResult sorted by RRF score.
        """
        # Build filters
        filters = {"module_code": module_code}
        if week_number:
            filters["week_number"] = week_number

        # ── Dense retrieval ──
        query_embedding = await self.embedding_service.embed_text(query)
        dense_results = await self.embedding_service.search_chunks(
            query_vector=query_embedding,
            filters=filters,
            limit=top_k * 2,
        )

        # ── Sparse retrieval (BM25 via Qdrant scroll + local scoring) ──
        sparse_results = self._bm25_search(query, dense_results, top_k * 2)

        # ── Reciprocal Rank Fusion ──
        fused = self._reciprocal_rank_fusion(dense_results, sparse_results, top_k)

        return fused

    def _bm25_search(
        self,
        query: str,
        candidates: list[dict],
        top_k: int,
    ) -> list[dict]:
        """Local BM25-style keyword scoring on candidate chunks.

        Since we don't have a separate BM25 index, we re-score
        the dense-retrieved candidates using TF-IDF-like scoring.
        """
        query_terms = self._tokenize(query)
        if not query_terms or not candidates:
            return candidates

        # Compute document frequencies
        doc_count = len(candidates)
        df: dict[str, int] = defaultdict(int)
        doc_tokens: list[list[str]] = []

        for chunk in candidates:
            tokens = self._tokenize(chunk.get("content", ""))
            doc_tokens.append(tokens)
            for term in set(tokens):
                df[term] += 1

        # Average document length
        avg_dl = sum(len(t) for t in doc_tokens) / max(doc_count, 1)

        # BM25 parameters
        k1 = 1.5
        b = 0.75

        scored = []
        for i, chunk in enumerate(candidates):
            tokens = doc_tokens[i]
            dl = len(tokens)
            score = 0.0

            tf_map: dict[str, int] = defaultdict(int)
            for t in tokens:
                tf_map[t] += 1

            for term in query_terms:
                if term not in tf_map:
                    continue
                tf = tf_map[term]
                n = df.get(term, 0)

                # IDF (BM25 variant)
                import math
                idf = math.log((doc_count - n + 0.5) / (n + 0.5) + 1.0)

                # TF normalization
                tf_norm = (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * dl / avg_dl))

                score += idf * tf_norm

            scored.append({**chunk, "bm25_score": score})

        scored.sort(key=lambda x: x["bm25_score"], reverse=True)
        return scored[:top_k]

    def _reciprocal_rank_fusion(
        self,
        dense_results: list[dict],
        sparse_results: list[dict],
        top_k: int,
    ) -> list[HybridResult]:
        """Merge dense and sparse rankings using RRF."""
        rrf_scores: dict[str, float] = defaultdict(float)
        chunk_data: dict[str, dict] = {}
        dense_ranks: dict[str, int] = {}
        sparse_ranks: dict[str, int] = {}

        # Assign RRF scores from dense results
        for rank, chunk in enumerate(dense_results, 1):
            cid = chunk["id"]
            rrf_scores[cid] += self.alpha * (1.0 / (self.rrf_k + rank))
            chunk_data[cid] = chunk
            dense_ranks[cid] = rank

        # Assign RRF scores from sparse results
        for rank, chunk in enumerate(sparse_results, 1):
            cid = chunk["id"]
            rrf_scores[cid] += (1 - self.alpha) * (1.0 / (self.rrf_k + rank))
            if cid not in chunk_data:
                chunk_data[cid] = chunk
            sparse_ranks[cid] = rank

        # Sort by RRF score
        sorted_ids = sorted(rrf_scores.keys(), key=lambda x: rrf_scores[x], reverse=True)

        results = []
        for cid in sorted_ids[:top_k]:
            chunk = chunk_data[cid]
            results.append(
                HybridResult(
                    id=cid,
                    content=chunk.get("content", ""),
                    rrf_score=rrf_scores[cid],
                    dense_rank=dense_ranks.get(cid),
                    sparse_rank=sparse_ranks.get(cid),
                    metadata=chunk.get("metadata", {}),
                )
            )

        return results

    @staticmethod
    def _tokenize(text: str) -> list[str]:
        """Simple whitespace + punctuation tokenizer."""
        text = text.lower()
        tokens = re.findall(r"\b[a-z]{2,}\b", text)
        # Remove common stopwords
        stopwords = {
            "the", "a", "an", "and", "or", "to", "of", "in", "for", "with",
            "on", "at", "by", "from", "is", "are", "was", "were", "be",
            "this", "that", "it", "its", "as", "not", "but", "if", "can",
        }
        return [t for t in tokens if t not in stopwords]
