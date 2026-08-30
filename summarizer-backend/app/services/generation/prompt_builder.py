from __future__ import annotations
"""Prompt Builder — constructs LO-aware, Bloom's-guided prompts.

Assembles structured prompts with system instructions, learning outcomes,
retrieved chunks, and output format specifications based on the requested
summary level and output type.
"""

from typing import Union, Optional, Literal


# Bloom's level-specific generation instructions
BLOOM_INSTRUCTIONS = {
    "Remember": (
        "Focus on: Definitions, key terms, lists, facts. Use bullet points.\n"
        "Provide: Key terms to memorize, clear definitions, factual lists."
    ),
    "Understand": (
        "Focus on: Explanations, paraphrasing, examples, cause-effect relationships.\n"
        "Provide: Concepts explained in own words, illustrative examples."
    ),
    "Apply": (
        "Focus on: Step-by-step procedures, worked examples, practice scenarios.\n"
        "Provide: Demonstrated application with concrete examples and walkthroughs."
    ),
    "Analyze": (
        "Focus on: Comparisons, component breakdowns, relationship identification.\n"
        "Provide: Comparison tables, analysis of parts and their relationships."
    ),
    "Evaluate": (
        "Focus on: Criteria-based judgments, trade-off analysis, argumentation.\n"
        "Provide: Evidence-based evaluation, pros/cons analysis, justified recommendations."
    ),
    "Create": (
        "Focus on: Design approaches, synthesis of concepts, novel solutions.\n"
        "Provide: Design frameworks, creative applications, synthesis of multiple concepts."
    ),
}

SYSTEM_PROMPT = """You are an expert university tutor who writes the BEST lecture summaries for students preparing for exams. Your style is like the best study notes you've ever seen — clear, engaging, student-friendly, and packed with exactly what matters.

YOUR WRITING STYLE:
- Write like a knowledgeable friend explaining things clearly, not like a textbook
- Use emojis at the start of section headers to make scanning easy (📘 🎯 ⚡ 🧠 💡 📊 🔑 ⭐)
- Use **bold** for key terms on first use
- Use short bullet points and numbered lists — avoid long paragraphs
- Include comparison tables where things need to be compared
- Mark the most important exam topics with ⭐ or ⭐⭐⭐
- Add a "🧠 Quick Exam Revision" table at the end with Topic → Key Point format
- Highlight "most important things to memorize" at the very end

WHAT TO INCLUDE:
1. A brief intro paragraph (2-3 sentences max) saying what the lecture covers
2. Clear sections for each major topic with emoji headers
3. Definitions explained simply with real-world examples
4. Comparison tables where relevant
5. Step-by-step flows for processes/pipelines
6. A quick revision table at the end
7. "⭐ Must memorize" section at the very bottom

WHAT TO AVOID:
- No LaTeX math notation ($f(x,y)$ style) — use plain text instead: f(x,y)
- No ASCII art diagrams — use simple arrow flows: A → B → C
- No excessive academic citations on every sentence — cite sources naturally in parentheses only when needed
- No filler phrases like "It is important to note", "As we can see"
- No copy-pasting slide content verbatim
- Don't make it longer than needed — students want scannable notes, not a textbook chapter

FORMAT RULES:
- Use # for the main title
- Use ## for major sections  
- Use ### for subsections
- Use **bold** for key terms
- Use `code style` for formulas/values when needed
- Cite sources as (Source: filename, Slide N) — only for key facts, not every sentence"""


class PromptBuilder:
    """Constructs prompts for the LOA-ESS generation pipeline.

    Supports building prompts for:
    - Educational summaries (standard, beginner, advanced, exam-focused, LO-focused)
    - Flashcard generation
    - Quiz generation
    - Mind map generation
    """

    def build_summary_prompt(
        self,
        query: str,
        learning_outcomes: list[dict],
        chunks: list[dict],
        module_name: str,
        module_code: str,
        week_number: Optional[int] = None,
        week_topic: str = "",
        summary_level: str = "standard",
        module_outline: Optional[list[dict]] = None,
    ) -> list[dict]:
        """Build a complete prompt for summary generation.

        Returns a list of message dicts for the LLM API (system, user).
        """
        # Build context sections
        lo_context = self._format_learning_outcomes(learning_outcomes)
        chunk_context = self._format_chunks(chunks)
        level_instructions = self._get_level_instructions(summary_level)
        outline_context = self._format_module_outline(module_outline, week_number)

        # Determine scope label
        scope = f"Week {week_number} — {week_topic}" if week_number and week_topic else \
                f"Week {week_number}" if week_number else "All Weeks"

        user_prompt = f"""## Your Task: Write Student-Friendly Lecture Notes

### Module: {module_name} ({module_code})
### Scope: {scope}

### Learning Outcomes (what students need to know):
{lo_context}

### Lecture Content (source material):
{chunk_context}

### Module Outline (for context):
{outline_context}

### Student Question:
{query}

---

### HOW TO WRITE THIS SUMMARY:

Write exam-focused, student-friendly notes that cover everything in the lecture content above.

**Structure your output like this:**

1. **📘 Intro** — 2-3 sentences: what does this lecture cover and why does it matter?

2. **For each major topic in the lecture:**
   - Give it an emoji header (##)
   - Explain it simply — imagine explaining to a smart friend
   - Add real-world examples
   - Mark the most exam-important parts with ⭐
   - Use bullet points, not long paragraphs

3. **📊 Comparison tables** — if the lecture compares things, put them in a table

4. **Simple flow arrows** for any processes: Step 1 → Step 2 → Step 3

5. **🧠 Quick Exam Revision Table** at the end:
   | Topic | Key Point |
   |-------|-----------|
   (cover ALL the important concepts)

6. **⭐ Most Important Things to Memorize** — 3-6 bullet points of the absolute key facts

Keep it **concise and scannable**. Students should be able to read this in 5-10 minutes and feel exam-ready.
Do NOT write a textbook. Write notes a student would actually want to read."""

        return [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ]

    def build_flashcard_prompt(
        self,
        learning_outcomes: list[dict],
        chunks: list[dict],
        module_name: str,
        module_code: str,
        week_number: Optional[int] = None,
        num_cards: int = 15,
    ) -> list[dict]:
        """Build prompt for flashcard generation."""
        lo_context = self._format_learning_outcomes(learning_outcomes)
        chunk_context = self._format_chunks(chunks)

        user_prompt = f"""## Task: Generate Flashcards

### Module: {module_name} ({module_code})
{f'### Week: {week_number}' if week_number else ''}

### Learning Outcomes:
{lo_context}

### Source Materials:
{chunk_context}

### Instructions:
Generate exactly {num_cards} flashcards that help students achieve the listed learning outcomes.

Rules:
1. Each flashcard must map to at least one learning outcome.
2. Mix question types:
   - Definition (What is X?)
   - Comparison (Difference between X and Y?)
   - Application (How would you apply X to scenario Y?)
   - Analysis (Why does X lead to Y?)
3. Front side: Clear, specific question.
4. Back side: Concise, accurate answer with source reference.
5. Order: Progress from simple recall to higher-order thinking.

### Output Format (JSON array):
Return ONLY a valid JSON array with objects containing:
- "id" (number)
- "front" (string: question)
- "back" (string: answer)
- "learning_outcome" (string: LO code e.g. "LO1")
- "bloom_level" (string: e.g. "Remember")
- "difficulty" (string: Union["easy", Union["medium"], "hard"])
- "source" (string: source reference)"""

        return [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ]

    def build_quiz_prompt(
        self,
        learning_outcomes: list[dict],
        chunks: list[dict],
        module_name: str,
        module_code: str,
        week_number: Optional[int] = None,
        week_topic: str = "",
        num_questions: int = 10,
    ) -> list[dict]:
        """Build prompt for quiz generation."""
        lo_context = self._format_learning_outcomes(learning_outcomes)
        chunk_context = self._format_chunks(chunks)

        scope = f"Week {week_number} — {week_topic}" if week_number and week_topic else \
                f"Week {week_number}" if week_number else "All Weeks"

        user_prompt = f"""## Task: Generate Quiz

### Module: {module_name} ({module_code})
### Scope: {scope}

### Learning Outcomes:
{lo_context}

### Source Materials:
{chunk_context}

### Instructions:
Generate a quiz with exactly {num_questions} questions covering the listed learning outcomes.
All questions MUST be based ONLY on the source materials above.

Rules:
1. Include a mix of:
   - Multiple Choice Questions (MCQ): 60%
   - True/False: 15%
   - Short Answer: 15%
   - Scenario-based: 10%
2. Each question must map to a specific learning outcome (lo_code).
3. MCQ must have exactly 4 options with plausible distractors.
4. Provide clear explanations for correct answers citing the source.
5. Distribute difficulty: 30% easy, 50% medium, 20% hard.

### Output Format:
Return ONLY a valid JSON array (no markdown, no code fences, no trailing commas). Each object must have:
- "id" (number, starting from 1)
- "type" ("mcq", "true_false", "short_answer", or "scenario")
- "question" (string, max 30 words)
- "options" (array of 4 short strings for MCQ, null for others)
- "correct_answer" (string, concise)
- "explanation" (string, max 1 sentence)
- "learning_outcome" (LO code string, e.g. "LO1")
- "bloom_level" (string)
- "difficulty" ("easy", "medium", or "hard")
- "source" (string: just the filename, no page numbers)"""

        return [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ]

    def build_mindmap_prompt(
        self,
        learning_outcomes: list[dict],
        chunks: list[dict],
        module_name: str,
        module_code: str,
        week_number: Optional[int] = None,
        week_topic: str = "",
    ) -> list[dict]:
        """Build prompt for mind map generation."""
        lo_context = self._format_learning_outcomes(learning_outcomes)
        chunk_context = self._format_chunks(chunks)

        user_prompt = f"""## Task: Generate Mind Map Structure

### Module: {module_name} ({module_code})
{f'### Week: {week_number} - {week_topic}' if week_number else ''}

### Learning Outcomes:
{lo_context}

### Source Materials:
{chunk_context}

### Instructions:
Create a hierarchical mind map structure for the topic covered in the source materials.

Rules:
1. The root node should be the main topic.
2. Level 1 children should map to major concepts or learning outcomes.
3. Level 2+ children should be sub-concepts and details.
4. Each node should have a concise label (max 8 words).
5. Link nodes to learning outcomes where applicable.
6. Maximum depth: 4 levels.

### Output Format (JSON):
Return ONLY a valid JSON object with:
- "id" (string)
- "label" (string: node text)
- "level" (number: 0 for root)
- "children" (array of same structure)
- "learning_outcome" (string or null: LO code if applicable)"""

        return [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ]

    def _format_learning_outcomes(self, los: list[dict]) -> str:
        """Format LOs for inclusion in the prompt."""
        if not los:
            return "No specific learning outcomes provided."

        lines = []
        for lo in los:
            code = lo.get("lo_code", lo.get("code", "LO?"))
            text = lo.get("text", "").strip()
            bloom = lo.get("bloom_level", "Understand")
            weight = lo.get("assessment_weight")
            keywords = lo.get("topic_keywords", [])

            line = f"- **{code}** [{bloom}]: {text}"
            if weight:
                line += f" *(Assessment weight: {weight*100:.0f}%)*"
            if keywords:
                line += f"\n  → Key topics: {', '.join(keywords)}"

            # Add Bloom's-specific instruction
            bloom_instruction = BLOOM_INSTRUCTIONS.get(bloom, "")
            if bloom_instruction:
                line += f"\n  → Generation guidance: {bloom_instruction.split(chr(10))[0]}"

            lines.append(line)

        return "\n".join(lines)

    def _format_module_outline(self, outline: Optional[list[dict]], week_number: Optional[int] = None) -> str:
        """Format the module weekly outline for prompt injection.

        If week_number is provided, highlights the relevant week.
        Always includes the full outline for broader context.
        """
        if not outline:
            return "No module outline available."

        lines = []
        for week in sorted(outline, key=lambda w: w.get("week_number", 0)):
            wn = week.get("week_number", "?")
            topic = week.get("topic", "")
            subtopics = week.get("subtopics") or week.get("description") or []

            if week_number and wn == week_number:
                # Highlight the target week
                lines.append(f"▶ **Week {wn} [TARGET]: {topic}**")
                if subtopics:
                    if isinstance(subtopics, list):
                        for st in subtopics:
                            lines.append(f"   - {st}")
                    else:
                        lines.append(f"   {subtopics}")
            else:
                sub_str = ""
                if subtopics and isinstance(subtopics, list):
                    sub_str = " | " + ", ".join(subtopics[:3])
                lines.append(f"  Week {wn}: {topic}{sub_str}")

        return "\n".join(lines)

    def _format_chunks(self, chunks: list[dict]) -> str:
        """Format retrieved chunks for inclusion in the prompt."""
        if not chunks:
            return "No source materials available."

        formatted = []
        for i, chunk in enumerate(chunks, 1):
            content = chunk.get("content", "")
            source = chunk.get("source_ref", "Unknown source")
            lo_match = chunk.get("matched_lo_id")

            header = f"[Source {i}: {source}]"
            if lo_match:
                header += f" [Aligned with {lo_match}]"

            formatted.append(f"---\n{header}\n{content}\n---")

        return "\n\n".join(formatted)

    def _get_level_instructions(self, summary_level: str) -> str:
        """Always return the perfect summary instructions regardless of level."""
        return (
            "Produce a PERFECT educational summary — the highest quality possible:\n"
            "- Synthesise concepts rather than copying slide bullet points.\n"
            "- Ground every abstraction with at least one concrete example from the source material.\n"
            "- Cross-reference related chunks explicitly.\n"
            "- Match the Bloom's taxonomy depth for each learning outcome.\n"
            "- Structure for exam readiness: every section answers 'what must I know and DO?'\n"
            "- Ban all filler phrases. Every sentence must add information."
        )
