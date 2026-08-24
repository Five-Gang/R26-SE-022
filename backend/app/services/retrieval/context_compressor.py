from __future__ import annotations
from typing import Optional, Union
"""Context Compressor — reduces redundancy in retrieved chunks.

Removes overlapping content across chunks and prioritizes
LO-relevant sentences to fit within LLM context budgets.
"""

import re
from dataclasses import dataclass


@dataclass
class CompressedContext:
    """Result of context compression."""
    text: str
    original_token_count: int
    compressed_token_count: int
    compression_ratio: float
    chunks_used: int
    removed_sentences: int


class ContextCompressor:
    """Compresses retrieved context by removing redundancy.

    Strategies:
    1. Sentence-level deduplication (exact and near-duplicate)
    2. LO-relevance filtering (keep LO-aligned sentences)
    3. Token budget enforcement

    This reduces API cost and improves signal-to-noise ratio.
    """

    def __init__(self, max_tokens: int = 4000, similarity_threshold: float = 0.85):
        self.max_tokens = max_tokens
        self.similarity_threshold = similarity_threshold

    def compress(
        self,
        chunks: list[dict],
        learning_outcomes: Optional[list[dict]] = None,
    ) -> CompressedContext:
        """Compress retrieved chunks by removing redundancy.

        Args:
            chunks: Retrieved chunks with 'content' and 'metadata'.
            learning_outcomes: Optional LOs for relevance-based filtering.

        Returns:
            CompressedContext with deduplicated, compressed text.
        """
        import tiktoken
        tokenizer = tiktoken.get_encoding("cl100k_base")

        # Collect all sentences across chunks
        all_sentences = []
        for chunk in chunks:
            content = chunk.get("content", "")
            sentences = self._split_sentences(content)
            for sent in sentences:
                all_sentences.append({
                    "text": sent,
                    "source": chunk.get("metadata", {}),
                    "chunk_id": chunk.get("id", ""),
                    "matched_lo": chunk.get("metadata", {}).get("matched_lo_id"),
                })

        original_count = len(all_sentences)
        original_text = "\n".join(s["text"] for s in all_sentences)
        original_tokens = len(tokenizer.encode(original_text))

        # Step 1: Remove exact duplicates
        seen = set()
        deduped = []
        for sent in all_sentences:
            normalized = sent["text"].strip().lower()
            if normalized not in seen and len(normalized) > 10:
                seen.add(normalized)
                deduped.append(sent)

        # Step 2: Remove near-duplicates (high word overlap)
        filtered = self._remove_near_duplicates(deduped)

        # Step 3: Prioritize LO-relevant sentences if over budget
        if learning_outcomes:
            lo_keywords = set()
            for lo in learning_outcomes:
                for kw in lo.get("topic_keywords", []):
                    lo_keywords.add(kw.lower())
                for word in lo.get("text", "").lower().split():
                    if len(word) > 3:
                        lo_keywords.add(word)

            # Score sentences by LO relevance
            for sent in filtered:
                words = set(sent["text"].lower().split())
                overlap = words & lo_keywords
                sent["lo_score"] = len(overlap) / max(len(lo_keywords), 1)
                # Boost sentences from LO-anchored retrieval
                if sent.get("matched_lo"):
                    sent["lo_score"] += 0.2

            # Sort by LO relevance
            filtered.sort(key=lambda s: s.get("lo_score", 0), reverse=True)

        # Step 4: Enforce token budget
        result_sentences = []
        current_tokens = 0
        for sent in filtered:
            sent_tokens = len(tokenizer.encode(sent["text"]))
            if current_tokens + sent_tokens <= self.max_tokens:
                result_sentences.append(sent)
                current_tokens += sent_tokens
            elif current_tokens > self.max_tokens * 0.8:
                break

        compressed_text = "\n".join(s["text"] for s in result_sentences)
        compressed_tokens = len(tokenizer.encode(compressed_text))

        return CompressedContext(
            text=compressed_text,
            original_token_count=original_tokens,
            compressed_token_count=compressed_tokens,
            compression_ratio=compressed_tokens / max(original_tokens, 1),
            chunks_used=len(set(s.get("chunk_id", "") for s in result_sentences)),
            removed_sentences=original_count - len(result_sentences),
        )

    def _split_sentences(self, text: str) -> list[str]:
        """Split text into sentences."""
        sentences = re.split(r"(?<=[.!?])\s+", text)
        return [s.strip() for s in sentences if s.strip()]

    def _remove_near_duplicates(self, sentences: list[dict]) -> list[dict]:
        """Remove sentences with high word overlap (near-duplicates)."""
        filtered = []
        for sent in sentences:
            words = set(sent["text"].lower().split())
            is_dup = False
            for existing in filtered:
                existing_words = set(existing["text"].lower().split())
                if not words or not existing_words:
                    continue
                overlap = len(words & existing_words) / min(len(words), len(existing_words))
                if overlap > self.similarity_threshold:
                    is_dup = True
                    break
            if not is_dup:
                filtered.append(sent)
        return filtered
