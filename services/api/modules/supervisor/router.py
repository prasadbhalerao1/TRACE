"""
Supervisor Controller.
Handles Multi-Agent Orchestration Routing.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from packages.db.models import User
from packages.shared_schemas.supervisor import SupervisorRouteRequest, SupervisorRouteResponse
from services.agents.supervisor.graph import get_graph
from services.agents.supervisor.state import SupervisorState
from services.agents.supervisor.tools.classifier_llm import SupervisorUnavailable
from services.api.core.db import get_db
from services.api.core.rbac import get_current_user

router = APIRouter(tags=["Multi-Agent Supervisor"])


@router.post("/supervisor/route", response_model=SupervisorRouteResponse)
async def route_request(
    body: SupervisorRouteRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SupervisorRouteResponse:
    initial_state: SupervisorState = {
        "raw_request": body.raw_request,
        "candidate_id": str(body.candidate_id) if body.candidate_id else None,
        "job_id": str(body.job_id) if body.job_id else None,
        "intent": None,
        "result": None,
        "error": None,
    }
    try:
        result_state = await get_graph().ainvoke(initial_state, config={"configurable": {"db": db}})
    except SupervisorUnavailable as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    return SupervisorRouteResponse(
        intent=result_state.get("intent"),
        result=result_state.get("result"),
        error=result_state.get("error"),
    )
