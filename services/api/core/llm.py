"""Unified Multi-Provider LLM Gateway.

Enables seamless switching between LLM providers (Anthropic Claude, OpenAI GPT-4o,
xAI Grok, Google Gemini, or any OpenAI-compatible API endpoint) using a single,
clean interface across all agent modules.

Providers:
- "anthropic": Uses anthropic SDK (default model: claude-3-5-sonnet / claude-3-5-haiku)
- "openai": Uses openai SDK (default model: gpt-4o / gpt-4o-mini)
- "grok": Uses openai SDK with xAI base_url ("https://api.x.ai/v1") and grok-2-1212
- "gemini": Uses openai SDK with Google OpenAI compatibility ("https://generativelanguage.googleapis.com/v1beta/openai/")
- "openai_compatible": Uses custom base_url (e.g. Ollama, vLLM, DeepSeek, LocalAI)
"""

import json
import logging
from typing import Any

from services.api.core.config import get_settings

logger = logging.getLogger(__name__)


class LLMUnavailable(RuntimeError):
    """Raised when the configured provider API key is missing or execution fails."""


def get_llm_client() -> tuple[str, Any]:
    """Resolves and returns (provider_name, client_instance).

    Raises LLMUnavailable if no valid API key is present for the chosen provider.
    """
    settings = get_settings()
    provider = (settings.llm_provider or "anthropic").lower()

    if provider == "anthropic":
        if not settings.anthropic_api_key:
            raise LLMUnavailable("ANTHROPIC_API_KEY is not configured.")
        import anthropic

        return ("anthropic", anthropic.Anthropic(api_key=settings.anthropic_api_key))

    if provider == "openai":
        if not settings.openai_api_key:
            raise LLMUnavailable("OPENAI_API_KEY is not configured.")
        import openai

        return ("openai", openai.OpenAI(api_key=settings.openai_api_key))

    if provider in {"grok", "groq"}:
        api_key = settings.grok_api_key or settings.openai_api_key
        if not api_key:
            raise LLMUnavailable("GROK_API_KEY / GROQ_API_KEY is not configured.")
        import openai

        # Groq keys start with 'gsk_', xAI keys start with 'xai-'
        if api_key.startswith("gsk_") or provider == "groq":
            base_url = settings.llm_base_url or "https://api.groq.com/openai/v1"
        else:
            base_url = settings.llm_base_url or "https://api.x.ai/v1"

        return ("grok", openai.OpenAI(api_key=api_key, base_url=base_url))

    if provider == "gemini":
        api_key = settings.gemini_api_key or settings.openai_api_key
        if not api_key:
            raise LLMUnavailable("GEMINI_API_KEY is not configured.")
        import openai

        base_url = settings.llm_base_url or "https://generativelanguage.googleapis.com/v1beta/openai/"
        return ("gemini", openai.OpenAI(api_key=api_key, base_url=base_url))

    if provider in {"openai_compatible", "ollama", "local"}:
        import openai

        base_url = settings.llm_base_url or "http://localhost:11434/v1"
        api_key = settings.openai_api_key or "ollama"
        return ("openai_compatible", openai.OpenAI(api_key=api_key, base_url=base_url))

    raise LLMUnavailable(f"Unsupported LLM provider: {provider}")


def generate_completion(
    prompt: str,
    system_prompt: str | None = None,
    tools: list[dict[str, Any]] | None = None,
    tool_choice: dict[str, Any] | None = None,
    is_fast: bool = False,
    response_json: bool = False,
) -> Any:
    """Unified completion function that works transparently across Anthropic, OpenAI,
    Grok, Gemini, and OpenAI-compatible providers.
    """
    settings = get_settings()
    provider, client = get_llm_client()

    model = settings.llm_model_fast if is_fast else settings.llm_model_judgment

    logger.info("LLM_COMPLETION provider=%s model=%s prompt_len=%d", provider, model, len(prompt))

    if provider == "anthropic":
        messages = [{"role": "user", "content": prompt}]
        kwargs: dict[str, Any] = {"model": model, "max_tokens": 1024, "messages": messages}
        if system_prompt:
            kwargs["system"] = system_prompt
        if tools:
            kwargs["tools"] = tools
        if tool_choice:
            kwargs["tool_choice"] = tool_choice

        res = client.messages.create(**kwargs)
        if tools:
            for block in res.content:
                if block.type == "tool_use":
                    return block.input
        return res.content[0].text if res.content else ""

    # OpenAI / Grok / Gemini / OpenAI-compatible provider logic
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    kwargs = {"model": model, "messages": messages}
    if response_json:
        kwargs["response_format"] = {"type": "json_object"}

    res = client.chat.completions.create(**kwargs)
    content = res.choices[0].message.content or ""

    if response_json:
        try:
            return json.loads(content)
        except Exception:
            return content

    return content
