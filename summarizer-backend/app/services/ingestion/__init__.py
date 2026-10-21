from __future__ import annotations
"""Ingestion services package."""

from app.services.ingestion.docx_parser import DocxParser
from app.services.ingestion.lo_extractor import LearningOutcomeExtractor
from app.services.ingestion.pdf_parser import PDFParser
from app.services.ingestion.pptx_parser import PPTXParser

__all__ = ["PDFParser", "PPTXParser", "DocxParser", "LearningOutcomeExtractor"]
