"""Score Aggregation Agent — FR-2.1, "rules only" per the agent registry. Node contract:
constraints.md §2.3. Joins `core_match_scores` (from `match_candidates`) with
`project_relevance_scores` (from `project_relevance`) into the final 4-term breakdown
doc 08 §2 calls for — always shown to recruiters as a breakdown, never a bare percentage.

`explanation` here is a deterministic, rules-based one-liner (which required skills
matched, whether project relevance/hackathon evidence contributed) — NOT an LLM call,
consistent with this node being rules-only in the registry. The Copilot's separate
`explanation` node (Haiku, grounded, per-query) is what produces natural-language
rationale for search results; this one is the persisted, always-available fallback
`match_scores.explanation` column."""

from services.agents.recruitment.state import MatchingState
from services.agents.recruitment.tools.matching import aggregate_match_score


def _build_explanation(candidate: dict, core: dict, project_relevance: float | None, required_skills: list[str]) -> str:
    candidate_skill_names = {s["name"].lower() for s in candidate.get("skills", [])}
    matched = [s for s in required_skills if s.lower() in candidate_skill_names]
    parts = []
    if matched:
        parts.append(f"matches {len(matched)}/{len(required_skills)} required skills ({', '.join(matched)})")
    if project_relevance is not None:
        parts.append(f"project relevance {project_relevance:.0f}/100")
    if candidate.get("overall_talent_score") is not None:
        parts.append(f"Talent Score {candidate['overall_talent_score']:.0f}")
    if candidate.get("hackathon_experience"):
        parts.append("hackathon experience")
    return "; ".join(parts) if parts else "Limited overlapping evidence with this job's requirements."


async def run(state: MatchingState) -> dict:
    core_scores = state.get("core_match_scores") or {}
    project_scores = state.get("project_relevance_scores") or {}
    required_skills = state.get("job_required_skills") or []
    pool_by_id = {c["candidate_id"]: c for c in state.get("candidate_pool") or []}

    results = []
    for candidate_id, core in core_scores.items():
        project_relevance = project_scores.get(candidate_id)
        match_percentage = aggregate_match_score(
            core["skill_similarity"],
            core["semantic_similarity"],
            core["experience_match"],
            core["talent_score_alignment"],
        )
        candidate = pool_by_id.get(candidate_id, {})
        results.append(
            {
                "candidate_id": candidate_id,
                "match_percentage": match_percentage,
                "skill_similarity": core["skill_similarity"],
                "semantic_similarity": core["semantic_similarity"],
                "experience_match": core["experience_match"],
                "talent_score_alignment": core["talent_score_alignment"],
                "project_relevance": project_relevance,
                "explanation": _build_explanation(candidate, core, project_relevance, required_skills),
            }
        )

    results.sort(key=lambda r: r["match_percentage"], reverse=True)
    return {"match_results": results}
