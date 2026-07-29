"""Project Relevance Agent — FR-2.3, "rules + embedding" per the agent registry. Node
contract: constraints.md §2.3. Queries `candidate_project_embeddings` (reused from Module
01) filtered per-candidate against the job vector."""

from services.agents.recruitment.state import MatchingState
from services.agents.recruitment.tools.embeddings import candidate_project_relevance, get_qdrant_client


async def run(state: MatchingState) -> dict:
    client = get_qdrant_client()
    job_vector = state["job_embedding"]

    scores: dict[str, float | None] = {}
    for candidate in state.get("candidate_pool") or []:
        cid = candidate["candidate_id"]
        scores[cid] = candidate_project_relevance(client, cid, job_vector)

    return {"project_relevance_scores": scores}
