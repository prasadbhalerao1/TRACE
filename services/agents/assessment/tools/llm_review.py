"""LLM Code Review Agent (FR-1.3, Sonnet) and the Grading Agent's partial-credit
rationale (Haiku). Same anthropic tool-use pattern as
`candidate_intelligence/tools/fact_check.py`.
"""

import json

import anthropic

from services.api.core.config import get_settings


class AssessmentUnavailable(RuntimeError):
    """Raised when a required LLM call can't run (missing API key, API failure) — never
    fabricate a review, rationale, question, or report."""


_CODE_REVIEW_SCHEMA = {
    "name": "code_review",
    "description": "Structured rubric review of submitted source code.",
    "input_schema": {
        "type": "object",
        "properties": {
            "readability": {"type": "number", "description": "0-100"},
            "architecture": {"type": "number", "description": "0-100"},
            "red_flags": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Concrete issues only (e.g. 'copy-pasted boilerplate unmodified', 'no error handling on the happy path assumed to fail'). Empty array if none.",
            },
            "rationale": {"type": "string"},
        },
        "required": ["readability", "architecture", "red_flags", "rationale"],
    },
}

_GRADING_RATIONALE_SCHEMA = {
    "name": "partial_credit_rationale",
    "description": "One short sentence explaining a near-miss test result for partial credit.",
    "input_schema": {
        "type": "object",
        "properties": {"rationale": {"type": "string"}},
        "required": ["rationale"],
    },
}


def _client(settings) -> anthropic.Anthropic:
    if not settings.anthropic_api_key:
        raise AssessmentUnavailable("ANTHROPIC_API_KEY is not configured — this step requires it.")
    return anthropic.Anthropic(api_key=settings.anthropic_api_key)


def _extract_tool_input(response, tool_name: str) -> dict:
    for block in response.content:
        if block.type == "tool_use" and block.name == tool_name:
            return block.input
    raise AssessmentUnavailable(f"Model did not return structured '{tool_name}' output.")


def review_code(problem_statement: str, source: str, static_analysis: dict) -> dict:
    """Grounded in the actual submitted source and the deterministic static-analysis
    findings above it — never invents an architectural judgment unrelated to what's
    actually in the code."""
    settings = get_settings()
    client = _client(settings)
    prompt = (
        "You are the LLM Code Review Agent for a technical assessment platform. Review "
        "the candidate's submission below on readability and architecture (0-100 each), "
        "and list concrete red flags only if they're actually present in this specific "
        "code — never invent a generic-sounding issue that isn't backed by the source. "
        "Use the static analysis findings (complexity, security smells) as supporting "
        "evidence, not as the sole basis for your score.\n\n"
        f"PROBLEM STATEMENT:\n{problem_statement}\n\n"
        f"SUBMITTED SOURCE:\n{source}\n\n"
        f"STATIC ANALYSIS FINDINGS (JSON):\n{json.dumps(static_analysis, default=str)}"
    )
    try:
        response = client.messages.create(
            model=settings.llm_model_judgment,
            max_tokens=1024,
            tools=[_CODE_REVIEW_SCHEMA],
            tool_choice={"type": "tool", "name": "code_review"},
            messages=[{"role": "user", "content": prompt}],
        )
    except anthropic.APIError as exc:
        raise AssessmentUnavailable(f"Anthropic API call failed: {exc}") from exc
    return _extract_tool_input(response, "code_review")


def grading_rationale(problem_statement: str, tests_passed: int, tests_total: int, source: str) -> str | None:
    """Only called for near-miss submissions (some but not all tests passing) — a clean
    pass or a total fail needs no LLM rationale, the numbers already say it."""
    settings = get_settings()
    if not settings.anthropic_api_key:
        return None
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    prompt = (
        "You are the Grading Agent's partial-credit explainer for a coding assessment. "
        f"The candidate passed {tests_passed}/{tests_total} hidden tests. In one short "
        "sentence, explain what the submitted code likely gets right and what edge case "
        "it's probably missing — grounded only in the code shown, never speculative "
        "beyond what's visible.\n\n"
        f"PROBLEM STATEMENT:\n{problem_statement}\n\n"
        f"SUBMITTED SOURCE:\n{source}"
    )
    try:
        response = client.messages.create(
            model=settings.llm_model_fast,
            max_tokens=256,
            tools=[_GRADING_RATIONALE_SCHEMA],
            tool_choice={"type": "tool", "name": "partial_credit_rationale"},
            messages=[{"role": "user", "content": prompt}],
        )
    except anthropic.APIError:
        return None
    for block in response.content:
        if block.type == "tool_use":
            return block.input.get("rationale")
    return None
