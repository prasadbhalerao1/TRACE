"""Module 02 — AI Recruitment Platform (doc/SRS/02, doc/multi-agent-architecture/02).

No route prefix — mirrors the flat endpoint list in doc 02 §6/§8 (jobs, applications,
copilot, analytics don't share one prefix), plus one candidate-facing route
(`/candidates/me/applications`) that lives here rather than in `candidates.py` since it's
Module 02 data (`applications`), not Module 01 data.
"""

import uuid
from collections import defaultdict
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from packages.db.models import (
    AgentRun,
    Application,
    Badge,
    CandidateProfile,
    CopilotConversation,
    GithubSnapshot,
    Job,
    LocationAlias,
    MatchScore,
    SkillTaxonomyEntry,
    TalentScore,
    User,
)
from packages.shared_schemas.recruitment import (
    APPLICATION_STAGES,
    ApplicationResponse,
    ApplicationStageUpdateRequest,
    ApplicationWithCandidateResponse,
    ApplicationWithJobResponse,
    CopilotQueryRequest,
    CopilotQueryResponse,
    CopilotResult,
    FunnelStage,
    HiringFunnelResponse,
    JobCreateRequest,
    JobResponse,
    MatchScoreWithCandidateResponse,
    SourceBreakdownResponse,
    TimeToHireResponse,
)
from services.agents.recruitment.copilot_graph import get_copilot_graph
from services.agents.recruitment.matching_graph import get_matching_graph
from services.agents.recruitment.state import CopilotState, MatchingState
from services.agents.recruitment.tools.embeddings import RecruitmentUnavailable
from services.api.core.config import get_settings
from services.api.core.db import get_db
from services.api.core.rbac import require_role
from services.api.core.tracing import record_agent_trace

router = APIRouter(tags=["recruitment"])


def _estimate_experience_years(experience: list[dict] | None) -> float:
    """Same summation Module 01's `profile_merge._resume_years_experience` uses."""
    return sum(e.get("years") or 0 for e in (experience or []))


async def _build_candidate_pool(db: AsyncSession) -> list[dict]:
    """Fetches every candidate profile plus the corroborating context (latest Talent
    Score, verified-skill set from Badges, GitHub repo summaries) needed by both the
    Copilot and the batch matcher. Nodes never touch the DB — this is the one place that
    builds the plain-dict pool they both consume, matching candidate_intelligence's
    "API route fetches DB data, nodes stay pure" convention.

    Fetches the whole candidate pool in one shot rather than issuing separate scoped
    Postgres queries per filter — a reasonable simplification at the pool sizes this
    system runs at; see `nodes/search_plan.py`'s docstring for the same note.
    """
    scores_result = await db.execute(
        select(TalentScore).order_by(TalentScore.candidate_id, TalentScore.computed_at.desc())
    )
    latest_score_by_candidate: dict[uuid.UUID, float | None] = {}
    for s in scores_result.scalars().all():
        if s.candidate_id not in latest_score_by_candidate:
            latest_score_by_candidate[s.candidate_id] = s.overall

    badges_result = await db.execute(select(Badge))
    verified_skills_by_candidate: dict[uuid.UUID, set[str]] = defaultdict(set)
    for b in badges_result.scalars().all():
        verified_skills_by_candidate[b.candidate_id].add(b.skill_name.lower())

    snapshots_result = await db.execute(select(GithubSnapshot))
    snapshots_by_candidate: dict[uuid.UUID, list[GithubSnapshot]] = defaultdict(list)
    for gs in snapshots_result.scalars().all():
        snapshots_by_candidate[gs.candidate_id].append(gs)

    profiles_result = await db.execute(select(CandidateProfile))
    pool: list[dict] = []
    for p in profiles_result.scalars().all():
        verified = verified_skills_by_candidate.get(p.id, set())
        skills = [
            {"name": s["name"], "verified": s["name"].strip().lower() in verified}
            for s in (p.skills or [])
            if s.get("name")
        ]
        snaps = sorted(snapshots_by_candidate.get(p.id, []), key=lambda s: s.stars or 0, reverse=True)
        repo_summaries = [
            f"{s.repo_full_name}: {s.stars or 0} stars, {s.commit_count or 0} commits" for s in snaps[:5]
        ]
        pool.append(
            {
                "candidate_id": str(p.id),
                "skills": skills,
                "location": p.location,
                "experience_years": _estimate_experience_years(p.experience),
                "overall_talent_score": latest_score_by_candidate.get(p.id),
                "github_username": p.github_username,
                "headline": p.headline,
                # Module 05 (Hackathon Pipeline) isn't built yet — no source of truth for
                # this exists in the DB, so it's always False rather than fabricated.
                "hackathon_experience": False,
                "repo_summaries": repo_summaries,
            }
        )
    return pool


async def _job_owned_by(db: AsyncSession, job_id: uuid.UUID, user: User) -> Job:
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="job_not_found")
    # Org-scoped when the recruiter belongs to one, otherwise scoped to their own postings
    # — no test data exercises multi-recruiter-per-org sharing yet, but this is the
    # least-surprising default given `users.organization_id` already exists.
    if user.organization_id and job.organization_id == user.organization_id:
        return job
    if job.posted_by_user_id == user.id:
        return job
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="not_your_job_posting")


async def _run_matching_and_persist(db: AsyncSession, job: Job) -> list[MatchScore]:
    candidate_pool = await _build_candidate_pool(db)
    initial_state: MatchingState = {
        "job_id": str(job.id),
        "job_description": job.description,
        "job_required_skills": job.required_skills or [],
        "job_min_experience_years": job.min_experience_years,
        "job_location": job.location,
        "job_is_remote": job.is_remote,
        "candidate_pool": candidate_pool,
        "job_embedding": None,
        "core_match_scores": {},
        "project_relevance_scores": {},
        "match_results": [],
    }
    result_state = await get_matching_graph().ainvoke(initial_state)

    settings = get_settings()
    rows: list[MatchScore] = []
    for r in result_state["match_results"]:
        existing = await db.execute(
            select(MatchScore).where(
                MatchScore.job_id == job.id, MatchScore.candidate_id == uuid.UUID(r["candidate_id"])
            )
        )
        row = existing.scalar_one_or_none()
        if row is None:
            row = MatchScore(job_id=job.id, candidate_id=uuid.UUID(r["candidate_id"]))
            db.add(row)
        row.match_percentage = r["match_percentage"]
        row.skill_similarity = r["skill_similarity"]
        row.semantic_similarity = r["semantic_similarity"]
        row.experience_match = r["experience_match"]
        row.talent_score_alignment = r["talent_score_alignment"]
        row.project_relevance = r["project_relevance"]
        row.explanation = r["explanation"]
        row.computed_at = datetime.now(timezone.utc)
        rows.append(row)

    score_aggregation_input = {"candidate_count": len(candidate_pool), "required_skills": job.required_skills}
    score_aggregation_output = {"match_count": len(result_state["match_results"])}
    db.add(
        AgentRun(
            agent_name="score_aggregation_agent",
            subject_type="job",
            subject_id=job.id,
            input_ref=score_aggregation_input,
            output=score_aggregation_output,
            # Rules + embedding similarity, no chat LLM in Flow B — the embedding model
            # is the only "model" involved, per the agent registry's own "no LLM needed
            # for the numeric score" note.
            model_used=settings.embedding_model,
            langfuse_trace_id=record_agent_trace(
                "score_aggregation_agent", score_aggregation_input, score_aggregation_output, settings.embedding_model
            ),
        )
    )
    await db.commit()
    for row in rows:
        await db.refresh(row)
    return rows


router_stage_values = set(APPLICATION_STAGES)


# --- FR-1/2: Jobs & Matching ---


@router.post("/jobs", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
async def create_job(
    body: JobCreateRequest,
    user: User = Depends(require_role("recruiter")),
    db: AsyncSession = Depends(get_db),
) -> Job:
    job = Job(
        organization_id=user.organization_id,
        posted_by_user_id=user.id,
        title=body.title,
        description=body.description,
        required_skills=body.required_skills,
        min_experience_years=body.min_experience_years,
        location=body.location,
        is_remote=body.is_remote,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    # Flow B runs synchronously on job creation (doc 02 §3) — same "no async job queue
    # yet" simplification as Module 01. A candidate-less pool degrades to zero
    # MatchScore rows, not an error.
    try:
        await _run_matching_and_persist(db, job)
    except RecruitmentUnavailable:
        # Matching couldn't run (e.g. Qdrant/embedding model unreachable) — the job
        # posting itself still succeeds; matches can be recomputed later via
        # GET /jobs/{id}/matches once the dependency is back.
        pass
    return job


@router.get("/jobs", response_model=list[JobResponse])
async def list_jobs(
    user: User = Depends(require_role("recruiter")),
    db: AsyncSession = Depends(get_db),
) -> list[Job]:
    if user.organization_id:
        result = await db.execute(
            select(Job).where(Job.organization_id == user.organization_id).order_by(Job.created_at.desc())
        )
    else:
        result = await db.execute(
            select(Job).where(Job.posted_by_user_id == user.id).order_by(Job.created_at.desc())
        )
    return list(result.scalars().all())


@router.get("/jobs/{job_id}/matches", response_model=list[MatchScoreWithCandidateResponse])
async def get_job_matches(
    job_id: uuid.UUID,
    recompute: bool = Query(False, description="Force Flow B to re-run instead of reading persisted rows."),
    user: User = Depends(require_role("recruiter")),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    job = await _job_owned_by(db, job_id, user)

    if recompute:
        try:
            await _run_matching_and_persist(db, job)
        except RecruitmentUnavailable as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    result = await db.execute(
        select(MatchScore).where(MatchScore.job_id == job.id).order_by(MatchScore.match_percentage.desc())
    )
    scores = result.scalars().all()
    if not scores:
        return []

    profiles_result = await db.execute(
        select(CandidateProfile).where(CandidateProfile.id.in_([s.candidate_id for s in scores]))
    )
    profiles_by_id = {p.id: p for p in profiles_result.scalars().all()}

    talent_scores_result = await db.execute(
        select(TalentScore)
        .where(TalentScore.candidate_id.in_([s.candidate_id for s in scores]))
        .order_by(TalentScore.candidate_id, TalentScore.computed_at.desc())
    )
    latest_talent_score: dict[uuid.UUID, float | None] = {}
    for row in talent_scores_result.scalars().all():
        latest_talent_score.setdefault(row.candidate_id, row.overall)

    return [
        {
            "id": s.id,
            "job_id": s.job_id,
            "candidate_id": s.candidate_id,
            "match_percentage": s.match_percentage,
            "skill_similarity": s.skill_similarity,
            "semantic_similarity": s.semantic_similarity,
            "experience_match": s.experience_match,
            "talent_score_alignment": s.talent_score_alignment,
            "project_relevance": s.project_relevance,
            "explanation": s.explanation,
            "computed_at": s.computed_at,
            "candidate_headline": profiles_by_id[s.candidate_id].headline if s.candidate_id in profiles_by_id else None,
            "candidate_location": profiles_by_id[s.candidate_id].location if s.candidate_id in profiles_by_id else None,
            "candidate_github_username": profiles_by_id[s.candidate_id].github_username
            if s.candidate_id in profiles_by_id
            else None,
            "candidate_overall_talent_score": latest_talent_score.get(s.candidate_id),
        }
        for s in scores
    ]


# --- Applications (candidate self-apply + recruiter pipeline) ---


@router.post("/jobs/{job_id}/apply", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
async def apply_to_job(
    job_id: uuid.UUID,
    user: User = Depends(require_role("candidate")),
    db: AsyncSession = Depends(get_db),
) -> Application:
    job_result = await db.execute(select(Job).where(Job.id == job_id))
    if job_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="job_not_found")

    profile_result = await db.execute(select(CandidateProfile).where(CandidateProfile.user_id == user.id))
    profile = profile_result.scalar_one_or_none()
    if profile is None:
        profile = CandidateProfile(user_id=user.id)
        db.add(profile)
        await db.flush()

    application = Application(job_id=job_id, candidate_id=profile.id, stage="sourced", source="direct")
    db.add(application)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="already_applied") from exc
    await db.refresh(application)
    return application


@router.get("/candidates/me/applications", response_model=list[ApplicationWithJobResponse])
async def get_my_applications(
    user: User = Depends(require_role("candidate")),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    profile_result = await db.execute(select(CandidateProfile).where(CandidateProfile.user_id == user.id))
    profile = profile_result.scalar_one_or_none()
    if profile is None:
        return []

    result = await db.execute(
        select(Application, Job)
        .join(Job, Application.job_id == Job.id)
        .where(Application.candidate_id == profile.id)
        .order_by(Application.applied_at.desc())
    )
    return [
        {
            "id": app.id,
            "job_id": app.job_id,
            "candidate_id": app.candidate_id,
            "stage": app.stage,
            "source": app.source,
            "applied_at": app.applied_at,
            "stage_updated_at": app.stage_updated_at,
            "job_title": job.title,
            "job_location": job.location,
        }
        for app, job in result.all()
    ]


@router.get("/applications", response_model=list[ApplicationWithCandidateResponse])
async def list_applications(
    job_id: uuid.UUID | None = None,
    stage: str | None = None,
    user: User = Depends(require_role("recruiter")),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    query = select(Application, CandidateProfile).join(
        CandidateProfile, Application.candidate_id == CandidateProfile.id
    )
    if job_id is not None:
        await _job_owned_by(db, job_id, user)
        query = query.where(Application.job_id == job_id)
    else:
        # No job_id given — scope to this recruiter's own postings so one recruiter
        # can't enumerate another's pipeline.
        my_jobs = await db.execute(select(Job.id).where(Job.posted_by_user_id == user.id))
        query = query.where(Application.job_id.in_([row[0] for row in my_jobs.all()]))
    if stage is not None:
        if stage not in router_stage_values:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="invalid_stage")
        query = query.where(Application.stage == stage)

    result = await db.execute(query.order_by(Application.stage_updated_at.desc()))
    scores_result = await db.execute(select(TalentScore).order_by(TalentScore.candidate_id, TalentScore.computed_at.desc()))
    latest_score_by_candidate: dict[uuid.UUID, float | None] = {}
    for s in scores_result.scalars().all():
        latest_score_by_candidate.setdefault(s.candidate_id, s.overall)

    return [
        {
            "id": app.id,
            "job_id": app.job_id,
            "candidate_id": app.candidate_id,
            "stage": app.stage,
            "source": app.source,
            "applied_at": app.applied_at,
            "stage_updated_at": app.stage_updated_at,
            "candidate_headline": profile.headline,
            "candidate_github_username": profile.github_username,
            "candidate_overall_talent_score": latest_score_by_candidate.get(profile.id),
        }
        for app, profile in result.all()
    ]


@router.patch("/applications/{application_id}/stage", response_model=ApplicationResponse)
async def update_application_stage(
    application_id: uuid.UUID,
    body: ApplicationStageUpdateRequest,
    user: User = Depends(require_role("recruiter")),
    db: AsyncSession = Depends(get_db),
) -> Application:
    if body.stage not in router_stage_values:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="invalid_stage")

    result = await db.execute(select(Application).where(Application.id == application_id))
    application = result.scalar_one_or_none()
    if application is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="application_not_found")
    await _job_owned_by(db, application.job_id, user)

    application.stage = body.stage
    application.stage_updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(application)
    return application


# --- FR-3: Recruiter AI Copilot ---


@router.post("/copilot/query", response_model=CopilotQueryResponse)
async def copilot_query(
    body: CopilotQueryRequest,
    user: User = Depends(require_role("recruiter")),
    db: AsyncSession = Depends(get_db),
) -> CopilotQueryResponse:
    if body.conversation_id is not None:
        result = await db.execute(
            select(CopilotConversation).where(
                CopilotConversation.id == body.conversation_id, CopilotConversation.recruiter_id == user.id
            )
        )
        conversation = result.scalar_one_or_none()
        if conversation is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="conversation_not_found")
    else:
        conversation = CopilotConversation(recruiter_id=user.id, messages=[], structured_filters=None)
        db.add(conversation)
        await db.flush()

    taxonomy_result = await db.execute(select(SkillTaxonomyEntry))
    skill_synonyms = {row.canonical_name: row.synonyms or [] for row in taxonomy_result.scalars().all()}
    alias_result = await db.execute(select(LocationAlias))
    location_aliases = {row.canonical_name: row.aliases or [] for row in alias_result.scalars().all()}

    candidate_pool = await _build_candidate_pool(db)

    initial_state: CopilotState = {
        "recruiter_id": str(user.id),
        "conversation_id": str(conversation.id),
        "raw_query": body.message,
        "prior_filters": conversation.structured_filters,
        "candidate_pool": candidate_pool,
        "skill_synonyms": skill_synonyms,
        "location_aliases": location_aliases,
        "structured_filters": {},
        "shortlist": [],
        "ranked_candidate_ids": [],
        "explanations": {},
    }
    try:
        result_state = await get_copilot_graph().ainvoke(initial_state)
    except RecruitmentUnavailable as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    shortlist_by_id = {c["candidate_id"]: c for c in result_state["shortlist"]}
    results = [
        CopilotResult(
            candidate_id=cid,
            match_percentage=shortlist_by_id.get(cid, {}).get("_retrieval_score"),
            explanation=result_state["explanations"].get(cid, "Matched the recruiter's structured filters."),
        )
        for cid in result_state["ranked_candidate_ids"]
    ]

    settings = get_settings()
    conversation.messages = [
        *(conversation.messages or []),
        {"role": "recruiter", "content": body.message},
        {
            "role": "copilot",
            "content": f"{len(results)} candidate(s) found.",
            "candidate_ids": [r.candidate_id for r in results],
        },
    ]
    conversation.structured_filters = result_state["structured_filters"]
    copilot_input = {"raw_query": body.message, "structured_filters": result_state["structured_filters"]}
    copilot_output = {"result_count": len(results), "ranked_candidate_ids": result_state["ranked_candidate_ids"]}
    db.add(
        AgentRun(
            agent_name="recruiter_copilot",
            subject_type="copilot_conversation",
            subject_id=conversation.id,
            input_ref=copilot_input,
            output=copilot_output,
            # Query understanding + explanation run on the fast tier, re-ranking on the
            # judgment tier — recorded as the judgment model since that's the
            # highest-consequence step (it decides final ordering).
            model_used=settings.llm_model_judgment,
            langfuse_trace_id=record_agent_trace(
                "recruiter_copilot", copilot_input, copilot_output, settings.llm_model_judgment
            ),
        )
    )
    await db.commit()

    return CopilotQueryResponse(
        conversation_id=conversation.id,
        results=results,
        structured_filters_used=result_state["structured_filters"],
    )


# --- FR-4: Hiring Analytics Dashboard ---


async def _recruiter_job_ids(db: AsyncSession, user: User, job_id: uuid.UUID | None) -> list[uuid.UUID]:
    if job_id is not None:
        await _job_owned_by(db, job_id, user)
        return [job_id]
    result = await db.execute(select(Job.id).where(Job.posted_by_user_id == user.id))
    return [row[0] for row in result.all()]


@router.get("/analytics/hiring-funnel", response_model=HiringFunnelResponse)
async def hiring_funnel(
    job_id: uuid.UUID | None = None,
    user: User = Depends(require_role("recruiter")),
    db: AsyncSession = Depends(get_db),
) -> HiringFunnelResponse:
    job_ids = await _recruiter_job_ids(db, user, job_id)
    result = await db.execute(select(Application.stage).where(Application.job_id.in_(job_ids)))
    counts: dict[str, int] = defaultdict(int)
    for (stage,) in result.all():
        counts[stage] += 1

    stages = []
    previous_count: int | None = None
    for stage_name in APPLICATION_STAGES:
        count = counts.get(stage_name, 0)
        conversion = (count / previous_count) if previous_count else None
        stages.append(FunnelStage(stage=stage_name, count=count, conversion_rate_from_previous=conversion))
        previous_count = count if count else previous_count
    return HiringFunnelResponse(job_id=job_id, stages=stages)


@router.get("/analytics/time-to-hire", response_model=TimeToHireResponse)
async def time_to_hire(
    job_id: uuid.UUID | None = None,
    user: User = Depends(require_role("recruiter")),
    db: AsyncSession = Depends(get_db),
) -> TimeToHireResponse:
    job_ids = await _recruiter_job_ids(db, user, job_id)
    result = await db.execute(
        select(Application.applied_at, Application.stage_updated_at)
        .where(Application.job_id.in_(job_ids))
        .where(Application.stage == "hired")
    )
    days: list[float] = []
    for applied_at, stage_updated_at in result.all():
        days.append((stage_updated_at - applied_at).total_seconds() / 86400)

    buckets = {"0-7d": 0, "8-14d": 0, "15-30d": 0, "31d+": 0}
    for d in days:
        if d <= 7:
            buckets["0-7d"] += 1
        elif d <= 14:
            buckets["8-14d"] += 1
        elif d <= 30:
            buckets["15-30d"] += 1
        else:
            buckets["31d+"] += 1

    median = None
    if days:
        sorted_days = sorted(days)
        mid = len(sorted_days) // 2
        median = sorted_days[mid] if len(sorted_days) % 2 else (sorted_days[mid - 1] + sorted_days[mid]) / 2

    return TimeToHireResponse(job_id=job_id, distribution=buckets, median_days=median)


@router.get("/analytics/source-breakdown", response_model=SourceBreakdownResponse)
async def source_breakdown(
    job_id: uuid.UUID | None = None,
    user: User = Depends(require_role("recruiter")),
    db: AsyncSession = Depends(get_db),
) -> SourceBreakdownResponse:
    job_ids = await _recruiter_job_ids(db, user, job_id)
    result = await db.execute(select(Application.source).where(Application.job_id.in_(job_ids)))
    counts: dict[str, int] = defaultdict(int)
    for (source,) in result.all():
        counts[source or "direct"] += 1

    return SourceBreakdownResponse(
        job_id=job_id,
        direct=counts.get("direct", 0),
        copilot_search=counts.get("copilot_search", 0),
        hackathon=counts.get("hackathon", 0),
    )
