"""Supervisor intent classifier — Haiku, structured tool-use output. Same pattern as
Module 02's Query Understanding Agent
(`services/agents/recruitment/tools/copilot_llm.py:understand_query`): a tool-use schema,
`tool_choice` forced to that one tool, a typed `*Unavailable` exception raised (never a
silent fallback/guess) when the API key is missing, the call fails, or the model doesn't
return the structured tool output.
"""

import anthropic

from services.api.core.config import get_settings


class SupervisorUnavailable(Exception):
    """Raised when the supervisor's intent classifier can't run — missing
    ANTHROPIC_API_KEY, an API error, or malformed structured output. Never silently
    guessed; the router maps this to a typed 503, matching every other module's
    `RecruitmentUnavailable`/`ResumeExtractionUnavailable`/etc. convention."""


_INTENT_SCHEMA = {
    "name": "classified_intent",
    "description": "Classify which platform module should handle this natural-language request.",
    "input_schema": {
        "type": "object",
        "properties": {
            "intent": {
                "type": "string",
                "enum": ["candidate_score", "job_match"],
                "description": (
                    "'candidate_score': the request is asking about ONE candidate's Talent "
                    "Score, sub-scores, or overall profile strength. 'job_match': the "
                    "request is asking which candidates match a specific job posting, or "
                    "to (re)compute/fetch matches for a job."
                ),
            },
            "rationale": {
                "type": "string",
                "description": "One sentence explaining why this intent was chosen.",
            },
        },
        "required": ["intent", "rationale"],
    },
}


def _client(settings) -> anthropic.Anthropic:
    if not settings.anthropic_api_key:
        raise SupervisorUnavailable(
            "ANTHROPIC_API_KEY is not configured — the supervisor's intent classifier requires it."
        )
    return anthropic.Anthropic(api_key=settings.anthropic_api_key)


def classify_intent(raw_request: str) -> dict:
    settings = get_settings()
    client = _client(settings)
    prompt = (
        "You are the Supervisor's intent classifier for an AI talent intelligence and "
        "recruitment platform. Read the request below and classify which module should "
        "handle it. Only choose 'job_match' if the request is clearly about matching "
        "candidates to a job posting (finding/ranking/re-ranking candidates for a role); "
        "otherwise choose 'candidate_score'.\n\n"
        f'REQUEST: "{raw_request}"'
    )
    try:
        response = client.messages.create(
            model=settings.llm_model_fast,
            max_tokens=512,
            tools=[_INTENT_SCHEMA],
            tool_choice={"type": "tool", "name": "classified_intent"},
            messages=[{"role": "user", "content": prompt}],
        )
    except anthropic.APIError as exc:
        raise SupervisorUnavailable(f"Intent classification call failed: {exc}") from exc

    for block in response.content:
        if block.type == "tool_use" and block.name == "classified_intent":
            return block.input
    raise SupervisorUnavailable("Model did not return structured intent classification.")
