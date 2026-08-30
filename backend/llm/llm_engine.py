"""
LLM Engine - Dedicated Google AI Studio (Gemini API) Integration for AuraLearn
Handles direct cloud communication with Google Gemini for grounded response generation.
"""

import os
import requests
import json
from typing import List, Dict, Optional, Any
from config.settings import settings


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
    Manages response generation exclusively via Google AI Studio (Gemini) API.
    """

    def __init__(
        self,
        model_name: Optional[str] = None,
        api_key: Optional[str] = None,
        gemini_api_url: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ):
        self.model_name = model_name or settings.llm_model or "gemini-2.5-flash"
        self.api_key = api_key or settings.gemini_api_key
        self.gemini_api_url = gemini_api_url or settings.gemini_api_url
        self.temperature = temperature if temperature is not None else settings.llm_temperature
        self.max_tokens = max_tokens if max_tokens is not None else settings.llm_max_tokens

    def check_availability(self) -> Dict[str, Any]:
        """Check if Google AI Studio (Gemini) API is configured and accessible."""
        if not self.api_key or self.api_key in ("your_gemini_api_key_here", "your_api_key_here", "YOUR_GEMINI_API_KEY"):
            return {
                "status": "error",
                "provider": "Google Gemini API",
                "model_available": False,
                "model_name": self.model_name,
                "message": "Gemini API key is not configured. Please add GEMINI_API_KEY in backend/.env"
            }

        # Verify connection and model with Google AI Studio
        try:
            clean_model = self.model_name.replace("models/", "")
            url = f"{self.gemini_api_url}/models/{clean_model}?key={self.api_key}"
            resp = requests.get(url, timeout=8)
            if resp.status_code == 200:
                return {
                    "status": "available",
                    "provider": "Google Gemini API",
                    "model_available": True,
                    "model_name": self.model_name,
                    "message": f"Google Gemini ({self.model_name}) Connected"
                }
            else:
                err_text = resp.text
                try:
                    err_json = resp.json()
                    err_text = err_json.get("error", {}).get("message", err_text)
                except Exception:
                    pass
                return {
                    "status": "error",
                    "provider": "Google Gemini API",
                    "model_available": False,
                    "model_name": self.model_name,
                    "message": f"Gemini API Error ({resp.status_code}): {err_text}"
                }
        except Exception as e:
            return {
                "status": "error",
                "provider": "Google Gemini API",
                "model_available": False,
                "model_name": self.model_name,
                "message": f"Could not reach Google Gemini API: {str(e)}"
            }

    def generate(
        self,
        query: str,
        context: str,
        conversation_history: Optional[List[Dict]] = None
    ) -> str:
        """
        Generate a single grounded response via Google Gemini API.

        Args:
            query: The student's question.
            context: Retrieved course material text from vector store.
            conversation_history: Previous conversation messages for multi-turn context.

        Returns:
            str: The LLM-generated response text.
        """
        if not self.api_key or self.api_key in ("your_gemini_api_key_here", "your_api_key_here", "YOUR_GEMINI_API_KEY"):
            return (
                "⚠️ **Gemini API Key Required:** Please add your Google AI Studio API key in `backend/.env`:\n\n"
                "```env\n"
                "GEMINI_API_KEY=AIzaSy...\n"
                "```\n\n"
                "You can get a free API key at [https://aistudio.google.com](https://aistudio.google.com)."
            )

        clean_model = self.model_name.replace("models/", "")
        endpoint = f"{self.gemini_api_url}/models/{clean_model}:generateContent?key={self.api_key}"

        # Construct contents list
        contents = []

        # Convert prior conversation history to Gemini format (user / model)
        if conversation_history:
            for msg in conversation_history:
                role = "user" if msg.get("role") == "user" else "model"
                contents.append({
                    "role": role,
                    "parts": [{"text": msg.get("content", "")}]
                })

        # Add current user prompt grounded in retrieved course materials
        user_prompt = f"""**Retrieved Course Materials:**
---
{context}
---

**Student Question:** {query}

Please provide an accurate response grounded ONLY in the above course materials. Reference the source documents when possible."""

        contents.append({
            "role": "user",
            "parts": [{"text": user_prompt}]
        })

        payload = {
            "system_instruction": {
                "parts": [{"text": SYSTEM_PROMPT}]
            },
            "contents": contents,
            "generationConfig": {
                "temperature": self.temperature,
                "maxOutputTokens": self.max_tokens
            }
        }

        try:
            resp = requests.post(
                endpoint,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=60
            )
            if resp.status_code == 200:
                data = resp.json()
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts:
                        return parts[0].get("text", "").strip()
                return "Based on the provided course materials, I could not generate a response."
            else:
                err_msg = resp.text
                try:
                    err_json = resp.json()
                    err_msg = err_json.get("error", {}).get("message", err_msg)
                except Exception:
                    pass
                return f"⚠️ **Google Gemini API Error ({resp.status_code}):** {err_msg}"

        except requests.Timeout:
            return "⚠️ **Gemini API Timeout:** The request timed out. Please try asking again."
        except Exception as e:
            return f"⚠️ **Gemini API Error:** {str(e)}"

    def generate_multiple(
        self,
        query: str,
        context: str,
        n: int = 3,
        conversation_history: Optional[List[Dict]] = None
    ) -> List[str]:
        """
        Generate multiple responses via Google Gemini API for self-consistency checking.

        Args:
            query: The student's question.
            context: Retrieved course material text.
            n: Number of responses to generate (default: 3).
            conversation_history: Previous conversation messages.

        Returns:
            List[str]: List of generated response texts.
        """
        responses = []
        for i in range(n):
            original_temp = self.temperature
            # Perturb temperature slightly across samples to measure response consistency
            self.temperature = max(0.2, min(1.0, self.temperature + (i * 0.15)))
            resp = self.generate(query, context, conversation_history)
            self.temperature = original_temp
            if not resp.startswith("⚠️"):
                responses.append(resp)

        return responses if responses else [self.generate(query, context, conversation_history)]
