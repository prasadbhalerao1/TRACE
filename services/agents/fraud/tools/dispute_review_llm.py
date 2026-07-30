"""Dispute Review Agent — doc 06 §4, "Sonnet, summarizes the candidate's submitted
context alongside original evidence for the human reviewer — CANNOT itself close a
dispute". FR-8.

Hard constraint (assignment file, doc 06 §4/§8): this function returns an assistive
summary only. It has no way to write to `fraud_flags.status` — only a human via
`PATCH /flags/{id}/review` can do that. Callers must never treat this output as a
decision.
"""

import json

from services.api.core.llm import LLMUnavailable, generate_structured

_SUMMARY_PARAMETERS = {
    "type": "object",
    "properties": {
        "candidate_context_summary": {
            "type": "string",
            "description": "Neutral summary of what the candidate is claiming in their dispute statement.",
        },
        "points_of_agreement_or_conflict": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Where the candidate's statement lines up with, or contradicts, the original evidence — factual observations only, no verdict.",
        },
    },
    "required": ["candidate_context_summary", "points_of_agreement_or_conflict"],
}

_GROUNDING_RULE = (
    "You are assisting a human reviewer who will make the actual decision on this "
    "dispute. You must NOT recommend upholding or dismissing the flag, and you must not "
    "state or imply the candidate is lying or telling the truth — your only job is to "
    "neutrally summarize the candidate's statement and note where it does or doesn't "
    "align with the original evidence, so the human reviewer can decide faster with "
    "full context. This decision is theirs alone."
)


# Raised if the configured provider can't run — the admin review endpoint still works
# without this (the raw evidence + candidate statement are always shown directly), this
# is a nice-to-have assist layer, not a gate.
DisputeReviewUnavailable = LLMUnavailable


def summarize_dispute_for_reviewer(original_evidence: dict, candidate_statement: str) -> dict:
    """Returns {candidate_context_summary, points_of_agreement_or_conflict}. Raises
    `DisputeReviewUnavailable` if the configured provider can't run."""
    prompt = (
        f"{_GROUNDING_RULE}\n\nORIGINAL EVIDENCE:\n{json.dumps(original_evidence, indent=2, default=str)}"
        f"\n\nCANDIDATE'S DISPUTE STATEMENT:\n{candidate_statement}"
    )
    return generate_structured(
        schema_name="dispute_review_summary",
        schema_description="An assistive summary for a human reviewer — NOT a decision. Never includes a recommended verdict.",
        parameters=_SUMMARY_PARAMETERS,
        prompt=prompt,
        max_tokens=500,
        agent_name="fraud.dispute_review",
    )
