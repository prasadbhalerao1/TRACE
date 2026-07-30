"""Fraud Risk Report Agent — doc 06 §4, "Sonnet, writes the human-readable report
strictly from `signals`/evidence — never adds unsupported claims". FR-7.

The report text is a NARRATIVE LAYER on top of the already-complete structured evidence
(the `verification_records`/`fraud_flags.evidence` rows always exist and are always
sufficient on their own — this just makes them readable for a human reviewer). If Sonnet
is unavailable (no API key, API error), a flag is still raised with a deterministic
template built directly from the evidence dict — a missing LLM narrative must never
block or weaken the actual evidence-bearing flag (doc 06 §11: "every fraud_flags row
must have non-null evidence" — that requirement doesn't depend on this agent working).
"""

import json

import anthropic

from services.api.core.config import get_settings

_REPORT_SCHEMA = {
    "name": "fraud_risk_report",
    "description": "A structured, evidence-linked fraud risk report for one flagged signal.",
    "input_schema": {
        "type": "object",
        "properties": {
            "summary": {
                "type": "string",
                "description": "One or two sentences summarizing the concern, citing the specific evidence only.",
            },
            "cited_evidence": {
                "type": "array",
                "items": {"type": "string"},
                "description": "The exact evidence strings this summary is grounded in — must be a subset of the input evidence, never invented.",
            },
        },
        "required": ["summary", "cited_evidence"],
    },
}

_GROUNDING_RULE = (
    "You are writing a fraud risk report for a human reviewer. You must write STRICTLY "
    "from the evidence provided below — never add claims, motives, or conclusions not "
    "directly supported by it. This is the highest ethical-risk part of the platform: a "
    "false accusation can end a candidate's opportunity unfairly. Frame this as "
    "'evidence to review,' never as a guilt verdict. If the evidence is weak or "
    "ambiguous, say so plainly rather than overstating it."
)


def _deterministic_fallback(flag_type: str, evidence_items: list[str]) -> dict:
    return {
        "summary": f"{flag_type.replace('_', ' ').title()} signal raised for review. See cited evidence.",
        "cited_evidence": evidence_items,
    }


def generate_fraud_risk_report(flag_type: str, evidence_items: list[str]) -> dict:
    """Returns {summary, cited_evidence}. Falls back to a deterministic template (never
    raises) if Sonnet is unavailable — matches every other module's "typed unavailable,
    degrade gracefully, never fabricate OR block" pattern."""
    settings = get_settings()
    if not settings.anthropic_api_key:
        return _deterministic_fallback(flag_type, evidence_items)

    try:
        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        response = client.messages.create(
            model=settings.llm_model_judgment,
            max_tokens=500,
            tools=[_REPORT_SCHEMA],
            tool_choice={"type": "tool", "name": _REPORT_SCHEMA["name"]},
            messages=[
                {
                    "role": "user",
                    "content": (
                        f"{_GROUNDING_RULE}\n\nFLAG TYPE: {flag_type}\n\n"
                        f"EVIDENCE:\n{json.dumps(evidence_items, indent=2)}"
                    ),
                }
            ],
        )
        for block in response.content:
            if block.type == "tool_use":
                return block.input
    except Exception:
        pass
    return _deterministic_fallback(flag_type, evidence_items)
