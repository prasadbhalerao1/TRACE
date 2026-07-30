"""LLM Code Review Agent (FR-1.3, judgment-tier) and the Grading Agent's partial-credit
rationale (fast-tier). Routed through `services.api.core.llm.generate_structured` so
this works against whichever provider `LLM_PROVIDER` selects (Anthropic in production,
Groq for testing — see `.env`) and is traced the same way regardless.
"""

import json

from services.api.core.llm import LLMUnavailable, generate_structured

__all__ = ["AssessmentUnavailable", "review_code", "grading_rationale"]

# Re-exported under this module's historical name — every other tool file in this
# package imports `AssessmentUnavailable` from here.
AssessmentUnavailable = LLMUnavailable

_CODE_REVIEW_PARAMETERS = {
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
}

_GRADING_RATIONALE_PARAMETERS = {
    "type": "object",
    "properties": {"rationale": {"type": "string"}},
    "required": ["rationale"],
}


def review_code(problem_statement: str, source: str, static_analysis: dict) -> dict:
    """Grounded in the actual submitted source and the deterministic static-analysis
    findings above it — never invents an architectural judgment unrelated to what's
    actually in the code."""
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
    return generate_structured(
        schema_name="code_review",
        schema_description="Structured rubric review of submitted source code.",
        parameters=_CODE_REVIEW_PARAMETERS,
        prompt=prompt,
        agent_name="assessment.llm_code_review",
    )


def grading_rationale(problem_statement: str, tests_passed: int, tests_total: int, source: str) -> str | None:
    """Only called for near-miss submissions (some but not all tests passing) — a clean
    pass or a total fail needs no LLM rationale, the numbers already say it. Best-effort:
    returns `None` rather than raising if the configured provider is unavailable."""
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
        result = generate_structured(
            schema_name="partial_credit_rationale",
            schema_description="One short sentence explaining a near-miss test result for partial credit.",
            parameters=_GRADING_RATIONALE_PARAMETERS,
            prompt=prompt,
            is_fast=True,
            max_tokens=256,
            agent_name="assessment.grading_rationale",
        )
    except LLMUnavailable:
        return None
    return result.get("rationale")
