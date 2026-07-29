"""Fact-Check Agent — FR-5.4 / doc 01 §4 ("Fact-Check Agent | Haiku | Diffs generated
claims against `merged_profile` | Cheap but mandatory guardrail against fabrication").

Diffs every factual claim in a generated resume/cover letter against the candidate's
own `candidate_profile` data and flags anything unsupported. This is the enforcement
half of FR-5.4's "no fabrication" requirement (the other half is the generator's own
grounding instruction in `tools/document_generation.py` — prompt-only is not trusted
alone, per doc 01 §10's "zero tolerance for fabricated experience").
"""

import json

import anthropic

from services.api.core.config import get_settings

FACT_CHECK_SCHEMA = {
    "name": "fact_check_result",
    "description": "List every distinct factual claim in the generated document and whether the candidate profile supports it.",
    "input_schema": {
        "type": "object",
        "properties": {
            "findings": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "claim": {"type": "string"},
                        "supported": {
                            "type": "boolean",
                            "description": "True only if the candidate profile directly supports this claim.",
                        },
                        "note": {"type": "string"},
                    },
                    "required": ["claim", "supported"],
                },
            }
        },
        "required": ["findings"],
    },
}


class FactCheckUnavailable(RuntimeError):
    """Raised when the fact-check LLM call can't run (e.g. no API key, API failure)."""


def fact_check_claims(
    merged_profile: dict, generated_content: dict, document_type: str
) -> tuple[str, list[dict]]:
    """Returns (status, findings) where status is 'passed' or 'failed'.

    Never returns 'passed' by assumption when the check itself couldn't run — raises
    instead, so callers can't accidentally treat an unavailable check as a pass.
    """
    settings = get_settings()
    if not settings.anthropic_api_key:
        raise FactCheckUnavailable(
            "ANTHROPIC_API_KEY is not configured — the fact-check guardrail requires it."
        )

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    prompt = (
        "You are a strict fact-checker. Extract every distinct factual claim "
        "(employer, job title, dates, metrics, degree, skill, project outcome, etc.) "
        f"from this generated {document_type.replace('_', ' ')}, then mark each claim "
        "supported=true only if it is directly backed by the CANDIDATE PROFILE JSON. "
        "Mark supported=false for anything invented, exaggerated, or not present in "
        "the profile.\n\n"
        f"CANDIDATE PROFILE JSON:\n{json.dumps(merged_profile, default=str)}\n\n"
        f"GENERATED DOCUMENT JSON:\n{json.dumps(generated_content, default=str)}"
    )
    try:
        response = client.messages.create(
            model=settings.llm_model_fast,
            max_tokens=1536,
            tools=[FACT_CHECK_SCHEMA],
            tool_choice={"type": "tool", "name": "fact_check_result"},
            messages=[{"role": "user", "content": prompt}],
        )
    except anthropic.APIError as exc:
        raise FactCheckUnavailable(f"Anthropic API call failed: {exc}") from exc

    for block in response.content:
        if block.type == "tool_use":
            findings = block.input.get("findings", [])
            status = "passed" if all(f.get("supported") for f in findings) else "failed"
            return status, findings
    raise FactCheckUnavailable("Model did not return structured tool output.")
