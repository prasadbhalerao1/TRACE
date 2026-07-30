"""Dispatches the supervisor's `candidate_score` intent to Module 01 (Candidate
Intelligence) — reuses the exact response-shaping function
(`services.api.routers.candidates._to_score_response`) the real `GET /candidates/me/score`
endpoint calls, plus the same `TalentScore` query, rather than re-deriving the shape or
issuing an HTTP call back into this same API process.

The live `AsyncSession` is read from `config["configurable"]["db"]` (LangGraph's
per-invocation `RunnableConfig`), not from `state` — see `graph.py`'s module docstring for
why.
"""

import uuid

from sqlalchemy import select

from packages.db.models import TalentScore
from services.agents.supervisor.state import SupervisorState
from services.api.routers.candidates import _to_score_response


async def run(state: SupervisorState, config: dict) -> dict:
    db = config["configurable"]["db"]
    candidate_id = state.get("candidate_id")
    if not candidate_id:
        return {"error": "candidate_id is required for the candidate_score intent", "result": None}

    result = await db.execute(
        select(TalentScore)
        .where(TalentScore.candidate_id == uuid.UUID(candidate_id))
        .order_by(TalentScore.computed_at.desc())
        .limit(1)
    )
    score = result.scalar_one_or_none()
    if score is None:
        return {
            "result": {
                "module": "candidate_intelligence",
                "candidate_id": candidate_id,
                "talent_score": None,
                "message": "no talent score computed yet for this candidate",
            }
        }
    return {
        "result": {
            "module": "candidate_intelligence",
            "candidate_id": candidate_id,
            "talent_score": _to_score_response(score).model_dump(mode="json"),
        }
    }
