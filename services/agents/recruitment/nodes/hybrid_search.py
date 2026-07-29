"""Hybrid Search execution — FR-3.2/3.3, "tool call, no LLM" per the agent registry. Node
contract: constraints.md §2.3.

Applies `search_plan`'s hard filters to the pre-fetched `candidate_pool` (deterministic,
zero-cost step per doc 02 §2), then — only if there's residual `semantic_query` text —
ranks the survivors by embedding similarity via `embeddings.candidate_skill_centroid`, the
same centroid technique Module 01 uses for role matching. Bounds the output to the top ~50
candidates, which is what keeps the downstream Sonnet re-rank cost-bounded (doc 02 §2's
"LLM only on the final shortlist" rule).
"""

from services.agents.recruitment.state import CopilotState
from services.agents.recruitment.tools.embeddings import (
    candidate_skill_centroid,
    cosine_similarity,
    embed_texts,
)

_SHORTLIST_LIMIT = 50


def _matches_hard_filters(candidate: dict, hard_filters: dict) -> bool:
    if "location" in hard_filters:
        if (candidate.get("location") or "").strip().lower() != hard_filters["location"].strip().lower():
            return False
    if "skills" in hard_filters:
        candidate_skill_names = {s["name"].lower() for s in candidate.get("skills", [])}
        if not all(skill.lower() in candidate_skill_names for skill in hard_filters["skills"]):
            return False
    if "min_talent_score" in hard_filters:
        score = candidate.get("overall_talent_score")
        if score is None or score < hard_filters["min_talent_score"]:
            return False
    if "hackathon_experience" in hard_filters and hard_filters["hackathon_experience"]:
        if not candidate.get("hackathon_experience"):
            return False
    return True


async def run(state: CopilotState) -> dict:
    filters = state["structured_filters"]
    hard_filters = filters.get("_hard_filters", {})
    pool = state.get("candidate_pool") or []

    survivors = [c for c in pool if _matches_hard_filters(c, hard_filters)]

    semantic_query = filters.get("semantic_query", "").strip()
    if semantic_query and survivors:
        query_vector = embed_texts([semantic_query])[0]
        scored = []
        for candidate in survivors:
            skill_names = [s["name"] for s in candidate.get("skills", [])]
            centroid = candidate_skill_centroid(skill_names)
            similarity = max(0.0, cosine_similarity(query_vector, centroid)) if centroid else 0.0
            # Carried through to the response as a display "match_percentage" for
            # Copilot results — this is retrieval relevance, not the formal per-job
            # doc-08 4-term MatchScore (Copilot search isn't necessarily job-scoped).
            candidate = {**candidate, "_retrieval_score": round(100.0 * similarity, 1)}
            scored.append((similarity, candidate))
        scored.sort(key=lambda pair: pair[0], reverse=True)
        shortlist = [c for _, c in scored[:_SHORTLIST_LIMIT]]
    else:
        # No residual semantic intent — structured filters already did all the work;
        # break ties by Talent Score so the shortlist still has a sensible order going
        # into re-ranking.
        survivors.sort(key=lambda c: c.get("overall_talent_score") or 0.0, reverse=True)
        shortlist = survivors[:_SHORTLIST_LIMIT]

    return {"shortlist": shortlist}
