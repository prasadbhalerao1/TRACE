"""The three LLM-backed steps of the Recruiter Copilot (FR-3): Query Understanding,
Re-ranking, and Explanation. Same anthropic tool-use pattern as
`candidate_intelligence/tools/fact_check.py` — a tool-use schema, `tool_choice` forced to
that one tool, `RecruitmentUnavailable` raised (never a silent fallback) when the API key
is missing or the call fails.

Per doc/multi-agent-architecture/02 §4 and the `langgraph-agents` skill's explicit
warning: the Query Understanding Agent must "reject and re-prompt on schema-validation
failure, never silently accept a malformed filter" — implemented here as a single
corrective retry (not an unbounded loop) before raising, since Anthropic's forced
tool-use already makes most schema failures rare.
"""

import json

import anthropic

from services.api.core.config import get_settings
from services.agents.recruitment.tools.embeddings import RecruitmentUnavailable

_QUERY_UNDERSTANDING_SCHEMA = {
    "name": "structured_search_filters",
    "description": (
        "Convert a recruiter's natural-language candidate search into structured search "
        "filters. Only extract what the recruiter actually stated or clearly implied — "
        "never invent a filter value that wasn't in the query."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "location": {
                "type": ["string", "null"],
                "description": "A city/region mentioned, or null if none was mentioned.",
            },
            "skills": {
                "type": "array",
                "items": {"type": "string"},
                "description": (
                    "Technical skills, languages, or frameworks the recruiter wants "
                    "(e.g. ['react', 'genai']). Empty array if none mentioned."
                ),
            },
            "min_talent_score": {
                "type": ["number", "null"],
                "description": (
                    "A minimum overall Talent Score (0-100) ONLY if the recruiter explicitly "
                    "asked for a quality/skill bar (e.g. 'top', 'highly rated', 'best'). Use a "
                    "conservative 70 for vague terms like 'top' or 'best', null otherwise — "
                    "never invent a specific number the recruiter didn't imply."
                ),
            },
            "hackathon_experience": {
                "type": ["boolean", "null"],
                "description": "true if the recruiter specifically wants hackathon participants, else null.",
            },
            "remote_ok": {
                "type": ["boolean", "null"],
                "description": "true/false only if remote work was explicitly discussed, else null.",
            },
            "semantic_query": {
                "type": "string",
                "description": (
                    "The residual free-text intent that isn't captured by the structured fields "
                    "above (e.g. 'active LangChain contributor', 'built a fintech project') — "
                    "used for the vector-similarity search step. Empty string if the query is "
                    "fully captured by the structured fields."
                ),
            },
        },
        "required": ["skills", "semantic_query"],
    },
}

_RERANK_SCHEMA = {
    "name": "reranked_candidates",
    "description": "Re-order a shortlist of candidates by genuine fit to the recruiter's query.",
    "input_schema": {
        "type": "object",
        "properties": {
            "ordered_candidate_ids": {
                "type": "array",
                "items": {"type": "string"},
                "description": "candidate_id values from the input list, best-fit first, no additions or omissions.",
            }
        },
        "required": ["ordered_candidate_ids"],
    },
}

_EXPLANATION_SCHEMA = {
    "name": "match_explanations",
    "description": "One grounded, evidence-citing sentence per candidate explaining why they matched.",
    "input_schema": {
        "type": "object",
        "properties": {
            "explanations": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "candidate_id": {"type": "string"},
                        "explanation": {
                            "type": "string",
                            "description": (
                                "One sentence, must cite specific fields from the evidence given "
                                "(repo names, stars, hackathon wins, talent score, skills) — never "
                                "invent an achievement not present in the evidence."
                            ),
                        },
                    },
                    "required": ["candidate_id", "explanation"],
                },
            }
        },
        "required": ["explanations"],
    },
}


def _client(settings) -> anthropic.Anthropic:
    if not settings.anthropic_api_key:
        raise RecruitmentUnavailable(
            "ANTHROPIC_API_KEY is not configured — the Recruiter Copilot requires it."
        )
    return anthropic.Anthropic(api_key=settings.anthropic_api_key)


def _extract_tool_input(response, tool_name: str) -> dict:
    for block in response.content:
        if block.type == "tool_use" and block.name == tool_name:
            return block.input
    raise RecruitmentUnavailable(f"Model did not return structured '{tool_name}' output.")


def understand_query(raw_query: str, prior_filters: dict | None) -> dict:
    """Parses a recruiter's NL query into structured filters. `prior_filters` (from the
    same conversation's previous turn, if any) is given as context so a follow-up like
    "now only show ones open to remote" is understood as a refinement, not a fresh query
    that drops the earlier location/skills filters."""
    settings = get_settings()
    client = _client(settings)

    context = (
        f"\n\nThe recruiter's PREVIOUS filters in this conversation were: "
        f"{json.dumps(prior_filters)}. If this new message is a refinement/follow-up "
        f"(e.g. 'now only show remote ones', 'add Python too'), merge sensibly with the "
        f"previous filters rather than discarding them. If it reads like a brand-new, "
        f"unrelated search, start fresh instead."
        if prior_filters
        else ""
    )
    prompt = (
        "You are the Query Understanding Agent for a recruiter search tool. Convert the "
        "recruiter's natural-language message below into structured search filters, "
        "extracting ONLY what was actually stated or clearly implied. Do not invent "
        "filter values, do not assume a location or skill wasn't mentioned just because "
        "it's common, and do not fabricate a minimum talent score unless the recruiter "
        "asked for quality/seniority in some form.\n\n"
        f'RECRUITER MESSAGE: "{raw_query}"'
        f"{context}"
    )

    def _call(user_prompt: str):
        return client.messages.create(
            model=settings.llm_model_fast,
            max_tokens=1024,
            tools=[_QUERY_UNDERSTANDING_SCHEMA],
            tool_choice={"type": "tool", "name": "structured_search_filters"},
            messages=[{"role": "user", "content": user_prompt}],
        )

    try:
        response = _call(prompt)
        return _extract_tool_input(response, "structured_search_filters")
    except RecruitmentUnavailable:
        # Single corrective retry — the `langgraph-agents` skill's explicit instruction
        # to "reject and re-prompt on schema-validation failure, never silently accept a
        # malformed filter" rather than an unbounded loop.
        try:
            response = _call(
                prompt + "\n\nYour previous response did not match the required schema. "
                "Respond again using the structured_search_filters tool exactly as specified."
            )
            return _extract_tool_input(response, "structured_search_filters")
        except anthropic.APIError as exc:
            raise RecruitmentUnavailable(f"Anthropic API call failed: {exc}") from exc
    except anthropic.APIError as exc:
        raise RecruitmentUnavailable(f"Anthropic API call failed: {exc}") from exc


def rerank_candidates(raw_query: str, candidates: list[dict]) -> list[str]:
    """`candidates` is the cheap-retrieval shortlist (already bounded to ~20-50 by the
    caller — this function does not itself limit the input, cost-bounding is the
    caller's responsibility per doc 02 §2's "LLM only on the final shortlist" rule).
    Returns `candidate_id`s in best-fit-first order."""
    settings = get_settings()
    client = _client(settings)
    prompt = (
        "You are the Re-ranking Agent for a recruiter search tool. The recruiter searched "
        f'for: "{raw_query}"\n\n'
        "Below is a shortlist of candidates that already passed a cheap filter+embedding "
        "retrieval step. Re-order them by genuine fit to the recruiter's actual intent — "
        "weigh concrete, verifiable evidence (real repos, real hackathon results, verified "
        "certs, Talent Score) over superficial keyword overlap. Do not add or remove any "
        "candidate_id, only reorder.\n\n"
        f"CANDIDATES (JSON):\n{json.dumps(candidates, default=str)}"
    )
    try:
        response = client.messages.create(
            model=settings.llm_model_judgment,
            max_tokens=1024,
            tools=[_RERANK_SCHEMA],
            tool_choice={"type": "tool", "name": "reranked_candidates"},
            messages=[{"role": "user", "content": prompt}],
        )
    except anthropic.APIError as exc:
        raise RecruitmentUnavailable(f"Anthropic API call failed: {exc}") from exc
    result = _extract_tool_input(response, "reranked_candidates")
    return result.get("ordered_candidate_ids", [])


def explain_matches(raw_query: str, candidates: list[dict]) -> dict[str, str]:
    """One grounded sentence per candidate. `candidates` must already include whatever
    concrete evidence fields (repo names, stars, hackathon wins, talent score) the
    explanation is allowed to cite — the prompt explicitly forbids inventing anything not
    present in that evidence, mirroring Module 01's fact-check guardrail language."""
    settings = get_settings()
    client = _client(settings)
    prompt = (
        "You are the Explanation Agent for a recruiter search tool. The recruiter searched "
        f'for: "{raw_query}"\n\n'
        "For each candidate below, write exactly one short sentence explaining why they "
        "matched, grounded ONLY in the evidence fields given (repo names, stars, commit "
        "activity, hackathon results, verified certificates, Talent Score, skills). Never "
        "invent an achievement, statistic, or skill that isn't present in the evidence — "
        "if the evidence is thin, say something honest and brief rather than fabricating "
        "detail.\n\n"
        f"CANDIDATES WITH EVIDENCE (JSON):\n{json.dumps(candidates, default=str)}"
    )
    try:
        response = client.messages.create(
            model=settings.llm_model_fast,
            max_tokens=1536,
            tools=[_EXPLANATION_SCHEMA],
            tool_choice={"type": "tool", "name": "match_explanations"},
            messages=[{"role": "user", "content": prompt}],
        )
    except anthropic.APIError as exc:
        raise RecruitmentUnavailable(f"Anthropic API call failed: {exc}") from exc
    result = _extract_tool_input(response, "match_explanations")
    return {item["candidate_id"]: item["explanation"] for item in result.get("explanations", [])}
