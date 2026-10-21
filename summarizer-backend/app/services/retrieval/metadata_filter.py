from __future__ import annotations
"""Metadata Filter — builds Qdrant filters from query context.

Constructs structured filters for retrieval scoping based on
module code, week number, document type, and Bloom's level.
"""

from dataclasses import dataclass, field
from typing import Optional, Any

from qdrant_client import models


@dataclass
class FilterContext:
    """Context used to build retrieval filters."""

    module_code: str
    week_number: Optional[int] = None
    document_types: Optional[list[str]] = None
    bloom_levels: Optional[list[str]] = None
    exclude_document_ids: Optional[list[str]] = None
    only_parent_chunks: bool = False
    only_child_chunks: bool = False
    section_title: Optional[str] = None


class MetadataFilter:
    """Builds Qdrant filter conditions from structured filter context.

    Converts high-level query context into Qdrant-compatible
    filter objects for scoped retrieval.
    """

    def build(self, context: FilterContext) -> models.Filter:
        """Build a Qdrant filter from the filter context.

        Args:
            context: FilterContext with filtering criteria.

        Returns:
            Qdrant Filter object.
        """
        must: list[models.Condition] = []
        must_not: list[models.Condition] = []

        # Module code (always required)
        must.append(
            models.FieldCondition(
                key="module_code",
                match=models.MatchValue(value=context.module_code),
            )
        )

        # Week number
        if context.week_number is not None:
            must.append(
                models.FieldCondition(
                    key="week_number",
                    match=models.MatchValue(value=context.week_number),
                )
            )

        # Document types
        if context.document_types:
            must.append(
                models.FieldCondition(
                    key="document_type",
                    match=models.MatchAny(any=context.document_types),
                )
            )

        # Bloom's levels
        if context.bloom_levels:
            must.append(
                models.FieldCondition(
                    key="bloom_level",
                    match=models.MatchAny(any=context.bloom_levels),
                )
            )

        # Chunk type filtering
        if context.only_parent_chunks:
            must.append(
                models.FieldCondition(
                    key="chunk_type",
                    match=models.MatchValue(value="parent"),
                )
            )
        elif context.only_child_chunks:
            must.append(
                models.FieldCondition(
                    key="chunk_type",
                    match=models.MatchValue(value="child"),
                )
            )

        # Section title keyword match
        if context.section_title:
            must.append(
                models.FieldCondition(
                    key="section_title",
                    match=models.MatchText(text=context.section_title),
                )
            )

        # Exclusions
        if context.exclude_document_ids:
            for doc_id in context.exclude_document_ids:
                must_not.append(
                    models.FieldCondition(
                        key="document_id",
                        match=models.MatchValue(value=doc_id),
                    )
                )

        return models.Filter(
            must=must if must else None,
            must_not=must_not if must_not else None,
        )

    def build_from_dict(self, filters: dict[str, Any]) -> models.Filter:
        """Build a Qdrant filter from a simple key-value dict.

        Convenience method for ad-hoc filtering.
        """
        conditions = []
        for key, value in filters.items():
            if value is None:
                continue
            if isinstance(value, list):
                conditions.append(
                    models.FieldCondition(
                        key=key,
                        match=models.MatchAny(any=value),
                    )
                )
            elif isinstance(value, int):
                conditions.append(
                    models.FieldCondition(
                        key=key,
                        match=models.MatchValue(value=value),
                    )
                )
            else:
                conditions.append(
                    models.FieldCondition(
                        key=key,
                        match=models.MatchValue(value=str(value)),
                    )
                )

        return models.Filter(must=conditions)

    @staticmethod
    def infer_bloom_filter(query: str) -> Optional[list[str]]:
        """Infer which Bloom's levels the query targets.

        Analyzes query language to determine appropriate Bloom's
        taxonomy levels for filtering.
        """
        query_lower = query.lower()

        bloom_keywords = {
            "Remember": ["define", "list", "what is", "name", "identify"],
            "Understand": ["explain", "describe", "why", "how does", "compare"],
            "Apply": ["apply", "calculate", "solve", "implement", "demonstrate"],
            "Analyze": ["analyze", "compare and contrast", "difference between", "examine"],
            "Evaluate": ["evaluate", "trade-off", "pros and cons", "justify", "which is better"],
            "Create": ["design", "propose", "create", "develop a", "plan"],
        }

        matched_levels = []
        for level, keywords in bloom_keywords.items():
            for kw in keywords:
                if kw in query_lower:
                    matched_levels.append(level)
                    break

        return matched_levels if matched_levels else None
