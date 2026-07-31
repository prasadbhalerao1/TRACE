"""Unified Multi-Provider LLM Gateway.

Enables seamless switching between LLM providers (Anthropic Claude, OpenAI GPT-4o,
Groq/xAI Grok, Google Gemini, or any OpenAI-compatible API endpoint) using a single,
clean interface across all agent modules.

Providers:
- "anthropic": Uses anthropic SDK (default model: claude-3-5-sonnet / claude-3-5-haiku)
- "openai": Uses openai SDK (default model: gpt-4o / gpt-4o-mini)
- "grok"/"groq": Uses openai SDK against Groq's OpenAI-compatible endpoint
  ("https://api.groq.com/openai/v1", e.g. llama-3.3-70b-versatile) when the configured
  key looks like a Groq key (`gsk_...`) or the provider is explicitly "groq"; against
  xAI's endpoint ("https://api.x.ai/v1", grok-2-1212) otherwise. Groq is this
  repo's test-time provider (see `.env`'s `LLM_PROVIDER=grok` + `GROK_API_KEY=gsk_...`)
  so CI/local testing doesn't depend on a paid Anthropic key.
- "gemini": Uses openai SDK with Google OpenAI compatibility ("https://generativelanguage.googleapis.com/v1beta/openai/")
- "openai_compatible": Uses custom base_url (e.g. Ollama, vLLM, DeepSeek, LocalAI)

Every completion made through `generate_completion`/`generate_structured` is wrapped in
a Langfuse `generation` observation (model, token usage, input/output) — see
`services.api.core.tracing.start_llm_generation`. Agent tool code should call these
functions rather than instantiating a provider SDK client directly, so tracing and
provider-switching both stay centralized here.
"""

import asyncio
import json
import logging
from typing import Any

from services.api.core.config import get_settings
from services.api.core.tracing import start_llm_generation

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


async def generate_completion(
    prompt: str,
    system_prompt: str | None = None,
    tools: list[dict[str, Any]] | None = None,
    tool_choice: dict[str, Any] | None = None,
    is_fast: bool = False,
    response_json: bool = False,
    agent_name: str | None = None,
) -> Any:
    """Unified free-form completion function that works transparently across
    Anthropic, OpenAI, Groq/Grok, Gemini, and OpenAI-compatible providers.

    Prefer `generate_structured` for anything that needs schema-constrained output
    (the overwhelming majority of this codebase's LLM calls) — it handles the
    Anthropic-vs-OpenAI tool-calling schema differences for you. This function is for
    the rare free-text/narrative case.

    The underlying provider SDKs are used synchronously and run via `asyncio.to_thread`
    so a slow LLM round-trip doesn't block the event loop (and every other in-flight
    request) for the duration of the call.
    """
    settings = get_settings()
    provider, client = get_llm_client()
    model = settings.llm_model_fast if is_fast else settings.llm_model_judgment

    logger.info("LLM_COMPLETION provider=%s model=%s prompt_len=%d", provider, model, len(prompt))

    with start_llm_generation(
        name=agent_name or "generate-completion",
        model=model,
        input_data={"system": system_prompt, "prompt": prompt},
        metadata={"provider": provider},
    ) as generation:
        if provider == "anthropic":
            messages = [{"role": "user", "content": prompt}]
            kwargs: dict[str, Any] = {"model": model, "max_tokens": 1024, "messages": messages}
            if system_prompt:
                kwargs["system"] = system_prompt
            if tools:
                kwargs["tools"] = tools
            if tool_choice:
                kwargs["tool_choice"] = tool_choice

            res = await asyncio.to_thread(client.messages.create, **kwargs)
            output: Any = None
            if tools:
                for block in res.content:
                    if block.type == "tool_use":
                        output = block.input
                        break
            if output is None:
                output = res.content[0].text if res.content else ""

            usage = getattr(res, "usage", None)
            generation.update(
                output=output,
                usage_details={"input": usage.input_tokens, "output": usage.output_tokens} if usage else None,
            )
            return output

        # OpenAI / Grok / Gemini / OpenAI-compatible provider logic
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        kwargs = {"model": model, "messages": messages}
        if response_json:
            kwargs["response_format"] = {"type": "json_object"}

        res = await asyncio.to_thread(client.chat.completions.create, **kwargs)
        content = res.choices[0].message.content or ""

        output = content
        if response_json:
            try:
                output = json.loads(content)
            except Exception:
                output = content

        usage = getattr(res, "usage", None)
        generation.update(
            output=output,
            usage_details={"input": usage.prompt_tokens, "output": usage.completion_tokens} if usage else None,
        )
        return output


async def generate_structured(
    schema_name: str,
    schema_description: str,
    parameters: dict[str, Any],
    prompt: str,
    system_prompt: str | None = None,
    is_fast: bool = False,
    max_tokens: int = 1024,
    temperature: float | None = None,
    agent_name: str | None = None,
) -> dict[str, Any]:
    """Provider-agnostic schema-constrained completion.

    `parameters` is a JSON-schema `object` spec (the same shape as Anthropic's
    `input_schema` / OpenAI's `parameters`) — e.g.
    `{"type": "object", "properties": {...}, "required": [...]}`.

    Translates it to each provider's native tool-calling format under the hood
    (Anthropic `tools`/`tool_choice`, OpenAI-style `tools=[{"type":"function",...}]`)
    so callers write the schema once. Raises `LLMUnavailable` if the model doesn't
    return the requested structured output, or the provider call fails.

    Every call is wrapped in a Langfuse `generation` observation (model, token usage,
    input/output) via `start_llm_generation`, nested under whatever `start_agent_trace`
    span is active — see `services.api.core.tracing`.

    The underlying provider SDKs are used synchronously and run via `asyncio.to_thread`
    so a slow LLM round-trip doesn't block the event loop (and every other in-flight
    request) for the duration of the call.
    """
    settings = get_settings()
    provider, client = get_llm_client()
    model = settings.llm_model_fast if is_fast else settings.llm_model_judgment

    with start_llm_generation(
        name=agent_name or schema_name,
        model=model,
        input_data={"system": system_prompt, "prompt": prompt} if system_prompt else {"prompt": prompt},
        metadata={"provider": provider, "schema": schema_name},
    ) as generation:
        if provider == "anthropic":
            kwargs: dict[str, Any] = {
                "model": model,
                "max_tokens": max_tokens,
                "messages": [{"role": "user", "content": prompt}],
                "tools": [
                    {
                        "name": schema_name,
                        "description": schema_description,
                        "input_schema": parameters,
                    }
                ],
                "tool_choice": {"type": "tool", "name": schema_name},
            }
            if system_prompt:
                kwargs["system"] = system_prompt
            if temperature is not None:
                kwargs["temperature"] = temperature

            try:
                response = await asyncio.to_thread(client.messages.create, **kwargs)
            except Exception as exc:
                raise LLMUnavailable(f"Anthropic structured-output call failed: {exc}") from exc

            result = None
            for block in response.content:
                if block.type == "tool_use" and block.name == schema_name:
                    result = block.input
                    break
            if result is None:
                raise LLMUnavailable(f"Model did not return structured '{schema_name}' output.")

            usage = getattr(response, "usage", None)
            generation.update(
                output=result,
                usage_details={"input": usage.input_tokens, "output": usage.output_tokens} if usage else None,
            )
            return result

        # OpenAI / Grok(Groq) / Gemini / OpenAI-compatible — OpenAI function-calling schema
        messages = ([{"role": "system", "content": system_prompt}] if system_prompt else []) + [
            {"role": "user", "content": prompt}
        ]
        completion_kwargs: dict[str, Any] = {"model": model, "max_tokens": max_tokens, "messages": messages}
        if temperature is not None:
            completion_kwargs["temperature"] = temperature

        try:
            response = await asyncio.to_thread(
                client.chat.completions.create,
                **completion_kwargs,
                tools=[
                    {
                        "type": "function",
                        "function": {
                            "name": schema_name,
                            "description": schema_description,
                            "parameters": parameters,
                        },
                    }
                ],
                tool_choice={"type": "function", "function": {"name": schema_name}},
            )
        except Exception as exc:
            raise LLMUnavailable(f"{provider} structured-output call failed: {exc}") from exc

        message = response.choices[0].message
        result = None
        for call in message.tool_calls or []:
            if call.function.name == schema_name:
                try:
                    result = json.loads(call.function.arguments)
                except json.JSONDecodeError as exc:
                    raise LLMUnavailable(f"Model returned malformed structured output for '{schema_name}'.") from exc
                break
        if result is None:
            raise LLMUnavailable(f"Model did not return structured '{schema_name}' output.")

        usage = getattr(response, "usage", None)
        generation.update(
            output=result,
            usage_details={"input": usage.prompt_tokens, "output": usage.completion_tokens} if usage else None,
        )
        return result
