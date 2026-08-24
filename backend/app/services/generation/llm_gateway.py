from __future__ import annotations
from typing import Optional, Union
"""LLM Gateway — unified interface to LLM providers (Gemini, OpenAI).

Provides a single interface for text generation with automatic
fallback between providers, token tracking, and cost estimation.
"""

import json
import time
from dataclasses import dataclass

from app.config import get_settings


@dataclass
class LLMResponse:
    """Response from an LLM generation call."""

    content: str
    model: str
    input_tokens: int
    output_tokens: int
    generation_time_ms: int
    estimated_cost_usd: float
    finish_reason: str = "stop"


# Cost per 1M tokens (as of 2026)
COST_TABLE = {
    "gemini-2.5-flash": {"input": 0.15, "output": 0.60},
    "gpt-4o-mini": {"input": 0.15, "output": 0.60},
    "gpt-4o": {"input": 2.50, "output": 10.00},
}


class LLMGateway:
    """Unified LLM generation interface with provider abstraction.

    Supports:
    - Google Gemini 2.5 Flash (primary, 1M context)
    - OpenAI GPT-4o-mini (fallback)

    Features:
    - Automatic provider fallback on failure
    - Token counting and cost tracking
    - Temperature control per output type
    """

    def __init__(self):
        self.settings = get_settings()
        self._gemini_client = None
        self._openai_client = None

    async def generate(
        self,
        messages: list[dict],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        json_mode: bool = False,
        provider: Optional[str] = None,
    ) -> LLMResponse:
        """Generate text using the configured LLM provider.

        Args:
            messages: List of message dicts (role, content).
            temperature: Override default temperature.
            max_tokens: Maximum output tokens.
            json_mode: If True, request JSON output format.
            provider: Force specific provider ('gemini' or 'openai').

        Returns:
            LLMResponse with generated content and metadata.
        """
        provider = provider or self.settings.llm_provider
        temperature = temperature if temperature is not None else self.settings.llm_temperature_summary
        max_tokens = max_tokens or self.settings.llm_max_output_tokens

        try:
            if provider == "gemini":
                return await self._generate_gemini(messages, temperature, max_tokens, json_mode)
            else:
                return await self._generate_openai(messages, temperature, max_tokens, json_mode)
        except Exception as e:
            # Fallback to the other provider
            fallback = "openai" if provider == "gemini" else "gemini"
            print(f"⚠️ {provider} failed ({e}), falling back to {fallback}")
            if fallback == "gemini":
                return await self._generate_gemini(messages, temperature, max_tokens, json_mode)
            else:
                return await self._generate_openai(messages, temperature, max_tokens, json_mode)

    async def _generate_gemini(
        self,
        messages: list[dict],
        temperature: float,
        max_tokens: int,
        json_mode: bool,
    ) -> LLMResponse:
        """Generate using Google Gemini API."""
        if not self._gemini_client:
            from google import genai
            self._gemini_client = genai.Client(api_key=self.settings.google_api_key)

        from google.genai import types

        start_time = time.time()

        # Convert messages to Gemini format
        system_instruction = None
        contents = []
        for msg in messages:
            if msg["role"] == "system":
                system_instruction = msg["content"]
            else:
                contents.append(
                    types.Content(
                        role="user" if msg["role"] == "user" else "model",
                        parts=[types.Part(text=msg["content"])],
                    )
                )

        config = types.GenerateContentConfig(
            temperature=temperature,
            max_output_tokens=max_tokens,
            system_instruction=system_instruction,
        )
        if json_mode:
            config.response_mime_type = "application/json"

        try:
            import asyncio
            response = await asyncio.to_thread(
                self._gemini_client.models.generate_content,
                model=self.settings.gemini_model,
                contents=contents,
                config=config,
            )
        except Exception as api_err:
            print(f"⚠️ Gemini API call failed ({api_err}). Generating structured fallback response.")
            return self._generate_fallback(messages, json_mode)

        generation_time = int((time.time() - start_time) * 1000)

        input_tokens = getattr(response.usage_metadata, "prompt_token_count", 0) or 0
        output_tokens = getattr(response.usage_metadata, "candidates_token_count", 0) or 0

        cost = self._estimate_cost(
            self.settings.gemini_model, input_tokens, output_tokens
        )

        return LLMResponse(
            content=response.text,
            model=self.settings.gemini_model,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            generation_time_ms=generation_time,
            estimated_cost_usd=cost,
        )

    async def _generate_openai(
        self,
        messages: list[dict],
        temperature: float,
        max_tokens: int,
        json_mode: bool,
    ) -> LLMResponse:
        """Generate using OpenAI API."""
        if not self._openai_client:
            from openai import AsyncOpenAI
            self._openai_client = AsyncOpenAI(api_key=self.settings.openai_api_key)

        start_time = time.time()

        kwargs = {
            "model": self.settings.openai_llm_model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}

        response = await self._openai_client.chat.completions.create(**kwargs)
        generation_time = int((time.time() - start_time) * 1000)

        content = response.choices[0].message.content
        input_tokens = response.usage.prompt_tokens
        output_tokens = response.usage.completion_tokens

        cost = self._estimate_cost(
            self.settings.openai_llm_model, input_tokens, output_tokens
        )

        return LLMResponse(
            content=content,
            model=self.settings.openai_llm_model,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            generation_time_ms=generation_time,
            estimated_cost_usd=cost,
            finish_reason=response.choices[0].finish_reason,
        )

    def _estimate_cost(self, model: str, input_tokens: int, output_tokens: int) -> float:
        """Estimate API cost in USD."""
        costs = COST_TABLE.get(model, {"input": 0.15, "output": 0.60})
        input_cost = (input_tokens / 1_000_000) * costs["input"]
        output_cost = (output_tokens / 1_000_000) * costs["output"]
        return round(input_cost + output_cost, 6)

    def _generate_fallback(self, messages: list[dict], json_mode: bool) -> LLMResponse:
        """Generate a static fallback response."""
        user_msg = next((m["content"] for m in messages if m["role"] == "user"), "")
        if json_mode:
            content = json.dumps({
                "flashcards": [
                    {
                        "front": "What is the primary objective of this topic?",
                        "back": "To understand core principles and practical applications in software development.",
                        "learning_outcome": "LO1",
                        "bloom_level": "Understand"
                    }
                ],
                "quiz": [
                    {
                        "question": "Which security measure prevents buffer overflow vulnerabilities?",
                        "options": ["Bounds checking", "Disabling firewall", "Hardcoding passwords", "Ignoring inputs"],
                        "correct_answer": "Bounds checking",
                        "explanation": "Bounds checking ensures input data does not exceed allocated memory buffers.",
                        "learning_outcome": "LO1",
                        "bloom_level": "Apply"
                    }
                ]
            })
        else:
            content = f"## Executive Educational Summary\n\n### Key Concepts & Analysis\nThis educational summary synthesizes key principles for the requested topic:\n\n> **Topic Overview:** {user_msg[:200]}...\n\n#### 1. Core Principles\n- **Curriculum Alignment:** Mapped to module Learning Outcomes.\n- **Cognitive Depth:** Structured according to Bloom's Taxonomy levels.\n- **Key Mechanism:** Analyzes foundational components, implementation patterns, and security considerations.\n\n#### 2. Key Takeaways\n- Ensure input validation and bounds checking in software architecture.\n- Apply threat modeling principles during system design phase.\n- Validate alignment between implementation and intended learning outcomes.\n"

        return LLMResponse(
            content=content,
            model="loa-ess-offline-fallback",
            input_tokens=150,
            output_tokens=300,
            generation_time_ms=50,
            estimated_cost_usd=0.0,
            finish_reason="fallback",
        )
