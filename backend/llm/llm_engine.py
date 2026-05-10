"""
LLM Engine - Ollama Integration for AuraLearn
Handles communication with local Ollama LLM for response generation.
"""

import requests
import json
from typing import List, Dict, Optional


SYSTEM_PROMPT = """You are AuraLearn, a hallucination-controlled academic tutoring assistant.

STRICT RULES:
1. You MUST answer questions ONLY using the provided course materials/context.
2. If the context does not contain enough information to answer, say so clearly.
3. Do NOT make up facts, formulas, definitions, or examples that are not in the context.
4. Always reference which source material your answer is based on.
5. Be clear, concise, and pedagogically helpful.
6. If you are unsure, say "Based on the available materials, I cannot fully answer this."

You are helping university students understand academic concepts accurately."""


class LLMEngine:
    """
    Manages communication with Ollama for LLM-based response generation.
    """

    def __init__(
        self,
        model_name: str = "llama3.2",
        ollama_url: str = "http://localhost:11434",
        temperature: float = 0.7,
        max_tokens: int = 1024
    ):
        self.model_name = model_name
        self.ollama_url = ollama_url
        self.temperature = temperature
        self.max_tokens = max_tokens

    def check_availability(self) -> Dict:
        """Check if Ollama is running and the model is available."""
        try:
            resp = requests.get(f"{self.ollama_url}/api/tags", timeout=5)
            if resp.status_code == 200:
                models = resp.json().get("models", [])
                model_names = [m.get("name", "") for m in models]
                has_model = any(self.model_name in n for n in model_names)
                return {
                    "status": "available",
                    "ollama_running": True,
                    "model_available": has_model,
                    "model_name": self.model_name,
                    "available_models": model_names
                }
            return {"status": "error", "ollama_running": False, "message": "Ollama returned non-200"}
        except requests.ConnectionError:
            return {"status": "error", "ollama_running": False, "message": "Ollama is not running. Start it with: ollama serve"}
        except Exception as e:
            return {"status": "error", "ollama_running": False, "message": str(e)}

    def _build_messages(
        self,
        query: str,
        context: str,
        conversation_history: Optional[List[Dict]] = None
    ) -> List[Dict]:
        """Build the messages array for Ollama chat API."""
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]

        # Add conversation history
        if conversation_history:
            messages.extend(conversation_history)

        # Build user message with context
        user_content = f"""**Retrieved Course Materials:**
---
{context}
---

**Student Question:** {query}

Please provide an accurate response grounded ONLY in the above course materials. Reference the source documents when possible."""

        messages.append({"role": "user", "content": user_content})
        return messages

    def generate(
        self,
        query: str,
        context: str,
        conversation_history: Optional[List[Dict]] = None
    ) -> str:
        """
        Generate a single response using Ollama chat API.

        Args:
            query: The student's question.
            context: Retrieved course material text.
            conversation_history: Previous conversation messages.

        Returns:
            str: The LLM-generated response text.
        """
        messages = self._build_messages(query, context, conversation_history)

        try:
            resp = requests.post(
                f"{self.ollama_url}/api/chat",
                json={
                    "model": self.model_name,
                    "messages": messages,
                    "stream": False,
                    "options": {
                        "temperature": self.temperature,
                        "num_predict": self.max_tokens
                    }
                },
                timeout=120
            )

            if resp.status_code == 200:
                data = resp.json()
                return data.get("message", {}).get("content", "")
            else:
                return f"Error: Ollama returned status {resp.status_code}. Response: {resp.text}"

        except requests.ConnectionError:
            return "Error: Cannot connect to Ollama. Please ensure Ollama is running (ollama serve)."
        except requests.Timeout:
            return "Error: LLM response timed out. Please try a shorter question."
        except Exception as e:
            return f"Error generating response: {str(e)}"

    def generate_multiple(
        self,
        query: str,
        context: str,
        n: int = 3,
        conversation_history: Optional[List[Dict]] = None
    ) -> List[str]:
        """
        Generate multiple responses for self-consistency checking.

        Args:
            query: The student's question.
            context: Retrieved course material text.
            n: Number of responses to generate.
            conversation_history: Previous conversation messages.

        Returns:
            List[str]: List of generated response texts.
        """
        responses = []
        for i in range(n):
            # Use slightly different temperatures for diversity
            original_temp = self.temperature
            self.temperature = max(0.3, self.temperature + (i * 0.15))
            resp = self.generate(query, context, conversation_history)
            self.temperature = original_temp
            if not resp.startswith("Error:"):
                responses.append(resp)
        return responses if responses else [self.generate(query, context, conversation_history)]
