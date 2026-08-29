from __future__ import annotations
from typing import Optional, Union
"""LLM-as-Judge Evaluator — uses an LLM to assess summary quality.

Leverages a strong LLM (GPT-4o or Gemini 2.5) to evaluate
summaries on educational relevance criteria, providing scores
and explanations for each dimension.
"""

from dataclasses import dataclass, field

from app.services.generation.llm_gateway import LLMGateway


@dataclass
class JudgmentResult:
    """Result from LLM-as-judge evaluation."""

    overall_score: float = 0.0  # 1-5 scale
    dimension_scores: dict[str, float] = field(default_factory=dict)
    explanations: dict[str, str] = field(default_factory=dict)
    raw_judgment: str = ""
    judge_model: str = ""


JUDGE_PROMPT = """You are an expert educational quality evaluator. Your task is to assess the quality of an AI-generated summary for a university module.

## Evaluation Criteria

Score each dimension from 1-5 (1=Poor, 2=Below Average, 3=Average, 4=Good, 5=Excellent):

### 1. Learning Outcome Alignment (LO_ALIGN)
Does the summary address the specific learning outcomes listed below? Are the right topics covered at the appropriate depth?

### 2. Bloom's Taxonomy Appropriateness (BLOOM)
Does the cognitive depth match the LO's Bloom's level? (e.g., "Apply" LOs should have examples/procedures, not just definitions)

### 3. Factual Accuracy & Source Grounding (ACCURACY)
Are claims supported by the source materials? Are citations present and credible?

### 4. Completeness (COMPLETE)
Does the summary cover all major concepts from the source materials relevant to the LOs?

### 5. Coherence & Pedagogical Structure (STRUCTURE)
Is the summary well-organized, easy to follow, and appropriate for university students?

### 6. Exam Readiness (EXAM)
Would studying this summary prepare a student for exam questions on these topics?

## Response Format

Respond in this EXACT format:
```
LO_ALIGN: Union[[score], [one]-sentence explanation]
BLOOM: Union[[score], [one]-sentence explanation]
ACCURACY: Union[[score], [one]-sentence explanation]
COMPLETE: Union[[score], [one]-sentence explanation]
STRUCTURE: Union[[score], [one]-sentence explanation]
EXAM: Union[[score], [one]-sentence explanation]
OVERALL: [score]
```

Replace [score] with a number 1-5 and [one-sentence explanation] with a brief justification."""


class LLMJudgeEvaluator:
    """Uses an LLM to evaluate educational summary quality.

    This provides a more nuanced evaluation than automatic metrics.
    Used for:
    - Comparative evaluation (LOA-ESS vs baselines)
    - Per-summary quality auditing
    - Training data for future fine-tuning
    """

    DIMENSIONS = [
        "LO_ALIGN", "BLOOM", "ACCURACY", "COMPLETE", "STRUCTURE", "EXAM"
    ]

    def __init__(self, judge_provider: str = "gemini"):
        """
        Args:
            judge_provider: Which LLM to use as judge ('gemini' or 'openai').
        """
        self.llm = LLMGateway()
        self.judge_provider = judge_provider

    async def evaluate(
        self,
        summary: str,
        learning_outcomes: list[dict],
        source_excerpt: str = "",
        module_name: str = "",
    ) -> JudgmentResult:
        """Evaluate a summary using LLM-as-judge.

        Args:
            summary: The generated summary to evaluate.
            learning_outcomes: List of LO dicts with 'lo_code', 'text', 'bloom_level'.
            source_excerpt: Optional excerpt from source materials for grounding check.
            module_name: Module name for context.

        Returns:
            JudgmentResult with per-dimension scores and explanations.
        """
        # Format LOs for the prompt
        lo_text = "\n".join(
            f"- {lo.get('lo_code', 'LO?')} [{lo.get('bloom_level', '?')}]: {lo.get('text', '')}"
            for lo in learning_outcomes
        )

        user_prompt = f"""## Module: {module_name}

## Learning Outcomes:
{lo_text}

## Source Material Excerpt:
{source_excerpt[:2000] if source_excerpt else "Not provided"}

## Summary to Evaluate:
{summary}

---

Please evaluate the above summary against the criteria."""

        messages = [
            {"role": "system", "content": JUDGE_PROMPT},
            {"role": "user", "content": user_prompt},
        ]

        response = await self.llm.generate(
            messages=messages,
            temperature=0.1,  # Low temp for consistent evaluation
            max_tokens=800,
            provider=self.judge_provider,
        )

        # Parse the judgment
        result = self._parse_judgment(response.content)
        result.judge_model = response.model
        result.raw_judgment = response.content

        return result

    async def comparative_evaluate(
        self,
        summaries: dict[str, str],
        learning_outcomes: list[dict],
        source_excerpt: str = "",
        module_name: str = "",
    ) -> dict[str, JudgmentResult]:
        """Compare multiple summaries (e.g., LOA-ESS vs baselines).

        Args:
            summaries: Dict mapping system name to summary text.
            learning_outcomes: LO dicts.
            source_excerpt: Source materials.
            module_name: Module name.

        Returns:
            Dict mapping system name to JudgmentResult.
        """
        results = {}
        for system_name, summary in summaries.items():
            result = await self.evaluate(
                summary=summary,
                learning_outcomes=learning_outcomes,
                source_excerpt=source_excerpt,
                module_name=module_name,
            )
            results[system_name] = result

        return results

    def _parse_judgment(self, text: str) -> JudgmentResult:
        """Parse the structured judgment response."""
        result = JudgmentResult()
        import re

        for dimension in self.DIMENSIONS:
            pattern = rf"{dimension}:\s*(\d+(?:\.\d+)?)\s*\|\s*(.+)"
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                score = float(match.group(1))
                explanation = match.group(2).strip()
                result.dimension_scores[dimension] = min(5.0, max(1.0, score))
                result.explanations[dimension] = explanation

        # Overall score
        overall_match = re.search(r"OVERALL:\s*(\d+(?:\.\d+)?)", text, re.IGNORECASE)
        if overall_match:
            result.overall_score = min(5.0, max(1.0, float(overall_match.group(1))))
        elif result.dimension_scores:
            result.overall_score = sum(result.dimension_scores.values()) / len(result.dimension_scores)

        return result
