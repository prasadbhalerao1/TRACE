"""PPT Analyzer router — doc 04 §6 endpoints, module 04's own FastAPI router
registered alongside candidates.py/users.py (services/api/main.py).

Upload is candidate/team-only (doc/SRS/04 §2 actor table); status/report/plagiarism
reads are open to any authenticated role — the SRS is explicit this module is "fully
self-contained... can be invoked standalone by recruiters, judges, or investors", so
report viewing isn't gated to the uploader only, unlike Module 01's `/candidates/me/*`.
"""

import uuid

import cloudinary.exceptions
from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from packages.db.models import AgentRun, File, PlagiarismMatch, Presentation, PresentationScore, Slide, User
from packages.shared_schemas.presentations import (
    AIContentSignal,
    PlagiarismMatchOut,
    PresentationReportResponse,
    PresentationStatusResponse,
    PresentationUploadResponse,
    RubricScore,
    SlideOut,
)
from services.agents.ppt_analyzer.graph import get_graph
from services.agents.ppt_analyzer.state import PitchAnalysisState
from services.agents.ppt_analyzer.tools.extraction import UnsupportedDeckFormat, detect_format
from services.api.core.config import get_settings
from services.api.core.db import get_db
from services.api.core.rbac import get_current_user, require_role
from services.api.core.storage import StorageUnavailable, upload_file
from services.api.core.tracing import record_agent_trace

router = APIRouter(prefix="/presentations", tags=["presentations"])


async def _get_presentation_or_404(db: AsyncSession, presentation_id: uuid.UUID) -> Presentation:
    result = await db.execute(select(Presentation).where(Presentation.id == presentation_id))
    presentation = result.scalar_one_or_none()
    if presentation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="presentation_not_found")
    return presentation


def _log_agent_run(
    db: AsyncSession, agent_name: str, presentation_id: uuid.UUID, input_ref: dict, output: dict, model_used: str | None
) -> None:
    # Langfuse trace id (Platform Hardening track, 2026-07-30) — record_agent_trace() is
    # a clean no-op returning None while LANGFUSE_* keys are unconfigured, see
    # services/api/core/tracing.py.
    trace_id = record_agent_trace(agent_name, input_ref, output, model_used)
    db.add(
        AgentRun(
            agent_name=agent_name,
            subject_type="presentation",
            subject_id=presentation_id,
            input_ref=input_ref,
            output=output,
            model_used=model_used,
            langfuse_trace_id=trace_id,
        )
    )


@router.post("/upload", response_model=PresentationUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_presentation(
    file: UploadFile,
    linked_repo: str | None = Form(default=None),
    user: User = Depends(require_role("candidate")),
    db: AsyncSession = Depends(get_db),
) -> PresentationUploadResponse:
    settings = get_settings()

    try:
        detect_format(file.filename, file.content_type)
    except UnsupportedDeckFormat as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    file_bytes = await file.read()
    max_bytes = settings.presentation_max_file_size_mb * 1024 * 1024
    if len(file_bytes) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"file_too_large: max {settings.presentation_max_file_size_mb}MB",
        )

    presentation = Presentation(owner_user_id=user.id, linked_repo=linked_repo, status="processing")
    db.add(presentation)
    await db.commit()
    await db.refresh(presentation)

    # Best-effort persistence of the original file to Cloudinary — a REAL integration
    # call (never a fabricated URL), but its failure (e.g. CLOUDINARY_URL not configured
    # yet, per .agents/decisions.md) doesn't block the extraction/scoring pipeline below,
    # since that pipeline only needs the bytes already held in memory, not a stored copy.
    status_detail: str | None = None
    try:
        public_url, storage_key = upload_file(
            file_bytes, public_id=f"presentations/{presentation.id}", resource_type="raw"
        )
        db.add(
            File(
                owner_user_id=user.id,
                storage_key=storage_key,
                public_url=public_url,
                file_type="ppt",
            )
        )
        await db.flush()
    except StorageUnavailable as exc:
        status_detail = f"file_storage_unavailable: {exc}"
    except cloudinary.exceptions.Error as exc:
        # CLOUDINARY_URL can be a syntactically-valid placeholder (see .env.example)
        # that passes the config-presence check in storage.py but still fails at the
        # real API call — treat that the same as "not configured" rather than a 500,
        # since it's the exact "keys not filled in yet" state documented in DEV_SERVERS.md.
        status_detail = f"file_storage_unavailable: {exc}"

    initial_state: PitchAnalysisState = {
        "presentation_id": str(presentation.id),
        "file_bytes": file_bytes,
        "file_name": file.filename,
        "file_content_type": file.content_type,
        "linked_repo": linked_repo,
        "normalized_pptx_bytes": None,
        "normalization_error": None,
        "slides": [],
        "slide_images": {},
        "extraction_error": None,
        "slide_ocr_notes": [],
        "slide_embeddings": None,
        "plagiarism_matches": [],
        "presentation_quality": None,
        "innovation_business": None,
        "technical_feasibility": None,
        "ai_content_signal": None,
        "scores": {},
        "overall_score": None,
        "renormalized_scores": [],
        "summary": None,
        "suggestions": [],
    }

    result_state = await get_graph().ainvoke(initial_state)

    for slide in result_state.get("slides", []):
        ocr_note = next(
            (n for n in result_state.get("slide_ocr_notes", []) if n["index"] == slide["index"]), None
        )
        db.add(
            Slide(
                presentation_id=presentation.id,
                slide_index=slide["index"],
                title=slide.get("title"),
                body=slide.get("body"),
                notes=slide.get("notes"),
                has_image=slide.get("has_image", False),
                ocr_text=(ocr_note or {}).get("ocr_text") or (ocr_note or {}).get("diagram_summary"),
            )
        )

    scores = result_state.get("scores", {})
    presentation_quality = scores.get("presentation_quality", {})
    innovation = scores.get("innovation", {})
    business_potential = scores.get("business_potential", {})
    technical_feasibility = scores.get("technical_feasibility", {})
    ai_content_signal = result_state.get("ai_content_signal") or {}

    settings = get_settings()
    db.add(
        PresentationScore(
            presentation_id=presentation.id,
            innovation_score=innovation.get("value"),
            technical_feasibility_score=technical_feasibility.get("value"),
            presentation_quality_score=presentation_quality.get("value"),
            business_potential_score=business_potential.get("value"),
            overall_pitch_score=result_state.get("overall_score"),
            renormalized_scores=result_state.get("renormalized_scores", []),
            summary=result_state.get("summary"),
            suggestions=result_state.get("suggestions", []),
            ai_content_signal=ai_content_signal,
        )
    )

    for match in result_state.get("plagiarism_matches", []):
        matched_id = match.get("matched_presentation_id")
        if not matched_id:
            continue
        try:
            matched_uuid = uuid.UUID(str(matched_id))
        except ValueError:
            continue
        db.add(
            PlagiarismMatch(
                presentation_id=presentation.id,
                matched_presentation_id=matched_uuid,
                slide_index=match["slide_index"],
                similarity=match["similarity"],
            )
        )

    # Explainability trail — every AI score/verdict logs to agent_runs (constraints.md §4).
    _log_agent_run(
        db, "ppt_problem_solution_clarity_agent", presentation.id,
        {"slide_count": len(result_state.get("slides", []))}, presentation_quality, settings.llm_model_judgment,
    )
    _log_agent_run(
        db, "ppt_innovation_business_impact_agent", presentation.id,
        {"slide_count": len(result_state.get("slides", []))},
        {"innovation": innovation, "business_potential": business_potential},
        settings.llm_model_judgment,
    )
    _log_agent_run(
        db, "ppt_technical_feasibility_agent", presentation.id,
        {"linked_repo": linked_repo}, technical_feasibility, settings.llm_model_judgment,
    )
    _log_agent_run(
        db, "ppt_ai_content_heuristic_agent", presentation.id,
        {"slide_count": len(result_state.get("slides", []))}, ai_content_signal, None,
    )
    _log_agent_run(
        db, "ppt_aggregation_agent", presentation.id,
        scores, {"overall_score": result_state.get("overall_score"), "renormalized": result_state.get("renormalized_scores", [])}, None,
    )

    extraction_error = result_state.get("extraction_error")
    if extraction_error and not result_state.get("slides"):
        presentation.status = "failed"
        presentation.status_detail = extraction_error
    else:
        presentation.status = "done"
        presentation.status_detail = status_detail or extraction_error

    await db.commit()

    return PresentationUploadResponse(presentation_id=presentation.id, status=presentation.status)


@router.get("/{presentation_id}/status", response_model=PresentationStatusResponse)
async def get_status(
    presentation_id: uuid.UUID,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PresentationStatusResponse:
    presentation = await _get_presentation_or_404(db, presentation_id)
    return PresentationStatusResponse(presentation_id=presentation.id, status=presentation.status)


@router.get("/{presentation_id}/report", response_model=PresentationReportResponse)
async def get_report(
    presentation_id: uuid.UUID,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PresentationReportResponse:
    presentation = await _get_presentation_or_404(db, presentation_id)

    slides_result = await db.execute(
        select(Slide).where(Slide.presentation_id == presentation_id).order_by(Slide.slide_index)
    )
    slides = [SlideOut.model_validate(s) for s in slides_result.scalars().all()]

    score_result = await db.execute(
        select(PresentationScore)
        .where(PresentationScore.presentation_id == presentation_id)
        .order_by(PresentationScore.computed_at.desc())
        .limit(1)
    )
    score = score_result.scalar_one_or_none()

    matches_result = await db.execute(
        select(PlagiarismMatch).where(PlagiarismMatch.presentation_id == presentation_id)
    )
    matches = [PlagiarismMatchOut.model_validate(m) for m in matches_result.scalars().all()]

    if score is None:
        return PresentationReportResponse(
            presentation_id=presentation.id,
            status=presentation.status,
            linked_repo=presentation.linked_repo,
            slides=slides,
            scores={},
            overall_pitch_score=None,
            renormalized_scores=[],
            summary=None,
            suggestions=[],
            ai_content_signal=None,
            plagiarism_matches=matches,
            computed_at=None,
        )

    scores = {
        "innovation": RubricScore(value=score.innovation_score),
        "technical_feasibility": RubricScore(value=score.technical_feasibility_score),
        "presentation_quality": RubricScore(value=score.presentation_quality_score),
        "business_potential": RubricScore(value=score.business_potential_score),
    }
    ai_signal = AIContentSignal(**score.ai_content_signal) if score.ai_content_signal else None

    return PresentationReportResponse(
        presentation_id=presentation.id,
        status=presentation.status,
        linked_repo=presentation.linked_repo,
        slides=slides,
        scores=scores,
        overall_pitch_score=score.overall_pitch_score,
        renormalized_scores=score.renormalized_scores or [],
        summary=score.summary,
        suggestions=score.suggestions or [],
        ai_content_signal=ai_signal,
        plagiarism_matches=matches,
        computed_at=score.computed_at,
    )


@router.get("/{presentation_id}/plagiarism-matches", response_model=list[PlagiarismMatchOut])
async def get_plagiarism_matches(
    presentation_id: uuid.UUID,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[PlagiarismMatchOut]:
    await _get_presentation_or_404(db, presentation_id)
    result = await db.execute(select(PlagiarismMatch).where(PlagiarismMatch.presentation_id == presentation_id))
    return [PlagiarismMatchOut.model_validate(m) for m in result.scalars().all()]
