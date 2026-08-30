from __future__ import annotations
from typing import Optional, Union
"""PDF Parser Service — extracts text and structure from PDF documents.

Uses PyMuPDF (fitz) for high-performance text extraction with layout
preservation. Falls back to OCR for scanned PDFs.
"""

import re
from dataclasses import dataclass, field
from pathlib import Path

import fitz  # PyMuPDF


@dataclass
class ExtractedPage:
    """Represents extracted content from a single PDF page."""

    page_number: int
    text: str
    has_images: bool = False
    has_tables: bool = False
    image_count: int = 0
    char_count: int = 0


@dataclass
class PDFExtractionResult:
    """Complete extraction result from a PDF document."""

    pages: list[ExtractedPage] = field(default_factory=list)
    full_text: str = ""
    page_count: int = 0
    metadata: dict = field(default_factory=dict)
    needs_ocr: bool = False
    extraction_quality: float = 1.0  # 0.0-1.0

    @property
    def total_chars(self) -> int:
        return sum(p.char_count for p in self.pages)


class PDFParser:
    """Extracts text and structure from PDF files using PyMuPDF.

    Handles:
    - Multi-column layouts
    - Headers and footers (stripped)
    - Tables (basic detection)
    - Image detection
    - OCR fallback detection (when text extraction yields poor results)
    """

    # Minimum characters per page to consider text extraction successful
    MIN_CHARS_PER_PAGE = 100

    # Common header/footer patterns to strip
    HEADER_FOOTER_PATTERNS = [
        r"Page\s+\d+\s*(of\s+\d+)?",
        r"^\d+$",  # Standalone page numbers
        r"©\s*\d{4}",  # Copyright lines
        r"Confidential",
        r"All\s+rights?\s+reserved",
    ]

    def extract(self, file_path: Union[str, Path]) -> PDFExtractionResult:
        """Extract text and metadata from a PDF file.

        Args:
            file_path: Path to the PDF file.

        Returns:
            PDFExtractionResult with extracted pages, text, and metadata.
        """
        file_path = Path(file_path)
        result = PDFExtractionResult()

        doc = fitz.open(str(file_path))
        result.page_count = len(doc)
        result.metadata = self._extract_metadata(doc)

        for page_num in range(len(doc)):
            page = doc[page_num]
            extracted = self._extract_page(page, page_num + 1)
            result.pages.append(extracted)

        doc.close()

        # Combine full text
        result.full_text = "\n\n".join(p.text for p in result.pages if p.text.strip())

        # Check extraction quality
        avg_chars = result.total_chars / max(result.page_count, 1)
        if avg_chars < self.MIN_CHARS_PER_PAGE:
            result.needs_ocr = True
            result.extraction_quality = avg_chars / self.MIN_CHARS_PER_PAGE

        return result

    def extract_from_bytes(self, content: bytes, filename: str = "document.pdf") -> PDFExtractionResult:
        """Extract text from PDF bytes (for in-memory processing)."""
        result = PDFExtractionResult()

        doc = fitz.open(stream=content, filetype="pdf")
        result.page_count = len(doc)
        result.metadata = self._extract_metadata(doc)

        for page_num in range(len(doc)):
            page = doc[page_num]
            extracted = self._extract_page(page, page_num + 1)
            result.pages.append(extracted)

        doc.close()

        result.full_text = "\n\n".join(p.text for p in result.pages if p.text.strip())

        avg_chars = result.total_chars / max(result.page_count, 1)
        if avg_chars < self.MIN_CHARS_PER_PAGE:
            result.needs_ocr = True
            result.extraction_quality = avg_chars / self.MIN_CHARS_PER_PAGE

        return result

    def _extract_page(self, page: fitz.Page, page_number: int) -> ExtractedPage:
        """Extract content from a single page."""
        # Extract text with layout preservation
        text = page.get_text("text", sort=True)

        # Clean the text
        text = self._clean_text(text)

        # Detect images
        image_list = page.get_images(full=True)
        has_images = len(image_list) > 0

        # Basic table detection (look for tab-separated or grid-like content)
        has_tables = self._detect_tables(text)

        return ExtractedPage(
            page_number=page_number,
            text=text,
            has_images=has_images,
            has_tables=has_tables,
            image_count=len(image_list),
            char_count=len(text),
        )

    def _extract_metadata(self, doc: fitz.Document) -> dict:
        """Extract PDF metadata."""
        meta = doc.metadata or {}
        return {
            "title": meta.get("title", ""),
            "author": meta.get("author", ""),
            "subject": meta.get("subject", ""),
            "keywords": meta.get("keywords", ""),
            "creator": meta.get("creator", ""),
            "producer": meta.get("producer", ""),
            "creation_date": meta.get("creationDate", ""),
            "modification_date": meta.get("modDate", ""),
        }

    def _clean_text(self, text: str) -> str:
        """Clean extracted text by removing noise."""
        # Remove common header/footer patterns
        lines = text.split("\n")
        cleaned_lines = []
        for line in lines:
            stripped = line.strip()
            # Skip empty lines at boundaries
            if not stripped:
                cleaned_lines.append("")
                continue
            # Skip header/footer patterns
            is_noise = False
            for pattern in self.HEADER_FOOTER_PATTERNS:
                if re.fullmatch(pattern, stripped, re.IGNORECASE):
                    is_noise = True
                    break
            if not is_noise:
                cleaned_lines.append(line)

        text = "\n".join(cleaned_lines)

        # Normalize whitespace
        text = re.sub(r"\n{3,}", "\n\n", text)
        text = re.sub(r"[ \t]+", " ", text)

        return text.strip()

    def _detect_tables(self, text: str) -> bool:
        """Basic heuristic to detect if the page contains tables."""
        lines = text.split("\n")
        tab_lines = sum(1 for line in lines if "\t" in line or "  " in line)
        # If more than 20% of non-empty lines look tab-separated, likely a table
        non_empty = sum(1 for line in lines if line.strip())
        if non_empty > 0 and tab_lines / non_empty > 0.2:
            return True
        return False
