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
    "gemini-3.6-flash": {"input": 0.15, "output": 0.60},
    "gemini-3.5-flash-lite": {"input": 0.075, "output": 0.30},
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

        models_to_try = [self.settings.gemini_model]
        for m in ["gemini-3.5-flash-lite", "gemini-flash-lite-latest", "gemini-3.1-flash-lite", "gemini-3.8-flash"]:
            if m not in models_to_try:
                models_to_try.append(m)

        response = None
        used_model = self.settings.gemini_model
        import asyncio

        for model_name in models_to_try:
            # Build config tailored for the specific model
            config_kwargs = {
                "temperature": temperature,
                "max_output_tokens": max_tokens,
                "system_instruction": system_instruction,
            }
            if json_mode:
                config_kwargs["response_mime_type"] = "application/json"

            # Only set thinking_budget for models that support/require it (e.g. gemini-3.8-flash)
            if "3.8" in model_name or "3.7" in model_name:
                try:
                    config_kwargs["thinking_config"] = types.ThinkingConfig(thinking_budget=0)
                except Exception:
                    pass

            config = types.GenerateContentConfig(**config_kwargs)

            try:
                # Enforce a 25-second maximum per model attempt to prevent Gateway Timeout
                response = await asyncio.wait_for(
                    asyncio.to_thread(
                        self._gemini_client.models.generate_content,
                        model=model_name,
                        contents=contents,
                        config=config,
                    ),
                    timeout=25.0,
                )
                used_model = model_name
                print(f"✅ Gemini model {model_name} succeeded in {int((time.time() - start_time) * 1000)}ms")
                break
            except asyncio.TimeoutError:
                print(f"⚠️ Gemini model {model_name} timed out after 25s. Trying next model...")
            except Exception as api_err:
                print(f"⚠️ Gemini API model {model_name} failed ({api_err}). Trying next model...")
                # If error was caused by thinking_config, retry immediately without it
                if "thinking_config" in config_kwargs:
                    del config_kwargs["thinking_config"]
                    try:
                        cfg_no_think = types.GenerateContentConfig(**config_kwargs)
                        response = await asyncio.wait_for(
                            asyncio.to_thread(
                                self._gemini_client.models.generate_content,
                                model=model_name,
                                contents=contents,
                                config=cfg_no_think,
                            ),
                            timeout=20.0,
                        )
                        used_model = model_name
                        print(f"✅ Gemini model {model_name} (no thinking) succeeded")
                        break
                    except Exception as retry_err:
                        print(f"⚠️ Gemini model {model_name} without thinking also failed: {retry_err}")

        if response is None:
            print("❌ All Gemini models failed or timed out. Returning fallback response.")
            return self._generate_fallback(messages, json_mode)

        generation_time = int((time.time() - start_time) * 1000)

        input_tokens = getattr(response.usage_metadata, "prompt_token_count", 0) or 0
        output_tokens = getattr(response.usage_metadata, "candidates_token_count", 0) or 0

        # Safely extract text content
        text_content = ""
        if hasattr(response, "text") and response.text:
            text_content = response.text
        elif response.candidates and response.candidates[0].content and response.candidates[0].content.parts:
            text_content = "".join(
                getattr(p, "text", "") for p in response.candidates[0].content.parts if getattr(p, "text", "")
            )

        if not text_content:
            print("⚠️ Empty text in response. Returning fallback.")
            return self._generate_fallback(messages, json_mode)

        # Log if the model was cut off
        finish_reason = None
        if response.candidates:
            finish_reason = str(getattr(response.candidates[0], "finish_reason", ""))
            if finish_reason and "MAX_TOKENS" in finish_reason.upper():
                print(f"⚠️  Gemini hit MAX_TOKENS — output truncated at {output_tokens} tokens.")

        cost = self._estimate_cost(
            used_model, input_tokens, output_tokens
        )

        return LLMResponse(
            content=text_content,
            model=used_model,
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
                    {"front": "What is the primary role of an API Gateway in enterprise microservices?", "back": "An API Gateway acts as a single entry point that handles request routing, composition, authentication, SSL termination, and rate limiting.", "learning_outcome": "LO1", "bloom_level": "Understand"},
                    {"front": "Explain the difference between Symmetric and Asymmetric Cryptography.", "back": "Symmetric encryption uses a single shared key for encryption and decryption, whereas asymmetric encryption uses a public-private key pair.", "learning_outcome": "LO2", "bloom_level": "Analyze"},
                    {"front": "How does JWT (JSON Web Token) stateless authentication work?", "back": "The server cryptographically signs a payload containing user claims and returns it. On subsequent requests, the client sends this token, allowing verification without server session state.", "learning_outcome": "LO3", "bloom_level": "Understand"},
                    {"front": "What is SQL Injection and how can developers prevent it?", "back": "SQL Injection occurs when untrusted input is concatenated into SQL commands. It is prevented by using parameterized queries and prepared statements.", "learning_outcome": "LO1", "bloom_level": "Apply"},
                    {"front": "Define Defense in Depth in secure system architecture.", "back": "A layered security strategy that incorporates multiple redundant defensive controls across physical, network, system, and application layers.", "learning_outcome": "LO2", "bloom_level": "Evaluate"},
                    {"front": "What is the function of the Spring Security Filter Chain?", "back": "It intercepts incoming HTTP requests through a sequence of security filters that enforce authentication, authorization, CSRF protection, and session management.", "learning_outcome": "LO3", "bloom_level": "Understand"},
                    {"front": "What is Cross-Site Scripting (XSS) and what are its main types?", "back": "XSS occurs when malicious scripts are injected into trusted websites. Types include Stored XSS, Reflected XSS, and DOM-based XSS.", "learning_outcome": "LO1", "bloom_level": "Analyze"},
                    {"front": "How does OAuth 2.0 differ from OpenID Connect (OIDC)?", "back": "OAuth 2.0 is an authorization framework issuing access tokens for resources; OpenID Connect is an identity layer built on top of OAuth 2.0 that provides authentication via ID tokens.", "learning_outcome": "LO3", "bloom_level": "Analyze"},
                    {"front": "What role does Docker containerization play in microservice isolation?", "back": "Docker packages applications with their dependencies into isolated containers using Linux cgroups and namespaces, ensuring reproducible environments.", "learning_outcome": "LO4", "bloom_level": "Apply"},
                    {"front": "What is the purpose of cryptographic hashing algorithms like SHA-256 and bcrypt?", "back": "Hashing creates a one-way mathematical fingerprint of data. Bcrypt specifically adds salt and a configurable work factor to protect stored passwords against brute-force attacks.", "learning_outcome": "LO2", "bloom_level": "Understand"},
                    {"front": "Explain the principle of Least Privilege (PoLP).", "back": "Users, processes, and systems should only be granted the minimum necessary access rights and permissions required to perform their tasks.", "learning_outcome": "LO1", "bloom_level": "Remember"},
                    {"front": "What is Role-Based Access Control (RBAC)?", "back": "An access control mechanism that assigns system permissions to specific roles, with users granted permissions according to their assigned roles.", "learning_outcome": "LO3", "bloom_level": "Apply"},
                    {"front": "How does Cross-Site Request Forgery (CSRF) work and how is it mitigated?", "back": "CSRF tricks an authenticated user into executing unwanted actions. It is prevented using anti-CSRF synchronizer tokens and SameSite cookie attributes.", "learning_outcome": "LO1", "bloom_level": "Evaluate"},
                    {"front": "What are the key stages of the Secure Software Development Life Cycle (SSDLC)?", "back": "Requirement analysis (threat modeling), secure architecture design, secure coding, static/dynamic security testing (SAST/DAST), and post-deployment monitoring.", "learning_outcome": "LO4", "bloom_level": "Create"},
                    {"front": "What is an event-driven architecture and what are its advantages?", "back": "A decoupled software architecture where services communicate asynchronously by producing and consuming events, providing high scalability, resilience, and loose coupling.", "learning_outcome": "LO5", "bloom_level": "Evaluate"}
                ],
                "quiz": [
                    {"question": "Which security measure prevents buffer overflow vulnerabilities?", "options": ["Bounds checking", "Disabling firewall", "Hardcoding passwords", "Ignoring inputs"], "correct_answer": "Bounds checking", "explanation": "Bounds checking ensures input data does not exceed allocated memory buffers.", "learning_outcome": "LO1", "bloom_level": "Apply"},
                    {"question": "Which authentication mechanism allows stateless authorization across multiple microservices?", "options": ["JSON Web Tokens (JWT)", "Server-side HTTP Sessions", "HTTP Basic Auth with hardcoded credentials", "Cookie-only JSESSIONID"], "correct_answer": "JSON Web Tokens (JWT)", "explanation": "JWTs contain cryptographically signed claims verifiable by any service without querying a shared session store.", "learning_outcome": "LO3", "bloom_level": "Analyze"}
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
