"""Aggregation Agent — doc 04 §4, formula in doc 08 §7. Node contract: constraints.md §2.3.

Joins all 5 parallel branches (problem_solution_clarity, innovation_business_impact,
technical_feasibility, similarity_plagiarism, ai_content_heuristic) — LangGraph waits
for all 5 predecessor edges before running this node.
"""

from services.agents.ppt_analyzer.state import PitchAnalysisState
from services.agents.ppt_analyzer.tools.aggregate import compute_overall_pitch_score


async def run(state: PitchAnalysisState) -> dict:
    presentation_quality = state.get("presentation_quality") or {"value": None}
    innovation_business = state.get("innovation_business") or {}
    innovation = innovation_business.get("innovation", {"value": None})
    business_potential = innovation_business.get("business_potential", {"value": None})
    technical_feasibility = state.get("technical_feasibility") or {"value": None}

    scores = {
        "innovation": innovation,
        "technical_feasibility": technical_feasibility,
        "presentation_quality": presentation_quality,
        "business_potential": business_potential,
    }

    overall, renormalized = compute_overall_pitch_score({name: s.get("value") for name, s in scores.items()})

    return {
        "scores": scores,
        "overall_score": overall,
        "renormalized_scores": renormalized,
    }
