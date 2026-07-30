"""Problem & Solution Clarity / Innovation & Business Impact / Technical Feasibility
agents — doc 04 §4, all Sonnet, structured rubric scoring at temperature 0 (doc 08 §7).

Real Anthropic calls, same pattern as candidate_intelligence/tools/resume.py: raises
`PitchScoringUnavailable` when `ANTHROPIC_API_KEY` isn't configured or the call fails —
callers (the node functions) catch this and degrade to a `None`-valued RubricScore,
never a fabricated number.
"""

from services.api.core.llm import LLMUnavailable, generate_structured

# Raised when a rubric-scoring LLM call can't run (e.g. no/misconfigured provider key).
PitchScoringUnavailable = LLMUnavailable


def _call(schema_name: str, schema_description: str, parameters: dict, prompt: str, max_tokens: int = 1024) -> dict:
    return generate_structured(
        schema_name=schema_name,
        schema_description=schema_description,
        parameters=parameters,
        prompt=prompt,
        max_tokens=max_tokens,
        temperature=0,
        agent_name=f"ppt_analyzer.rubric.{schema_name}",
    )


_PROBLEM_SOLUTION_PARAMETERS = {
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
}


def score_problem_solution(slides_text: str) -> dict:
    prompt = (
        "You are scoring a pitch deck against a rubric for PROBLEM UNDERSTANDING and SOLUTION "
        "CLARITY (0-100). Ground your score and gaps only in what's actually written below — do not "
        "speculate about content that isn't there. List concrete gaps (missing quantification, unclear "
        "audience, vague solution mechanics, etc.), not generic advice.\n\n"
        f"Deck content (per slide):\n{slides_text}"
    )
    return _call(
        "problem_solution_clarity",
        "Rubric-score how clearly a pitch deck states the problem and its proposed solution.",
        _PROBLEM_SOLUTION_PARAMETERS,
        prompt,
    )


_INNOVATION_BUSINESS_PARAMETERS = {
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
}


def score_innovation_business(slides_text: str, novelty_context: str | None = None) -> dict:
    context = f"\n\nNovelty signal vs prior submissions: {novelty_context}" if novelty_context else ""
    prompt = (
        "You are scoring a pitch deck against a rubric for INNOVATION (novelty vs existing solutions) "
        "and BUSINESS POTENTIAL (market size, revenue model, go-to-market clarity), each 0-100. Ground "
        "both scores and gaps only in what's actually written below.\n\n"
        f"Deck content (per slide):\n{slides_text}{context}"
    )
    return _call(
        "innovation_business_impact",
        "Rubric-score a pitch deck's innovation and business potential.",
        _INNOVATION_BUSINESS_PARAMETERS,
        prompt,
    )


_TECHNICAL_FEASIBILITY_PARAMETERS = {
    "type": "object",
    "properties": {
        "score": {"type": "number", "description": "0-100"},
        "rationale": {"type": "string"},
        "gaps": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["score", "rationale", "gaps"],
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
    return _call(
        "technical_feasibility",
        "Rubric-score a pitch deck's technical depth and feasibility.",
        _TECHNICAL_FEASIBILITY_PARAMETERS,
        prompt,
    )


_SUMMARY_PARAMETERS = {
    "type": "object",
    "properties": {
        "summary": {
            "type": "string",
            "description": "2-3 sentences PER SECTION (problem, solution, market, tech, team if present) — not a slide-by-slide copy",
        },
    },
    "required": ["summary"],
}


def generate_summary(slides_text: str) -> str:
    prompt = (
        "Write a 2-3 sentence summary PER SECTION of this pitch deck (e.g. problem, solution, market, "
        "technology, team) — not a slide-by-slide restatement. Ground it only in what's written; do not "
        "invent details.\n\n"
        f"Deck content (per slide):\n{slides_text}"
    )
    return _call(
        "pitch_summary",
        "Write a grounded per-section summary of a pitch deck.",
        _SUMMARY_PARAMETERS,
        prompt,
    )["summary"]
