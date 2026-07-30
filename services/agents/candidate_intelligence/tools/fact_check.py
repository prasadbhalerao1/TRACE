"""Fact-Check Agent — FR-5.4 / doc 01 §4 ("Fact-Check Agent | Haiku | Diffs generated
claims against `merged_profile` | Cheap but mandatory guardrail against fabrication").

Diffs every factual claim in a generated resume/cover letter against the candidate's
own `candidate_profile` data and flags anything unsupported. This is the enforcement
half of FR-5.4's "no fabrication" requirement (the other half is the generator's own
grounding instruction in `tools/document_generation.py` — prompt-only is not trusted
alone, per doc 01 §10's "zero tolerance for fabricated experience").
"""

import json

from services.api.core.llm import LLMUnavailable, generate_structured

FACT_CHECK_PARAMETERS = {
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
}


# Raised when the fact-check LLM call can't run (e.g. no/misconfigured provider key, API failure).
FactCheckUnavailable = LLMUnavailable


def fact_check_claims(
    merged_profile: dict, generated_content: dict, document_type: str
) -> tuple[str, list[dict]]:
    """Returns (status, findings) where status is 'passed' or 'failed'.

    Never returns 'passed' by assumption when the check itself couldn't run — raises
    instead, so callers can't accidentally treat an unavailable check as a pass.
    """
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
    result = generate_structured(
        schema_name="fact_check_result",
        schema_description="List every distinct factual claim in the generated document and whether the candidate profile supports it.",
        parameters=FACT_CHECK_PARAMETERS,
        prompt=prompt,
        is_fast=True,
        max_tokens=1536,
        agent_name="candidate_intelligence.fact_check",
    )
    findings = result.get("findings", [])
    status = "passed" if all(f.get("supported") for f in findings) else "failed"
    return status, findings
