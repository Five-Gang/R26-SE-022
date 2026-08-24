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

SYSTEM_PROMPT = """You are a world-class educational summarizer specialising in university-level courses. Your summaries are used by students to prepare for exams and deeply understand the material — they must be substantially better than what a generic AI assistant would produce.

CORE PRINCIPLES:
1. **Synthesise, never copy-paste.** Re-read every source chunk, identify the core ideas, and write them in your own structured prose. Do not reproduce bullet-for-bullet from the slides.
2. **Ground every abstraction.** After stating any theoretical concept, immediately provide a concrete example drawn from the lecture material (or a realistic applied scenario if the material implies one).
3. **Cross-reference actively.** When two chunks cover related ideas, explicitly connect them (e.g., "This builds on the threat model introduced in [Source 2]...").
4. **Match Bloom's depth per LO.** For a Remember-level LO → crisp definitions and mnemonics. For Analyse/Evaluate/Create → comparative tables, trade-off discussions, design rationale.
5. **Exam-ready framing.** Every section should implicitly answer: *"What does a student need to know and be able to DO about this topic?"*
6. **No filler language.** Ban: "It is important to note", "In summary", "As we can see", "This is a key concept". Every sentence must add information.
7. **Source integrity.** All factual claims cite [Source: filename, Slide/Page N]. If a learning outcome is not covered, write exactly: *⚠ Not covered in the provided lecture materials.*
8. **Structured output.** Use `#` title, `##` per LO section, `###` sub-topics, `**bold**` key terms, tables for comparisons, and a final "## Key Takeaways" section with 4–6 precise bullet points."""


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

        user_prompt = f"""## Task: Perfect Educational Summary

### Module Context
- **Module**: {module_name} ({module_code})
- **Scope**: {scope}

### Module Curriculum Outline
{outline_context}

### Learning Outcomes (Curriculum-Defined)
{lo_context}

### Retrieved Lecture Materials
{chunk_context}

### Student Query
{query}

### Generation Instructions — PERFECT SUMMARY PROTOCOL

Produce a comprehensive, exam-ready educational summary that a student could confidently rely on instead of re-reading the slides. Follow every step below:

**Step 1 — Orient the reader**
Open with a one-paragraph *Module Context* that situates this topic within the broader course and explains *why* it matters. Reference the curriculum outline.

**Step 2 — LO-by-LO deep coverage**
For each Learning Outcome listed above, create a dedicated `##` section. Within that section:
- State clearly what the LO requires the student to be able to DO (not just know).
- Explain the core concepts at the Bloom's level indicated — define for Remember, explain mechanisms for Understand, show step-by-step for Apply, compare/break-down for Analyse, justify with evidence for Evaluate, design/synthesise for Create.
- Provide **at least one grounded example** per concept (from the source material, or a realistic applied scenario the material implies). Label it *Example:*.
- Highlight key terms in **bold** on first use.
- If two or more source chunks relate to the same idea, **explicitly connect them** (e.g., "This builds on the concept in [Source 3]...").
- If the LO is not addressed in the sources, write: *⚠ Not covered in the provided lecture materials.*

**Step 3 — Comparison / structure where relevant**
If the material involves comparing approaches, algorithms, models, or techniques, include a **markdown table** summarising the key differences (attributes as rows, options as columns).

**Step 4 — Practical implications**
After the LO sections, add a `## Practical Implications` section (2–4 short paragraphs) explaining how these concepts apply in real-world contexts or assessments.

**Step 5 — Key Takeaways**
Close with `## Key Takeaways` — exactly 5 bullet points that a student should remember walking out of the exam hall. Each bullet must be a complete, informative statement, not a vague topic label.

**Step 6 — Citations**
Every factual claim must carry an inline citation: [Source: filename, Slide/Page N].

**Strict Prohibitions**
- Do NOT use filler phrases: "It is important to note", "As we can see", "In conclusion", "This is a key concept", "Overall".
- Do NOT simply copy slide bullet points verbatim. Rewrite and expand.
- Do NOT invent facts not present in the source material.

### Output Format
Rich markdown: `#` title, `##` LO sections, `###` sub-topics, tables, bold key terms, inline citations."""

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
