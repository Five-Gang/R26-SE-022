from __future__ import annotations
"""Education-Aware Chunker — splits documents preserving pedagogical structure.

This is a research contribution: a hybrid chunking strategy that respects
educational boundaries (slides, sections, exercises) rather than
applying generic fixed-size or recursive splitting.
"""

import re
import uuid
from dataclasses import dataclass, field
from typing import Union, Optional, Literal

import tiktoken


@dataclass
class EducationalChunk:
    """A semantically coherent chunk of educational content."""

    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    content: str = ""
    chunk_type: Literal["parent", "child", "standalone"] = "standalone"
    parent_id: Optional[str] = None
    token_count: int = 0
    metadata: dict = field(default_factory=dict)
    # Source location
    page_number: Optional[int] = None
    slide_number: Optional[int] = None
    section_title: Optional[str] = None
    # Content flags
    has_code: bool = False
    has_table: bool = False
    has_image: bool = False


class EducationAwareChunker:
    """Splits educational documents into chunks that preserve pedagogical structure.

    Strategy varies by document type:
    - PPTX: Slide-level child chunks, topic-grouped parent chunks
    - PDF lecture notes: Section-boundary splits with semantic coherence
    - Lab sheets: Exercise/problem boundary splits
    - Module outlines: LO-level splits

    Parameters:
        max_chunk_tokens: Maximum tokens per chunk (default 500)
        min_chunk_tokens: Minimum tokens per chunk (default 100)
        overlap_tokens: Token overlap between consecutive chunks (default 50)
    """

    def __init__(
        self,
        max_chunk_tokens: int = 500,
        min_chunk_tokens: int = 100,
        overlap_tokens: int = 50,
    ):
        self.max_tokens = max_chunk_tokens
        self.min_tokens = min_chunk_tokens
        self.overlap_tokens = overlap_tokens
        self._tokenizer = tiktoken.get_encoding("cl100k_base")

    def count_tokens(self, text: str) -> int:
        """Count tokens in text using tiktoken."""
        return len(self._tokenizer.encode(text))

    def chunk_pptx(
        self,
        slides: list[dict],
        module_code: str = "",
        week_number: Optional[int] = None,
    ) -> list[EducationalChunk]:
        """Chunk PPTX content using slide-aware strategy.

        Each slide becomes a child chunk. Consecutive slides on the same topic
        are grouped into parent chunks.

        Args:
            slides: List of extracted slide dicts with 'slide_number', 'title',
                    'full_text', 'has_images', etc.
        """
        children = []
        for slide in slides:
            text = slide.get("full_text", "").strip()
            if not text or len(text) < 20:
                continue

            chunk = EducationalChunk(
                content=text,
                chunk_type="child",
                token_count=self.count_tokens(text),
                slide_number=slide.get("slide_number"),
                section_title=slide.get("title", ""),
                has_image=slide.get("has_images", False),
                has_table=slide.get("has_tables", False),
                has_code=self._detect_code(text),
                metadata={
                    "module_code": module_code,
                    "week_number": week_number,
                    "document_type": "lecture_slide",
                    "slide_number": slide.get("slide_number"),
                    "slide_title": slide.get("title", ""),
                },
            )
            children.append(chunk)

        # Group children into parents by topic similarity
        parents = self._group_slides_into_parents(children, module_code, week_number)

        return parents + children

    def chunk_pdf_notes(
        self,
        text: str,
        module_code: str = "",
        week_number: Optional[int] = None,
    ) -> list[EducationalChunk]:
        """Chunk PDF lecture notes using section-aware strategy.

        Split at heading boundaries, then sub-split large sections.
        """
        sections = self._split_at_headings(text)
        chunks = []

        for section in sections:
            section_text = section["text"].strip()
            if not section_text or len(section_text) < 30:
                continue

            token_count = self.count_tokens(section_text)

            if token_count <= self.max_tokens:
                # Section fits in one chunk
                chunk = EducationalChunk(
                    content=section_text,
                    chunk_type="standalone",
                    token_count=token_count,
                    section_title=section.get("title"),
                    has_code=self._detect_code(section_text),
                    has_table=self._detect_table(section_text),
                    metadata={
                        "module_code": module_code,
                        "week_number": week_number,
                        "document_type": "lecture_note",
                        "section_title": section.get("title", ""),
                    },
                )
                chunks.append(chunk)
            else:
                # Sub-split large sections
                sub_chunks = self._recursive_split(
                    section_text,
                    section_title=section.get("title"),
                    module_code=module_code,
                    week_number=week_number,
                    doc_type="lecture_note",
                )
                chunks.extend(sub_chunks)

        return chunks

    def chunk_lab_sheet(
        self,
        text: str,
        module_code: str = "",
        week_number: Optional[int] = None,
    ) -> list[EducationalChunk]:
        """Chunk lab sheets at exercise/problem boundaries."""
        exercises = self._split_at_exercises(text)
        chunks = []

        for i, exercise in enumerate(exercises, 1):
            ex_text = exercise.strip()
            if not ex_text or len(ex_text) < 30:
                continue

            chunk = EducationalChunk(
                content=ex_text,
                chunk_type="standalone",
                token_count=self.count_tokens(ex_text),
                section_title=f"Exercise {i}",
                has_code=self._detect_code(ex_text),
                metadata={
                    "module_code": module_code,
                    "week_number": week_number,
                    "document_type": "lab_sheet",
                    "exercise_number": i,
                },
            )
            chunks.append(chunk)

        return chunks

    def chunk_module_outline(self, text: str, module_code: str = "") -> list[EducationalChunk]:
        """Chunk module outline into structured sections (LOs, weeks, assessment)."""
        chunks = []

        # Split at major section boundaries
        sections = self._split_at_headings(text)
        for section in sections:
            section_text = section["text"].strip()
            if not section_text or len(section_text) < 20:
                continue

            chunk = EducationalChunk(
                content=section_text,
                chunk_type="standalone",
                token_count=self.count_tokens(section_text),
                section_title=section.get("title"),
                metadata={
                    "module_code": module_code,
                    "document_type": "module_outline",
                    "section_title": section.get("title", ""),
                },
            )
            chunks.append(chunk)

        return chunks

    def _split_at_headings(self, text: str) -> list[dict]:
        """Split text at heading boundaries."""
        # Common heading patterns
        heading_pattern = r"^(#{1,3}\s+.+|[A-Z][A-Za-z\s]{3,}:|\d+\.\s+[A-Z].+)$"

        lines = text.split("\n")
        sections = []
        current_section = {"title": "", "text": ""}

        for line in lines:
            if re.match(heading_pattern, line.strip(), re.MULTILINE):
                # Save current section
                if current_section["text"].strip():
                    sections.append(current_section)
                # Start new section
                current_section = {
                    "title": line.strip().lstrip("#").strip().rstrip(":"),
                    "text": line + "\n",
                }
            else:
                current_section["text"] += line + "\n"

        # Don't forget the last section
        if current_section["text"].strip():
            sections.append(current_section)

        return sections

    def _recursive_split(
        self,
        text: str,
        section_title: Optional[str] = None,
        module_code: str = "",
        week_number: Optional[int] = None,
        doc_type: str = "lecture_note",
    ) -> list[EducationalChunk]:
        """Recursively split text that exceeds max_tokens.

        Split order: paragraphs → sentences → hard token limit.
        """
        chunks = []
        paragraphs = text.split("\n\n")
        current_text = ""
        current_tokens = 0

        for para in paragraphs:
            para_tokens = self.count_tokens(para)

            if current_tokens + para_tokens <= self.max_tokens:
                current_text += para + "\n\n"
                current_tokens += para_tokens
            else:
                # Save current chunk
                if current_text.strip() and current_tokens >= self.min_tokens:
                    chunks.append(
                        EducationalChunk(
                            content=current_text.strip(),
                            chunk_type="standalone",
                            token_count=current_tokens,
                            section_title=section_title,
                            has_code=self._detect_code(current_text),
                            has_table=self._detect_table(current_text),
                            metadata={
                                "module_code": module_code,
                                "week_number": week_number,
                                "document_type": doc_type,
                                "section_title": section_title or "",
                            },
                        )
                    )

                # Handle paragraph larger than max_tokens
                if para_tokens > self.max_tokens:
                    # Split by sentences
                    sentences = re.split(r"(?<=[.!?])\s+", para)
                    current_text = ""
                    current_tokens = 0
                    for sent in sentences:
                        sent_tokens = self.count_tokens(sent)
                        if current_tokens + sent_tokens <= self.max_tokens:
                            current_text += sent + " "
                            current_tokens += sent_tokens
                        else:
                            if current_text.strip():
                                chunks.append(
                                    EducationalChunk(
                                        content=current_text.strip(),
                                        chunk_type="standalone",
                                        token_count=current_tokens,
                                        section_title=section_title,
                                        metadata={
                                            "module_code": module_code,
                                            "week_number": week_number,
                                            "document_type": doc_type,
                                        },
                                    )
                                )
                            current_text = sent + " "
                            current_tokens = sent_tokens
                else:
                    current_text = para + "\n\n"
                    current_tokens = para_tokens

        # Final chunk
        if current_text.strip() and current_tokens >= self.min_tokens:
            chunks.append(
                EducationalChunk(
                    content=current_text.strip(),
                    chunk_type="standalone",
                    token_count=current_tokens,
                    section_title=section_title,
                    has_code=self._detect_code(current_text),
                    has_table=self._detect_table(current_text),
                    metadata={
                        "module_code": module_code,
                        "week_number": week_number,
                        "document_type": doc_type,
                        "section_title": section_title or "",
                    },
                )
            )

        return chunks

    def _group_slides_into_parents(
        self,
        children: list[EducationalChunk],
        module_code: str,
        week_number: Optional[int],
    ) -> list[EducationalChunk]:
        """Group consecutive slides by topic into parent chunks."""
        if not children:
            return []

        parents = []
        current_group = [children[0]]

        for i in range(1, len(children)):
            current_title = children[i].section_title or ""
            prev_title = children[i - 1].section_title or ""

            # Group slides with similar titles or consecutive slides without titles
            if self._titles_related(prev_title, current_title):
                current_group.append(children[i])
            else:
                # Create parent for current group
                parent = self._create_parent_chunk(current_group, module_code, week_number)
                if parent:
                    parents.append(parent)
                    # Link children to parent
                    for child in current_group:
                        child.parent_id = parent.id
                current_group = [children[i]]

        # Handle last group
        if current_group:
            parent = self._create_parent_chunk(current_group, module_code, week_number)
            if parent:
                parents.append(parent)
                for child in current_group:
                    child.parent_id = parent.id

        return parents

    def _create_parent_chunk(
        self,
        children: list[EducationalChunk],
        module_code: str,
        week_number: Optional[int],
    ) -> Optional[EducationalChunk]:
        """Create a parent chunk from a group of child chunks."""
        if not children:
            return None

        combined_text = "\n\n".join(c.content for c in children)
        title = children[0].section_title or f"Slides {children[0].slide_number}-{children[-1].slide_number}"

        return EducationalChunk(
            content=combined_text,
            chunk_type="parent",
            token_count=self.count_tokens(combined_text),
            section_title=title,
            slide_number=children[0].slide_number,
            has_code=any(c.has_code for c in children),
            has_table=any(c.has_table for c in children),
            has_image=any(c.has_image for c in children),
            metadata={
                "module_code": module_code,
                "week_number": week_number,
                "document_type": "lecture_slide",
                "child_count": len(children),
                "slide_range": f"{children[0].slide_number}-{children[-1].slide_number}",
            },
        )

    def _titles_related(self, title1: str, title2: str) -> bool:
        """Check if two slide titles are related (same topic section)."""
        if not title1 or not title2:
            return True  # Group slides without titles
        # Simple heuristic: same first word or one contains the other
        t1_words = set(title1.lower().split())
        t2_words = set(title2.lower().split())
        overlap = t1_words & t2_words
        return len(overlap) > 0

    def _split_at_exercises(self, text: str) -> list[str]:
        """Split text at exercise/problem boundaries."""
        patterns = [
            r"\n(?=(?:Union[Exercise, Union[Problem], Union[Task], Union[Question], Activity])\s+\d+)",
            r"\n(?=\d+\.\s+(?:Union[Exercise, Union[Problem], Union[Task], Question]))",
            r"\n(?=Q\d+[.:)])",
        ]
        for pattern in patterns:
            parts = re.split(pattern, text, flags=re.IGNORECASE)
            if len(parts) > 1:
                return parts
        # Fallback: split by numbered items
        parts = re.split(r"\n(?=\d+[.)]\s)", text)
        return parts if len(parts) > 1 else [text]

    def _detect_code(self, text: str) -> bool:
        """Detect if text contains code snippets."""
        code_indicators = [
            r"```",
            r"def\s+\w+\(",
            r"class\s+\w+",
            r"import\s+\w+",
            r"SELECT\s+.+FROM",
            r"CREATE\s+TABLE",
            r"function\s+\w+\(",
            r"public\s+(?:Union[class, Union[static], void])",
        ]
        return any(re.search(p, text, re.IGNORECASE) for p in code_indicators)

    def _detect_table(self, text: str) -> bool:
        """Detect if text contains table-like content."""
        return bool(re.search(r"\|.*\|.*\|", text))
