"""Tests for the Education-Aware Chunker."""

import pytest

from app.services.processing.chunker import EducationAwareChunker, EducationalChunk


@pytest.fixture
def chunker():
    return EducationAwareChunker(max_chunk_tokens=500, min_chunk_tokens=50, overlap_tokens=50)


class TestEducationAwareChunker:
    """Tests for the education-aware chunking strategies."""

    def test_chunk_pptx_creates_children(self, chunker):
        """PPTX chunking should create child chunks for each slide."""
        slides = [
            {"slide_number": 1, "title": "Introduction", "full_text": "This is the introduction slide with important concepts about databases." * 5, "has_images": False, "has_tables": False},
            {"slide_number": 2, "title": "Key Concepts", "full_text": "Key database concepts include entities, attributes, and relationships." * 5, "has_images": True, "has_tables": False},
            {"slide_number": 3, "title": "Key Concepts Cont.", "full_text": "More about entities: each entity represents a real-world object." * 5, "has_images": False, "has_tables": True},
        ]

        chunks = chunker.chunk_pptx(slides, module_code="IT2060", week_number=1)

        # Should have both parent and child chunks
        children = [c for c in chunks if c.chunk_type == "child"]
        parents = [c for c in chunks if c.chunk_type == "parent"]

        assert len(children) == 3
        assert len(parents) >= 1

    def test_chunk_pptx_preserves_metadata(self, chunker):
        """Chunks should carry module and week metadata."""
        slides = [
            {"slide_number": 1, "title": "Test", "full_text": "Content about normalization techniques in databases." * 3, "has_images": False, "has_tables": False},
        ]

        chunks = chunker.chunk_pptx(slides, module_code="IT2060", week_number=5)
        child_chunks = [c for c in chunks if c.chunk_type == "child"]

        assert len(child_chunks) >= 1
        assert child_chunks[0].metadata["module_code"] == "IT2060"
        assert child_chunks[0].metadata["week_number"] == 5

    def test_chunk_pdf_notes_splits_at_headings(self, chunker):
        """PDF notes should be split at section headings."""
        text = """# Introduction to Databases
A database is an organized collection of structured data.

# Data Models
There are several types of data models used in database design.

# Normalization
Normalization is the process of organizing data to reduce redundancy."""

        chunks = chunker.chunk_pdf_notes(text, module_code="IT2060")
        assert len(chunks) >= 3  # At least one per heading

    def test_chunk_lab_sheet_splits_at_exercises(self, chunker):
        """Lab sheets should be split at exercise boundaries."""
        text = """Exercise 1: Create a simple database table
Write SQL to create a Student table with id, name, and email columns.

Exercise 2: Insert data
Insert at least 5 records into the Student table created above.

Exercise 3: Query data
Write SELECT queries to retrieve specific records from the table."""

        chunks = chunker.chunk_lab_sheet(text, module_code="IT2060")
        assert len(chunks) >= 3

    def test_code_detection(self, chunker):
        """Chunks containing code should be flagged."""
        text = """## SQL Example

```sql
SELECT name, email
FROM students
WHERE gpa > 3.5;
```

This query retrieves all students with GPA above 3.5."""

        chunks = chunker.chunk_pdf_notes(text)
        code_chunks = [c for c in chunks if c.has_code]
        assert len(code_chunks) >= 1

    def test_token_counting(self, chunker):
        """Token count should be populated for all chunks."""
        text = "This is a simple test sentence for token counting. " * 20
        chunks = chunker.chunk_pdf_notes(text)

        for chunk in chunks:
            assert chunk.token_count > 0

    def test_empty_input(self, chunker):
        """Empty input should return no chunks."""
        assert chunker.chunk_pdf_notes("") == []
        assert chunker.chunk_pptx([]) == []
        assert chunker.chunk_lab_sheet("") == []

    def test_parent_child_linking(self, chunker):
        """Child chunks should be linked to parent chunks."""
        slides = [
            {"slide_number": i, "title": "Topic A", "full_text": f"Content for slide {i} about topic A. " * 10, "has_images": False, "has_tables": False}
            for i in range(1, 5)
        ]

        chunks = chunker.chunk_pptx(slides, module_code="IT2060")
        children = [c for c in chunks if c.chunk_type == "child"]
        parents = [c for c in chunks if c.chunk_type == "parent"]

        # Children of the same topic group should reference the same parent
        if parents:
            parent_id = parents[0].id
            linked_children = [c for c in children if c.parent_id == parent_id]
            assert len(linked_children) >= 1
