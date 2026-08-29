from __future__ import annotations
from typing import Optional, Union
"""Learning Outcome Extractor — extracts and classifies LOs from module outlines.

This is a core research component: LOs are extracted from module outline PDFs
and classified by Bloom's Taxonomy level. These structured LOs then serve as
retrieval anchors in the LO-RAG pipeline.
"""

import re
from dataclasses import dataclass, field


@dataclass
class ExtractedLO:
    """A learning outcome extracted from a module outline."""

    lo_code: str  # "LO1", "LO2", etc.
    text: str  # Full LO text
    bloom_level: str  # Bloom's taxonomy level
    bloom_verb: str  # Primary action verb
    topic_keywords: list[str] = field(default_factory=list)


@dataclass
class ModuleOutlineData:
    """Structured data extracted from a module outline."""

    module_code: str = ""
    module_name: str = ""
    credits: int = 4
    lecturer: str = ""
    department: str = ""
    description: str = ""
    learning_outcomes: list[ExtractedLO] = field(default_factory=list)
    weekly_breakdown: list[dict] = field(default_factory=list)
    assessment_structure: dict = field(default_factory=dict)
    textbook_references: list[str] = field(default_factory=list)


# Bloom's Taxonomy verb classification
BLOOM_TAXONOMY = {
    "Remember": [
        "define", "list", "name", "identify", "recall", "state", "recognize",
        "label", "match", "memorize", "repeat", "select", "outline",
    ],
    "Understand": [
        "explain", "describe", "summarize", "classify", "discuss", "interpret",
        "paraphrase", "illustrate", "compare", "distinguish", "predict",
        "translate", "infer", "exemplify",
    ],
    "Apply": [
        "apply", "implement", "use", "demonstrate", "solve", "calculate",
        "execute", "operate", "practice", "compute", "construct", "modify",
        "produce", "show",
    ],
    "Analyze": [
        "analyze", "analyse", "compare", "contrast", "differentiate", "examine",
        "deconstruct", "organize", "attribute", "integrate", "investigate",
        "break down", "distinguish",
    ],
    "Evaluate": [
        "evaluate", "assess", "justify", "critique", "judge", "argue",
        "defend", "appraise", "support", "validate", "recommend", "prioritize",
        "determine", "rate",
    ],
    "Create": [
        "design", "create", "develop", "propose", "construct", "formulate",
        "plan", "produce", "compose", "generate", "invent", "devise",
        "synthesize", "build",
    ],
}


class LearningOutcomeExtractor:
    """Extracts learning outcomes from module outline text and classifies
    them by Bloom's Taxonomy level.

    Uses a hybrid approach:
    1. Rule-based regex patterns for common LO formats
    2. Bloom's verb classification for taxonomy level
    3. (Future) LLM fallback for unstructured LOs
    """

    # Common patterns for LO sections in module outlines
    LO_SECTION_PATTERNS = [
        # "Learning Outcomes" or "Course Learning Outcomes" section
        r"(?:course\s+)?learning\s+outcomes?\s*[:.]?\s*\n(.*?)(?=\n\s*(?:module\s+(?:content|course)\s+(?:content|teaching|assessment|week|reference|reading)))",
        # "Intended Learning Outcomes" or "ILOs"
        r"(?:intended\s+)?learning\s+outcomes?\s*(?:\(ILOs?\))?\s*[:.]?\s*\n(.*?)(?=\n\s*(?:module|course|teaching|assessment|week|reference))",
        # "Objectives" section
        r"(?:course\s+|module\s+)?objectives?\s*[:.]?\s*\n(.*?)(?=\n\s*(?:module|course|teaching|assessment|week|reference))",
    ]

    # Patterns for individual LO lines
    LO_LINE_PATTERNS = [
        # "LO1: Apply normalization..."
        r"(?:LO|CLO|ILO)\s*(\d+)\s*[:.]\s*(.+)",
        # "1. Apply normalization..."
        r"(\d+)\s*[.)]\s*(.+)",
        # Bullet points: "• Apply normalization..."
        r"[•\-\*]\s*(.+)",
        # "By the end of this module, students will be able to:"
        r"(?:students?\s+(?:will|should)\s+be\s+able\s+to\s*[:.])?\s*(.+)",
    ]

    # Weekly breakdown patterns
    WEEK_PATTERN = r"week\s*(\d+)\s*[:.]\s*(.+?)(?=\nweek\s*\d+|\Z)"

    def extract_from_text(self, text: str) -> ModuleOutlineData:
        """Extract structured data from module outline text.

        Args:
            text: Full text of the module outline.

        Returns:
            ModuleOutlineData with extracted LOs, weeks, and metadata.
        """
        data = ModuleOutlineData()

        # Extract module code and name
        code_match = re.search(
            r"(?:module\s+code)\s*[:.]\s*([A-Z]{2,4}\s*\d{3,4})", text, re.IGNORECASE
        )
        if code_match:
            data.module_code = code_match.group(1).replace(" ", "")

        name_match = re.search(
            r"(?:module\s+(?:name|title)|title)\s*[:.]\s*(.+?)(?:\n|$)", text, re.IGNORECASE
        )
        if name_match:
            data.module_name = name_match.group(1).strip()

        # Extract credits
        credits_match = re.search(r"credits?\s*[:.]\s*(\d+)", text, re.IGNORECASE)
        if credits_match:
            data.credits = int(credits_match.group(1))

        # Extract lecturer
        lecturer_match = re.search(
            r"(?:lecturer|instructor|taught\s+by)\s*[:.]\s*(.+?)(?:\n|$)", text, re.IGNORECASE
        )
        if lecturer_match:
            data.lecturer = lecturer_match.group(1).strip()

        # Extract learning outcomes
        data.learning_outcomes = self._extract_learning_outcomes(text)

        # Extract weekly breakdown
        data.weekly_breakdown = self._extract_weekly_breakdown(text)

        # Extract assessment structure
        data.assessment_structure = self._extract_assessment(text)

        return data

    def _extract_learning_outcomes(self, text: str) -> list[ExtractedLO]:
        """Extract individual learning outcomes from the text."""
        los = []

        # Try to find the LO section
        lo_section = ""
        for pattern in self.LO_SECTION_PATTERNS:
            match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
            if match:
                lo_section = match.group(1)
                break

        if not lo_section:
            # Fallback: search entire text for LO patterns
            lo_section = text

        # Extract individual LOs
        lo_count = 0
        lines = lo_section.split("\n")
        for line in lines:
            line = line.strip()
            if not line or len(line) < 15:
                continue

            # Try numbered LO patterns first
            for pattern in self.LO_LINE_PATTERNS[:2]:  # Numbered patterns
                match = re.match(pattern, line, re.IGNORECASE)
                if match:
                    groups = match.groups()
                    if len(groups) == 2:
                        lo_num = groups[0]
                        lo_text = groups[1].strip()
                    else:
                        lo_count += 1
                        lo_num = str(lo_count)
                        lo_text = groups[0].strip()

                    if len(lo_text) >= 15:  # Minimum meaningful LO length
                        bloom_level, bloom_verb = self._classify_bloom(lo_text)
                        los.append(
                            ExtractedLO(
                                lo_code=f"LO{lo_num}",
                                text=lo_text,
                                bloom_level=bloom_level,
                                bloom_verb=bloom_verb,
                                topic_keywords=self._extract_keywords(lo_text),
                            )
                        )
                    break

        # If no numbered LOs found, try bullet point patterns
        if not los:
            for line in lines:
                line = line.strip()
                if not line or len(line) < 15:
                    continue

                for pattern in self.LO_LINE_PATTERNS[2:]:  # Bullet patterns
                    match = re.match(pattern, line, re.IGNORECASE)
                    if match:
                        lo_text = match.group(1).strip()
                        if len(lo_text) >= 15 and self._looks_like_lo(lo_text):
                            lo_count += 1
                            bloom_level, bloom_verb = self._classify_bloom(lo_text)
                            los.append(
                                ExtractedLO(
                                    lo_code=f"LO{lo_count}",
                                    text=lo_text,
                                    bloom_level=bloom_level,
                                    bloom_verb=bloom_verb,
                                    topic_keywords=self._extract_keywords(lo_text),
                                )
                            )
                        break

        return los

    def _classify_bloom(self, lo_text: str) -> tuple[str, str]:
        """Classify a learning outcome by Bloom's Taxonomy level.

        Looks for action verbs at the start of the LO text.

        Returns:
            Tuple of (bloom_level, bloom_verb)
        """
        # Normalize and get first few words
        words = lo_text.lower().split()

        # Check each word (typically the first verb)
        for word in words[:5]:
            # Strip common suffixes for matching
            clean_word = re.sub(r"(Union[ing, Union[ed], s])$", "", word)
            for level, verbs in BLOOM_TAXONOMY.items():
                for verb in verbs:
                    if word == verb or clean_word == verb.rstrip("e"):
                        return level, verb

        # Default to "Understand" if no verb is matched
        return "Understand", words[0] if words else "understand"

    def _looks_like_lo(self, text: str) -> bool:
        """Heuristic check: does this text look like a learning outcome?"""
        lo_indicators = [
            "able to", "will be", "should be", "can", "understand",
            "explain", "apply", "analyze", "evaluate", "design",
            "describe", "identify", "demonstrate", "compare",
        ]
        text_lower = text.lower()
        return any(indicator in text_lower for indicator in lo_indicators)

    def _extract_keywords(self, lo_text: str) -> list[str]:
        """Extract topic keywords from LO text (simple approach).

        Extracts capitalized phrases and domain-specific terms.
        """
        # Remove common stopwords and extract meaningful phrases
        stopwords = {
            "the", "a", "an", "and", "or", "to", "of", "in", "for", "with",
            "on", "at", "by", "from", "be", "is", "are", "was", "were",
            "will", "should", "can", "able", "students", "student",
        }
        words = re.findall(r"\b[A-Za-z]{3,}\b", lo_text)
        keywords = [
            w for w in words
            if w.lower() not in stopwords and not w[0].islower()
        ]
        # Also include multi-word phrases in quotes
        quoted = re.findall(r'"([^"]+)"', lo_text)
        keywords.extend(quoted)

        return list(set(keywords))[:10]

    def _extract_weekly_breakdown(self, text: str) -> list[dict]:
        """Extract weekly topic breakdown from the outline."""
        weeks = []
        matches = re.finditer(self.WEEK_PATTERN, text, re.IGNORECASE | re.DOTALL)
        for match in matches:
            week_num = int(match.group(1))
            topic = match.group(2).strip()
            # Clean up multi-line topics
            topic = re.sub(r"\s+", " ", topic).strip()
            weeks.append({
                "week_number": week_num,
                "topic": topic,
            })
        return weeks

    def _extract_assessment(self, text: str) -> dict:
        """Extract assessment structure (exam %, coursework %, etc.)."""
        assessment = {}
        # Common patterns: "Final Exam: 60%", "Coursework: 40%"
        patterns = [
            r"(?:final\s+)?exam(?:ination)?\s*[:.]\s*(\d+)\s*%",
            r"coursework\s*[:.]\s*(\d+)\s*%",
            r"assignment\s*[:.]\s*(\d+)\s*%",
            r"quiz(?:zes)?\s*[:.]\s*(\d+)\s*%",
            r"project\s*[:.]\s*(\d+)\s*%",
            r"lab(?:oratory)?\s*[:.]\s*(\d+)\s*%",
            r"mid[\s-]*(?:term|semester)\s*[:.]\s*(\d+)\s*%",
            r"presentation\s*[:.]\s*(\d+)\s*%",
        ]
        keys = [
            "exam", "coursework", "assignment", "quiz",
            "project", "lab", "midterm", "presentation"
        ]
        for pattern, key in zip(patterns, keys):
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                assessment[key] = int(match.group(1))
        return assessment
