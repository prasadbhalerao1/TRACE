"""Career Roadmaps — FR-4.3. LLM-generated staged roadmap (structured output: stages
-> skills -> estimated timeline), doc 01 §5 routes this to Sonnet ("judgment" tier —
same routing as Talent Scoring's Project Quality/Innovation).

Same convention as `tools/resume.py`'s structured extraction: calls Anthropic for real,
raises a clear `RoadmapGenerationUnavailable` when the API key is missing or the call
fails — never a fabricated roadmap.
"""

import anthropic

from services.api.core.config import get_settings

ROADMAP_SCHEMA = {
    "name": "career_roadmap",
    "description": "A staged learning roadmap to close a candidate's skill gaps for a target role.",
    "input_schema": {
        "type": "object",
        "properties": {
            "stages": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "stage": {"type": "string", "description": "Short stage name, e.g. 'Foundations'"},
                        "skills": {"type": "array", "items": {"type": "string"}},
                        "estimated_weeks": {"type": "number"},
                        "description": {"type": "string"},
                    },
                    "required": ["stage", "skills", "estimated_weeks"],
                },
            }
        },
        "required": ["stages"],
    },
}


class RoadmapGenerationUnavailable(RuntimeError):
    """Raised when the LLM roadmap call can't run (e.g. no API key configured)."""


def generate_roadmap(target_role: str, skill_gaps: list[str], covered_skills: list[str]) -> dict:
    if not skill_gaps:
        return {"stages": []}

    settings = get_settings()
    if not settings.anthropic_api_key:
        raise RoadmapGenerationUnavailable(
            "ANTHROPIC_API_KEY is not configured — career roadmap generation requires it."
        )

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    prompt = (
        f"A candidate is targeting the role '{target_role}'. They already have: "
        f"{', '.join(covered_skills) or 'no verified skills yet'}. "
        f"Their skill gaps, ranked most important/biggest first: {', '.join(skill_gaps)}. "
        "Produce a staged roadmap (2-5 stages, ordered by dependency and priority) to close "
        "these specific gaps. Each stage needs a short name, the subset of gap skills it "
        "covers, and a realistic estimated duration in weeks for someone learning part-time. "
        "Ground every stage only in the listed gap skills — don't invent unrelated skills."
    )
    try:
        response = client.messages.create(
            model=settings.llm_model_judgment,
            max_tokens=1500,
            tools=[ROADMAP_SCHEMA],
            tool_choice={"type": "tool", "name": "career_roadmap"},
            messages=[{"role": "user", "content": prompt}],
        )
    except anthropic.APIError as exc:
        raise RoadmapGenerationUnavailable(f"Anthropic API call failed: {exc}") from exc

    for block in response.content:
        if block.type == "tool_use":
            return block.input
    raise RoadmapGenerationUnavailable("Model did not return structured tool output.")
