"""Dispute Review Agent — doc 06 §4, "Sonnet, summarizes the candidate's submitted
context alongside original evidence for the human reviewer — CANNOT itself close a
dispute". FR-8.

Hard constraint (assignment file, doc 06 §4/§8): this function returns an assistive
summary only. It has no way to write to `fraud_flags.status` — only a human via
`PATCH /flags/{id}/review` can do that. Callers must never treat this output as a
decision.
"""

import json

import anthropic

from services.api.core.config import get_settings

_SUMMARY_SCHEMA = {
    "name": "dispute_review_summary",
    "description": "An assistive summary for a human reviewer — NOT a decision. Never includes a recommended verdict.",
    "input_schema": {
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
    },
}

_GROUNDING_RULE = (
    "You are assisting a human reviewer who will make the actual decision on this "
    "dispute. You must NOT recommend upholding or dismissing the flag, and you must not "
    "state or imply the candidate is lying or telling the truth — your only job is to "
    "neutrally summarize the candidate's statement and note where it does or doesn't "
    "align with the original evidence, so the human reviewer can decide faster with "
    "full context. This decision is theirs alone."
)


class DisputeReviewUnavailable(RuntimeError):
    pass


def summarize_dispute_for_reviewer(original_evidence: dict, candidate_statement: str) -> dict:
    """Returns {candidate_context_summary, points_of_agreement_or_conflict}. Raises
    `DisputeReviewUnavailable` if Sonnet can't run — the admin review endpoint still
    works without this (the raw evidence + candidate statement are always shown
    directly), this is a nice-to-have assist layer, not a gate."""
    settings = get_settings()
    if not settings.anthropic_api_key:
        raise DisputeReviewUnavailable("ANTHROPIC_API_KEY is not configured — dispute review assist requires it.")

    try:
        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        response = client.messages.create(
            model=settings.llm_model_judgment,
            max_tokens=500,
            tools=[_SUMMARY_SCHEMA],
            tool_choice={"type": "tool", "name": _SUMMARY_SCHEMA["name"]},
            messages=[
                {
                    "role": "user",
                    "content": (
                        f"{_GROUNDING_RULE}\n\nORIGINAL EVIDENCE:\n{json.dumps(original_evidence, indent=2, default=str)}"
                        f"\n\nCANDIDATE'S DISPUTE STATEMENT:\n{candidate_statement}"
                    ),
                }
            ],
        )
        for block in response.content:
            if block.type == "tool_use":
                return block.input
    except anthropic.APIError as exc:
        raise DisputeReviewUnavailable(f"Anthropic API call failed: {exc}") from exc
    raise DisputeReviewUnavailable("Model did not return structured tool output.")
