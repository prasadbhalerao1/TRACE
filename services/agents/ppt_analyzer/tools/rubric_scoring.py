"""Problem & Solution Clarity / Innovation & Business Impact / Technical Feasibility
agents — doc 04 §4, all Sonnet, structured rubric scoring at temperature 0 (doc 08 §7).

Real Anthropic calls, same pattern as candidate_intelligence/tools/resume.py: raises
`PitchScoringUnavailable` when `ANTHROPIC_API_KEY` isn't configured or the call fails —
callers (the node functions) catch this and degrade to a `None`-valued RubricScore,
never a fabricated number.
"""

import anthropic

from services.api.core.config import get_settings


class PitchScoringUnavailable(RuntimeError):
    """Raised when a rubric-scoring LLM call can't run (e.g. no API key)."""


def _call(schema: dict, prompt: str, max_tokens: int = 1024) -> dict:
    settings = get_settings()
    if not settings.anthropic_api_key:
        raise PitchScoringUnavailable("ANTHROPIC_API_KEY is not configured — rubric scoring requires it.")

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    try:
        response = client.messages.create(
            model=settings.llm_model_judgment,
            max_tokens=max_tokens,
            temperature=0,
            tools=[schema],
            tool_choice={"type": "tool", "name": schema["name"]},
            messages=[{"role": "user", "content": prompt}],
        )
    except anthropic.APIError as exc:
        raise PitchScoringUnavailable(f"Anthropic API call failed: {exc}") from exc

    for block in response.content:
        if block.type == "tool_use":
            return block.input
    raise PitchScoringUnavailable("Model did not return structured tool output.")


_PROBLEM_SOLUTION_SCHEMA = {
    "name": "problem_solution_clarity",
    "description": "Rubric-score how clearly a pitch deck states the problem and its proposed solution.",
    "input_schema": {
        "type": "object",
        "properties": {
            "score": {"type": "number", "description": "0-100 presentation/clarity quality score"},
            "rationale": {"type": "string"},
            "gaps": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Specific, concrete rubric gaps found (e.g. 'no quantified problem impact stated')",
            },
        },
        "required": ["score", "rationale", "gaps"],
    },
}


def score_problem_solution(slides_text: str) -> dict:
    prompt = (
        "You are scoring a pitch deck against a rubric for PROBLEM UNDERSTANDING and SOLUTION "
        "CLARITY (0-100). Ground your score and gaps only in what's actually written below — do not "
        "speculate about content that isn't there. List concrete gaps (missing quantification, unclear "
        "audience, vague solution mechanics, etc.), not generic advice.\n\n"
        f"Deck content (per slide):\n{slides_text}"
    )
    return _call(_PROBLEM_SOLUTION_SCHEMA, prompt)


_INNOVATION_BUSINESS_SCHEMA = {
    "name": "innovation_business_impact",
    "description": "Rubric-score a pitch deck's innovation and business potential.",
    "input_schema": {
        "type": "object",
        "properties": {
            "innovation_score": {"type": "number", "description": "0-100"},
            "innovation_rationale": {"type": "string"},
            "business_potential_score": {"type": "number", "description": "0-100"},
            "business_potential_rationale": {"type": "string"},
            "gaps": {"type": "array", "items": {"type": "string"}},
        },
        "required": [
            "innovation_score",
            "innovation_rationale",
            "business_potential_score",
            "business_potential_rationale",
            "gaps",
        ],
    },
}


def score_innovation_business(slides_text: str, novelty_context: str | None = None) -> dict:
    context = f"\n\nNovelty signal vs prior submissions: {novelty_context}" if novelty_context else ""
    prompt = (
        "You are scoring a pitch deck against a rubric for INNOVATION (novelty vs existing solutions) "
        "and BUSINESS POTENTIAL (market size, revenue model, go-to-market clarity), each 0-100. Ground "
        "both scores and gaps only in what's actually written below.\n\n"
        f"Deck content (per slide):\n{slides_text}{context}"
    )
    return _call(_INNOVATION_BUSINESS_SCHEMA, prompt)


_TECHNICAL_FEASIBILITY_SCHEMA = {
    "name": "technical_feasibility",
    "description": "Rubric-score a pitch deck's technical depth and feasibility.",
    "input_schema": {
        "type": "object",
        "properties": {
            "score": {"type": "number", "description": "0-100"},
            "rationale": {"type": "string"},
            "gaps": {"type": "array", "items": {"type": "string"}},
        },
        "required": ["score", "rationale", "gaps"],
    },
}


def score_technical_feasibility(slides_text: str, ocr_context: str | None, repo_evidence: str | None) -> dict:
    parts = [f"Deck content (per slide):\n{slides_text}"]
    if ocr_context:
        parts.append(f"Diagram/architecture image understanding:\n{ocr_context}")
    if repo_evidence:
        parts.append(f"Evidence from the team's linked repository:\n{repo_evidence}")
    else:
        parts.append(
            "No linked repository evidence is available — score technical feasibility from the deck's "
            "own claims alone and note in gaps that claims are unverified against real code."
        )
    prompt = (
        "You are scoring a pitch deck against a rubric for TECHNICAL DEPTH and FEASIBILITY (0-100). "
        "Cross-check any technical claims in the deck against the repo evidence if provided — if the "
        "deck claims a technology/architecture that the repo evidence doesn't support, call that out "
        "as a gap rather than trusting the deck's claim at face value.\n\n" + "\n\n".join(parts)
    )
    return _call(_TECHNICAL_FEASIBILITY_SCHEMA, prompt)


_SUMMARY_SCHEMA = {
    "name": "pitch_summary",
    "description": "Write a grounded per-section summary of a pitch deck.",
    "input_schema": {
        "type": "object",
        "properties": {
            "summary": {
                "type": "string",
                "description": "2-3 sentences PER SECTION (problem, solution, market, tech, team if present) — not a slide-by-slide copy",
            },
        },
        "required": ["summary"],
    },
}


def generate_summary(slides_text: str) -> str:
    prompt = (
        "Write a 2-3 sentence summary PER SECTION of this pitch deck (e.g. problem, solution, market, "
        "technology, team) — not a slide-by-slide restatement. Ground it only in what's written; do not "
        "invent details.\n\n"
        f"Deck content (per slide):\n{slides_text}"
    )
    return _call(_SUMMARY_SCHEMA, prompt)["summary"]
