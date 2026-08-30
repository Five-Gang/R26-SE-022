from __future__ import annotations
from typing import Optional, Union
"""OCR Service — fallback text extraction for scanned/image-heavy PDFs.

Uses EasyOCR for extracting text from scanned documents when
PyMuPDF's text extraction yields insufficient results.
"""

from dataclasses import dataclass
from pathlib import Path


@dataclass
class OCRResult:
    """Result of OCR processing."""

    text: str
    confidence: float
    language: str = "en"
    page_texts: Optional[list[str]] = None


class OCRService:
    """Extracts text from scanned PDFs and images using EasyOCR.

    Used as a fallback when PDFParser detects low text extraction
    quality (needs_ocr=True). EasyOCR supports 80+ languages and
    runs locally without API costs.
    """

    def __init__(self, languages: Optional[list[str]] = None, gpu: bool = False):
        """
        Args:
            languages: Languages for OCR (default: English only).
            gpu: Use GPU acceleration if available.
        """
        self.languages = languages or ["en"]
        self.gpu = gpu
        self._reader = None

    def _load_reader(self):
        """Lazy-load EasyOCR reader (heavy initialization)."""
        if self._reader is None:
            import easyocr
            self._reader = easyocr.Reader(self.languages, gpu=self.gpu)

    def extract_from_pdf(self, file_path: Union[str, Path]) -> OCRResult:
        """Extract text from a PDF using OCR on each page.

        Converts PDF pages to images, then runs OCR.

        Args:
            file_path: Path to the PDF file.

        Returns:
            OCRResult with extracted text and confidence.
        """
        import fitz  # PyMuPDF

        self._load_reader()
        doc = fitz.open(str(file_path))

        page_texts = []
        confidences = []

        for page_num in range(len(doc)):
            page = doc[page_num]

            # Render page to image (300 DPI for good OCR quality)
            pix = page.get_pixmap(dpi=300)
            img_bytes = pix.tobytes("png")

            # Run OCR on the image
            results = self._reader.readtext(img_bytes)

            # Extract text and confidence
            texts = []
            for bbox, text, conf in results:
                texts.append(text)
                confidences.append(conf)

            page_text = " ".join(texts)
            page_texts.append(page_text)

        doc.close()

        full_text = "\n\n".join(page_texts)
        avg_confidence = sum(confidences) / max(len(confidences), 1)

        return OCRResult(
            text=full_text,
            confidence=avg_confidence,
            page_texts=page_texts,
        )

    def extract_from_image(self, image_path: Union[str, Path]) -> OCRResult:
        """Extract text from a single image file.

        Args:
            image_path: Path to the image file.

        Returns:
            OCRResult with extracted text.
        """
        self._load_reader()
        results = self._reader.readtext(str(image_path))

        texts = []
        confidences = []
        for bbox, text, conf in results:
            texts.append(text)
            confidences.append(conf)

        return OCRResult(
            text=" ".join(texts),
            confidence=sum(confidences) / max(len(confidences), 1),
        )

    def extract_from_bytes(self, img_bytes: bytes) -> OCRResult:
        """Extract text from image bytes."""
        self._load_reader()
        results = self._reader.readtext(img_bytes)

        texts = []
        confidences = []
        for bbox, text, conf in results:
            texts.append(text)
            confidences.append(conf)

        return OCRResult(
            text=" ".join(texts),
            confidence=sum(confidences) / max(len(confidences), 1),
        )
