"""Langfuse tracing helper — Platform Hardening & Observability track (2026-07-30).

Gated no-op when `LANGFUSE_PUBLIC_KEY`/`LANGFUSE_SECRET_KEY` are empty or a placeholder
value (the current real state of this repo's `.env` — no Langfuse keys configured yet,
see `.agents/decisions.md`'s dated entry for this track). Same "typed empty default,
fails closed, never fabricates" pattern already used repo-wide for
`ANTHROPIC_API_KEY`/`CLOUDINARY_URL` (doc/SRS Module 01 §9).

`packages/db/models/agent_run.py`'s `AgentRun.langfuse_trace_id` column has existed since
the first module shipped but every router has always left it `None` — nothing populated
it. This module gives every `services/api/routers/*.py` call site a one-line way to
populate it, without requiring a live Langfuse account to do so safely.

Two entry points:
  1. `record_agent_trace(...)` — the one actually used by every router in this pass.
     Every existing `AgentRun(...)` call site in this codebase computes its full
     input/output *before* constructing the row (the LangGraph `.ainvoke()` call already
     happened, deep inside `services/agents/*/graph.py`, by the time the router gets a
     result back). So this logs a single already-completed span as a post-hoc trace,
     rather than wrapping the live call — wrapping the live call would mean reaching into
     `services/agents/*/graph.py` internals, which this track's file-ownership rules
     explicitly reserve to the module owners.
  2. `traced_call(...)` — an async wrapper for a *future* session that wants a live span
     around an actual Anthropic call or `graph.ainvoke()` (real latency, real token
     usage) instead of a post-hoc log. Not called anywhere in this pass; provided because
     the assignment brief asks for "a helper that wraps ... and returns the trace id",
     and a live-wrapping helper is the more complete version of that for whoever
     eventually touches `services/agents/*/graph.py` next.
"""

from __future__ import annotations

import logging
from functools import lru_cache
from typing import Any, Awaitable, TypeVar

from services.api.core.config import get_settings

logger = logging.getLogger(__name__)

T = TypeVar("T")

_PLACEHOLDER_VALUES = {"", "changeme", "placeholder", "your-key-here", "your-public-key", "your-secret-key"}


def _is_placeholder(value: str) -> bool:
    return value.strip().lower() in _PLACEHOLDER_VALUES


@lru_cache
def _get_client() -> Any | None:
    """Return a cached Langfuse client, or `None` if tracing isn't configured.

    `lru_cache` means this is evaluated once per process, and a missing/placeholder key
    reliably short-circuits every call site below to a no-op for the lifetime of the
    process — no per-request settings re-check, no per-request crash risk.
    """
    settings = get_settings()
    if _is_placeholder(settings.langfuse_public_key) or _is_placeholder(settings.langfuse_secret_key):
        return None
    try:
        from langfuse import Langfuse
    except ImportError:
        logger.warning("langfuse package not installed; Langfuse tracing disabled")
        return None
    try:
        return Langfuse(
            public_key=settings.langfuse_public_key,
            secret_key=settings.langfuse_secret_key,
            host=settings.langfuse_host or "https://cloud.langfuse.com",
        )
    except Exception:
        # Tracing setup must never take the API down — degrade to the same "always None"
        # state this column has had since every module shipped.
        logger.exception("Failed to initialize Langfuse client; tracing disabled")
        return None


def record_agent_trace(
    agent_name: str,
    input_data: dict[str, Any] | None = None,
    output_data: dict[str, Any] | None = None,
    model: str | None = None,
) -> str | None:
    """Log a single-span trace for an already-completed agent run; return its trace id.

    Returns `None` (clean no-op) when Langfuse isn't configured — callers pass this
    return value straight into `AgentRun(langfuse_trace_id=...)`, so an unconfigured
    environment behaves exactly as it always has (column stays `None`), not a new
    failure mode.
    """
    client = _get_client()
    if client is None:
        return None
    try:
        span = client.start_observation(
            name=agent_name,
            as_type="generation" if model else "span",
            input=input_data,
            output=output_data,
            model=model,
        )
        trace_id = span.trace_id
        span.end()
        client.flush()
        return trace_id
    except Exception:
        # Observability must never break the actual request — degrade to None exactly
        # like an unconfigured key would.
        logger.exception("Langfuse trace recording failed for agent_name=%s", agent_name)
        return None


async def traced_call(
    agent_name: str,
    coro: Awaitable[T],
    input_data: dict[str, Any] | None = None,
    model: str | None = None,
) -> tuple[T, str | None]:
    """Wrap a live async call (an Anthropic request or a `graph.ainvoke()`) in a real
    Langfuse span and return `(result, trace_id)`. Falls back to `(await coro, None)`
    unchanged when Langfuse isn't configured, so callers never need an `if` around this.

    Not called anywhere in this codebase yet — see module docstring.
    """
    client = _get_client()
    if client is None:
        return await coro, None
    span = client.start_observation(name=agent_name, as_type="span", input=input_data)
    try:
        result = await coro
        try:
            span.update(output=result if isinstance(result, (dict, list, str, int, float, bool)) else str(result))
        except Exception:
            logger.exception("Failed to attach output to Langfuse span for agent_name=%s", agent_name)
        return result, span.trace_id
    finally:
        span.end()
        client.flush()
