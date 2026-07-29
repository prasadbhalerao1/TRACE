"""Innovation & Business Impact Agent — doc 04 §4 (FR-4). Node contract: constraints.md §2.3.

Produces both the Innovation and Business Potential components of the Overall Pitch
Score in one call (doc 04 §3's agent registry: "rubric + Qdrant novelty check").
"""

from services.agents.ppt_analyzer.state import PitchAnalysisState
from services.agents.ppt_analyzer.tools.rubric_scoring import (
    PitchScoringUnavailable,
    score_innovation_business,
)
from services.agents.ppt_analyzer.tools.text import slides_text


def _novelty_context(plagiarism_matches: list[dict]) -> str | None:
    if not plagiarism_matches:
        return None
    return f"{len(plagiarism_matches)} slide(s) matched prior submissions above the similarity threshold."


async def run(state: PitchAnalysisState) -> dict:
    slides = state.get("slides") or []
    if not slides:
        return {
            "innovation_business": {
                "innovation": {"value": None, "rationale": "No slide text extracted.", "gaps": []},
                "business_potential": {"value": None, "rationale": "No slide text extracted.", "gaps": []},
            }
        }

    try:
        # Note: plagiarism_matches is written by a sibling parallel branch off
        # slide_embedding, not a predecessor of this node — it may not have landed in
        # this superstep yet. Only used as optional soft context when already present.
        novelty_context = _novelty_context(state.get("plagiarism_matches") or [])
        result = score_innovation_business(slides_text(slides), novelty_context)
        gaps = result.get("gaps", [])
        return {
            "innovation_business": {
                "innovation": {
                    "value": float(result["innovation_score"]),
                    "rationale": result.get("innovation_rationale"),
                    "gaps": gaps,
                },
                "business_potential": {
                    "value": float(result["business_potential_score"]),
                    "rationale": result.get("business_potential_rationale"),
                    "gaps": gaps,
                },
            }
        }
    except PitchScoringUnavailable as exc:
        unavailable = {"value": None, "rationale": f"unavailable: {exc}", "gaps": []}
        return {"innovation_business": {"innovation": unavailable, "business_potential": dict(unavailable)}}
