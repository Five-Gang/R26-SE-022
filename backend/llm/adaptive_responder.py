"""
Adaptive Responder - Response Strategy Selection for AuraLearn
Selects between Direct Answer, Guided Hint, or Clarification Request
based on confidence level.
"""

from typing import List, Dict


class AdaptiveResponder:
    """
    Implements the adaptive response strategy based on confidence levels:
    - HIGH confidence  → Direct Answer with citations
    - MEDIUM confidence → Guided Hint from course materials
    - LOW confidence    → Clarification Request
    """

    def format_direct_answer(
        self,
        llm_response: str,
        sources: List[Dict]
    ) -> str:
        """
        Format a high-confidence direct answer with source citations.

        Args:
            llm_response: The raw LLM response.
            sources: Retrieved source documents.

        Returns:
            str: Formatted response with citations.
        """
        # Build source citations
        citations = self._build_citations(sources)
        response = llm_response.strip()

        if citations:
            response += f"\n\n📚 **Sources:**\n{citations}"

        return response

    def format_guided_hint(
        self,
        llm_response: str,
        sources: List[Dict]
    ) -> str:
        """
        Format a medium-confidence guided hint.

        Args:
            llm_response: The raw LLM response.
            sources: Retrieved source documents.

        Returns:
            str: Formatted hint response.
        """
        hint_prefix = (
            "💡 **Hint:** Based on the available course materials, "
            "here's a guided hint to help you understand this topic:\n\n"
        )

        # Extract key points from the LLM response as hints
        response_lines = llm_response.strip().split('\n')
        hint_content = []
        for line in response_lines:
            stripped = line.strip()
            if stripped:
                hint_content.append(f"• {stripped}" if not stripped.startswith(('•', '-', '*', '1', '2', '3')) else stripped)

        hint_text = '\n'.join(hint_content[:5])  # Limit to 5 key points

        citations = self._build_citations(sources)

        result = f"{hint_prefix}{hint_text}"

        if citations:
            result += (
                f"\n\n📖 **Suggested Reading:**\n{citations}"
                "\n\n🔍 *Try reviewing the above materials and rephrase your question "
                "for a more specific answer.*"
            )

        return result

    def format_clarification_request(
        self,
        original_query: str,
        sources: List[Dict]
    ) -> str:
        """
        Format a low-confidence clarification request.

        Args:
            original_query: The student's original question.
            sources: Retrieved source documents (may be weak matches).

        Returns:
            str: Formatted clarification request.
        """
        response = (
            "🤔 **I need more clarity to give you an accurate answer.**\n\n"
            "The available course materials don't contain enough information "
            "to confidently answer your question. This could mean:\n\n"
            "1. The topic might not be covered in the uploaded materials\n"
            "2. The question might need to be more specific\n"
            "3. Additional course materials may need to be uploaded\n\n"
            "**Suggestions:**\n"
            "• Try rephrasing your question with more specific terms\n"
            "• Mention the specific topic or chapter you're studying\n"
            "• Ask your instructor to upload relevant materials\n"
        )

        if sources:
            source_names = set()
            for s in sources[:3]:
                name = s.get("source", s.get("filename", ""))
                if name:
                    source_names.add(name)
            if source_names:
                response += (
                    f"\n📄 *Related materials found (low relevance):* "
                    f"{', '.join(source_names)}"
                )

        return response

    def _build_citations(self, sources: List[Dict]) -> str:
        """Build formatted citation string from source documents."""
        if not sources:
            return ""

        citations = []
        seen_sources = set()

        for i, source in enumerate(sources[:5]):
            filename = source.get("source", source.get("filename", "Unknown"))
            similarity = source.get("similarity", 0)

            if filename in seen_sources:
                continue
            seen_sources.add(filename)

            if similarity > 0:
                citations.append(f"  {len(citations)+1}. *{filename}* (relevance: {similarity:.0%})")
            else:
                citations.append(f"  {len(citations)+1}. *{filename}*")

        return '\n'.join(citations)

    def generate_response(
        self,
        llm_response: str,
        confidence_level: str,
        confidence_score: float,
        sources: List[Dict],
        original_query: str = ""
    ) -> Dict:
        """
        Apply the adaptive response strategy based on confidence.

        Args:
            llm_response: Raw LLM-generated response.
            confidence_level: "HIGH", "MEDIUM", or "LOW".
            confidence_score: Numeric confidence score (0-1).
            sources: Retrieved source documents.
            original_query: The student's original query.

        Returns:
            Dict: Contains formatted response, response_type, and metadata.
        """
        if confidence_level == "HIGH":
            formatted_response = self.format_direct_answer(llm_response, sources)
            response_type = "direct_answer"
            response_label = "✅ Direct Answer"

        elif confidence_level == "MEDIUM":
            formatted_response = self.format_guided_hint(llm_response, sources)
            response_type = "guided_hint"
            response_label = "💡 Guided Hint"

        else:  # LOW
            formatted_response = self.format_clarification_request(original_query, sources)
            response_type = "clarification_request"
            response_label = "🔍 Clarification Needed"

        return {
            "response": formatted_response,
            "response_type": response_type,
            "response_label": response_label,
            "confidence_level": confidence_level,
            "confidence_score": confidence_score
        }
