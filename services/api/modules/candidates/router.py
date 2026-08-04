"""
Candidate Controller & Intelligence Endpoints.
Handles Candidate Profile Ingestion, Talent Score™ Calculation, GitHub Sync, and Career Guidance.
"""
import asyncio
import re
import secrets
import time
from dataclasses import asdict
from datetime import datetime, timedelta, timezone

import logging

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile, status
from fastapi.responses import RedirectResponse
from github import Github
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from services.api.core.db import async_session

from packages.db.models import (
    AgentRun,
    Badge,
    CandidateProfile,
    CareerRecommendation,
    Certification,
    Consent,
    CourseCatalogEntry,
    File,
    GeneratedDocument,
    GithubSnapshot,
    HackathonRanking,
    HackathonTeamMember,
    TalentScore,
    User,
)
from packages.shared_schemas.candidates import (
    SUB_SCORE_NAMES,
    BadgeResponse,
    CandidateProfileResponse,
    CareerGuidanceResponse,
    CoverLetterGenerateRequest,
    DashboardResponse,
    EvidenceConfidence,
    GeneratedDocumentResponse,
    GithubSummary,
    HackathonExperienceRequest,
    LeetcodeConnectRequest,
    PortfolioPublishRequest,
    ProfileUpdateRequest,
    PublicPortfolioProject,
    ResumeGenerateRequest,
    SubScore,
    TalentScoreResponse,
)
from services.agents.candidate_intelligence.career_guidance_graph import get_career_guidance_graph
from services.agents.candidate_intelligence.document_state import DocumentBuilderState
from services.agents.candidate_intelligence.graph import get_graph
from services.agents.candidate_intelligence.resume_graph import get_resume_graph
from services.agents.candidate_intelligence.state import CandidateProfileState, CareerGuidanceState
from services.agents.candidate_intelligence.tools.document_generation import (
    DocumentGenerationUnavailable,
)
from services.agents.candidate_intelligence.tools.assessment_bridge import (
    assessment_score_population,
    latest_assessment_score,
)
from services.agents.candidate_intelligence.tools.github_calendar import (
    GithubCalendarUnavailable,
    fetch_github_calendar,
)
from services.agents.candidate_intelligence.tools.population import (
    commit_count_population,
    latest_subscore_population,
)
from services.agents.candidate_intelligence.tools.leetcode import (
    LeetcodeUnavailable,
    fetch_leetcode_stats,
)
from services.agents.candidate_intelligence.tools.resume_pdf import (
    PdfGenerationUnavailable,
    render_resume_pdf,
)
from services.agents.candidate_intelligence.tools.role_taxonomy import ROLE_SKILL_TAXONOMY
from services.agents.candidate_intelligence.tools.roadmap import RoadmapGenerationUnavailable
from services.agents.candidate_intelligence.tools.skill_gap import CareerGuidanceUnavailable
from services.api.core.config import get_settings
from services.api.core.db import get_db
from services.api.core.rbac import require_role
from services.api.core.storage import StorageUnavailable, upload_file
from services.api.core.tracing import start_agent_trace

_CAREER_RECOMMENDATION_TTL = timedelta(hours=24)
_GITHUB_OAUTH_STATE_TTL_SECONDS = 600
_oauth_state_cache: dict[str, tuple[str, float]] = {}
# Third-party stats (GitHub calendar, LeetCode) are cached, not fetched live per view —
# this bounds how often a candidate can force a re-fetch of LeetCode's unofficial API.
_STATS_REFRESH_COOLDOWN = timedelta(minutes=15)

logger = logging.getLogger(__name__)

_RESERVED_USERNAMES = {
    "api", "dashboard", "onboarding", "sign-in", "sign-up", "hackathons",
    "profile", "career", "resume-builder", "assessments", "interview", "my-flags",
    "applications", "jobs", "copilot", "pipeline", "analytics", "top-performers",
    "reports", "evaluations", "submissions", "fraud-review", "users", "audit-log",
    "candidates", "public", "me", "health",
}
_USERNAME_PATTERN = re.compile(r"^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$")

router = APIRouter(prefix="/candidates", tags=["Candidate Intelligence & Talent Scoring"])


class FactCheckFailed(Exception):
    def __init__(self, document: GeneratedDocument) -> None:
        self.document = document
        super().__init__("Generated document failed the fact-check guardrail.")


@router.patch("/me", response_model=CandidateProfileResponse)
async def update_profile(
    body: ProfileUpdateRequest,
    user: User = Depends(require_role("candidate")),
    db: AsyncSession = Depends(get_db),
) -> CandidateProfile:
    profile = await _get_or_create_profile(db, user)
    
    if body.full_name is not None:
        user.full_name = body.full_name
        db.add(user)
        
    if body.headline is not None:
        profile.headline = body.headline
    if body.location is not None:
        profile.location = body.location
        
    if body.college is not None or body.degree is not None:
        current_education = profile.education or []
        edu = dict(current_education[0]) if current_education else {}
        if body.college is not None:
            edu["institution"] = body.college
        if body.degree is not None:
            edu["degree"] = body.degree
        profile.education = [edu]
        
    await db.commit()
    await db.refresh(profile)
    return profile


@router.post("/me/hackathon-experience", response_model=CandidateProfileResponse)
async def add_hackathon_experience(
    body: HackathonExperienceRequest,
    user: User = Depends(require_role("candidate")),
    db: AsyncSession = Depends(get_db),
    background_tasks: BackgroundTasks = BackgroundTasks(),
) -> CandidateProfile:
    """Add a hackathon experience entry (self-reported external hackathon) and trigger rescore."""
    import uuid

    profile = await _get_or_create_profile(db, user)

    current_exp = profile.hackathon_experience or []
    new_entry = {
        "id": str(uuid.uuid4()),
        "name": body.name,
        "result": body.result,
        "weight": body.weight,
        "date": body.date,
        "platform_hackathon_id": None,
    }
    current_exp.append(new_entry)
    profile.hackathon_experience = current_exp
    profile.ingestion_status = "processing"

    await db.commit()
    await db.refresh(profile)

    # Trigger background rescore
    background_tasks.add_task(_run_ingestion_background, str(profile.id), {})

    return profile


@router.delete("/me/hackathon-experience/{entry_id}", response_model=CandidateProfileResponse)
async def remove_hackathon_experience(
    entry_id: str,
    user: User = Depends(require_role("candidate")),
    db: AsyncSession = Depends(get_db),
    background_tasks: BackgroundTasks = BackgroundTasks(),
) -> CandidateProfile:
    """Remove a hackathon experience entry and trigger rescore."""
    profile = await _get_or_create_profile(db, user)

    current_exp = profile.hackathon_experience or []
    updated_exp = [e for e in current_exp if e.get("id") != entry_id]

    if len(updated_exp) == len(current_exp):
        raise HTTPException(status_code=404, detail="Hackathon experience entry not found")

    profile.hackathon_experience = updated_exp if updated_exp else None
    profile.ingestion_status = "processing"

    await db.commit()
    await db.refresh(profile)

    # Trigger background rescore
    background_tasks.add_task(_run_ingestion_background, str(profile.id), {})

    return profile


async def _get_or_create_profile(db: AsyncSession, user: User) -> CandidateProfile:
    result = await db.execute(select(CandidateProfile).where(CandidateProfile.user_id == user.id))
    profile = result.scalar_one_or_none()
    if profile is None:
        profile = CandidateProfile(user_id=user.id)
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
    return profile


async def _require_consent(db: AsyncSession, user_id, consent_type: str) -> None:
    result = await db.execute(
        select(Consent).where(
            Consent.candidate_id == user_id,
            Consent.consent_type == consent_type,
            Consent.status == "granted",
        )
    )
    if result.scalars().first() is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=f"consent_required:{consent_type}"
        )


async def _run_ingestion_and_persist(
    db: AsyncSession, profile: CandidateProfile, state_overrides: dict
) -> CandidateProfile:
    # Population/assessment data for Talent Score v2's percentile normalization —
    # fetched here (the router owns the DB session) and injected into graph state so the
    # talent_scoring node stays DB-free, same convention as the rest of this module.
    commit_population = await commit_count_population(db)
    star_population = await latest_subscore_population(db, "community_participation")
    leadership_population = await latest_subscore_population(db, "leadership")
    contribution_population = await latest_subscore_population(db, "open_source_contributions")
    assessment_score = await latest_assessment_score(db, profile.id)
    assessment_population = await assessment_score_population(db)

    # Fetch hackathon data: platform-run results from HackathonRanking/HackathonTeamMember
    # and self-reported from CandidateProfile.hackathon_experience
    hackathon_platform_results = []
    if profile.id:
        team_members = await db.execute(
            select(HackathonTeamMember).where(HackathonTeamMember.candidate_id == profile.id)
        )
        for member in team_members.scalars().all():
            rankings = await db.execute(
                select(HackathonRanking).where(
                    (HackathonRanking.team_id == member.team_id)
                )
            )
            for ranking in rankings.scalars().all():
                hackathon_platform_results.append({
                    "rank": ranking.rank,
                    "composite_score": ranking.composite_score,
                    "hackathon_id": str(ranking.hackathon_id),
                })

    hackathon_self_reported = profile.hackathon_experience or []

    initial_state: CandidateProfileState = {
        "candidate_id": str(profile.id),
        "user_id": str(profile.user_id),
        "raw_resume_bytes": None,
        "raw_resume_content_type": None,
        "resume_parsed": {
            "headline": profile.headline,
            "location": profile.location,
            "skills": profile.skills or [],
            "experience": profile.experience or [],
            "education": profile.education or [],
        }
        if not state_overrides.get("raw_resume_bytes")
        else None,
        "github_username": profile.github_username,
        "github_access_token": None,
        "github_raw": None,
        "certificate_file_bytes": None,
        "certificate_extracted": None,
        "merged_profile": None,
        "conflicts": [],
        "commit_population": commit_population,
        "star_population": star_population,
        "leadership_population": leadership_population,
        "contribution_population": contribution_population,
        "assessment_score": assessment_score,
        "assessment_population": assessment_population,
        "hackathon_platform_results": hackathon_platform_results,
        "hackathon_self_reported": hackathon_self_reported,
        "sub_scores": {},
        "overall_score": None,
        "renormalized_subscores": [],
        "confidence": None,
        "badges": [],
        **state_overrides,
    }

    with start_agent_trace(
        "candidate_intelligence.ingest",
        input_data={"github_username": profile.github_username, "has_resume": bool(state_overrides.get("raw_resume_bytes"))},
        user_id=str(profile.user_id),
        tags=["candidate-intelligence", "ingestion"],
    ) as trace:
        result_state = await get_graph().ainvoke(initial_state)
        trace.update(output={"overall_score": result_state.get("overall_score")})

    merged = result_state["merged_profile"] or {}
    profile.github_username = merged.get("github_username") or profile.github_username
    profile.headline = merged.get("headline") or profile.headline
    profile.location = merged.get("location") or profile.location
    profile.skills = merged.get("skills") or profile.skills
    profile.experience = merged.get("experience") or profile.experience
    profile.education = merged.get("education") or profile.education
    profile.merged_conflicts = merged.get("merged_conflicts", [])

    github_raw = result_state.get("github_raw")
    if github_raw is not None:
        # Merged into (not replacing) github_stats — the GraphQL calendar fetch in
        # github_oauth_callback below also writes into this same JSONB column, and
        # ingestion can run standalone (resume-only) without a fresh calendar fetch.
        profile.github_stats = {
            **(profile.github_stats or {}),
            "owned_repo_count": github_raw.owned_repo_count,
            "external_contributions": github_raw.external_contributions,
            "pr_review_count": github_raw.pr_review_count,
            "commit_activity_weekly": github_raw.commit_activity_weekly,
        }
        for repo in github_raw.repos:
            db.add(
                GithubSnapshot(
                    candidate_id=profile.id,
                    repo_full_name=repo.repo_full_name,
                    stars=repo.stars,
                    forks=repo.forks,
                    commit_count=repo.commit_count,
                    pr_count=repo.pr_count,
                    issue_count=repo.issue_count,
                    languages=repo.languages,
                    is_fork=repo.is_fork,
                    topics=repo.topics,
                    pushed_at=repo.pushed_at,
                )
            )

    certificate_extracted = result_state.get("certificate_extracted")
    if certificate_extracted is not None:
        db.add(
            Certification(
                candidate_id=profile.id,
                title=certificate_extracted.get("title"),
                credential_id=certificate_extracted.get("credential_id"),
                ocr_confidence=certificate_extracted.get("ocr_confidence"),
                verification_status="unverified",
            )
        )

    sub_scores: dict[str, SubScore] = result_state["sub_scores"]
    confidence = result_state.get("confidence")
    settings = get_settings()
    if sub_scores:
        score_row = TalentScore(
            candidate_id=profile.id,
            coding_ability=sub_scores["coding_ability"].value,
            problem_solving=sub_scores["problem_solving"].value,
            project_quality=sub_scores["project_quality"].value,
            innovation=sub_scores["innovation"].value,
            technical_consistency=sub_scores["technical_consistency"].value,
            community_participation=sub_scores["community_participation"].value,
            leadership=sub_scores["leadership"].value,
            open_source_contributions=sub_scores["open_source_contributions"].value,
            hackathon_performance=sub_scores["hackathon_performance"].value,
            overall=result_state["overall_score"],
            renormalized_subscores=result_state["renormalized_subscores"],
            confidence_available_signals=confidence.available_signals if confidence else None,
            confidence_expected_signals=confidence.expected_signals if confidence else None,
            confidence=confidence.confidence if confidence else None,
        )
        db.add(score_row)

        talent_scoring_input = {"github_username": profile.github_username}
        talent_scoring_output = {
            name: asdict(s) if hasattr(s, "__dataclass_fields__") else s.model_dump() for name, s in sub_scores.items()
        }
        db.add(
            AgentRun(
                agent_name="talent_scoring_agent",
                subject_type="candidate",
                subject_id=profile.id,
                input_ref=talent_scoring_input,
                output=talent_scoring_output,
                model_used=settings.llm_model_judgment,
                langfuse_trace_id=trace.trace_id,
            )
        )

    existing_badges = await db.execute(select(Badge.skill_name).where(Badge.candidate_id == profile.id))
    existing_skill_names = {row[0] for row in existing_badges.all()}
    for badge in result_state.get("badges", []):
        if badge["skill_name"] not in existing_skill_names:
            db.add(
                Badge(
                    candidate_id=profile.id,
                    skill_name=badge["skill_name"],
                    corroboration_sources=badge["corroboration_sources"],
                )
            )

    await db.commit()
    await db.refresh(profile)
    return profile


async def _run_ingestion_background(
    profile_id, state_overrides: dict, github_access_token: str | None = None
) -> None:
    """Runs `_run_ingestion_and_persist` outside the request/response cycle, in its own
    DB session (the request's session is closed by the time this executes). Ingestion
    involves dozens of blocking GitHub calls plus several LLM round-trips — synchronously
    awaiting it in the request handler stalls the uploading candidate's own request for
    the full duration and, combined with unindexed queries, degrades every other
    concurrent request too. `ingestion_status` lets the frontend poll for completion.

    `github_access_token` also triggers the Development Stats (contribution calendar)
    GraphQL fetch — best-effort, folded in here since it's part of the same GitHub
    connect flow and is itself a network call worth keeping off the request path.
    """
    async with async_session() as bg_db:
        result = await bg_db.execute(select(CandidateProfile).where(CandidateProfile.id == profile_id))
        profile = result.scalar_one_or_none()
        if profile is None:
            return
        try:
            await _run_ingestion_and_persist(bg_db, profile, state_overrides)
            profile.ingestion_status = "done"
            profile.ingestion_error = None
        except Exception as exc:  # noqa: BLE001 - surfaced via ingestion_error, never crashes the worker
            logger.exception("Background ingestion failed for candidate %s", profile_id)
            profile.ingestion_status = "failed"
            profile.ingestion_error = str(exc)[:2000]
            await bg_db.commit()
            return

        if github_access_token and profile.github_username:
            try:
                calendar = await fetch_github_calendar(profile.github_username, github_access_token)
                profile.github_stats = {**(profile.github_stats or {}), **asdict(calendar)}
                profile.stats_refreshed_at = datetime.now(timezone.utc)
            except GithubCalendarUnavailable:
                logger.warning(
                    "GitHub calendar fetch failed for %s", profile.github_username, exc_info=True
                )

        await bg_db.commit()


@router.get("/me", response_model=CandidateProfileResponse)
async def get_my_profile(
    user: User = Depends(require_role("candidate")),
    db: AsyncSession = Depends(get_db),
) -> CandidateProfile:
    return await _get_or_create_profile(db, user)


@router.post("/me/consents/{consent_type}", status_code=status.HTTP_201_CREATED)
async def grant_consent(
    consent_type: str,
    user: User = Depends(require_role("candidate")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    if consent_type not in (
        "resume_parsing",
        "linkedin_export",
        "github_ingestion",
        "ai_assessment",
        "ai_interview",
        "perceptual_photo_hash",
    ):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="invalid_consent_type")
    db.add(Consent(candidate_id=user.id, consent_type=consent_type, status="granted"))
    await db.commit()
    return {"granted": True, "consent_type": consent_type}


@router.post("/me/ingest/resume", response_model=CandidateProfileResponse)
async def ingest_resume(
    file: UploadFile,
    background_tasks: BackgroundTasks,
    user: User = Depends(require_role("candidate")),
    db: AsyncSession = Depends(get_db),
) -> CandidateProfile:
    await _require_consent(db, user.id, "resume_parsing")
    profile = await _get_or_create_profile(db, user)
    file_bytes = await file.read()
    profile.ingestion_status = "processing"
    profile.ingestion_error = None
    await db.commit()
    await db.refresh(profile)
    background_tasks.add_task(
        _run_ingestion_background,
        profile.id,
        {"raw_resume_bytes": file_bytes, "raw_resume_content_type": file.content_type},
    )
    return profile


@router.post("/me/ingest/certificate", response_model=CandidateProfileResponse)
async def ingest_certificate(
    file: UploadFile,
    background_tasks: BackgroundTasks,
    user: User = Depends(require_role("candidate")),
    db: AsyncSession = Depends(get_db),
) -> CandidateProfile:
    profile = await _get_or_create_profile(db, user)
    file_bytes = await file.read()
    profile.ingestion_status = "processing"
    profile.ingestion_error = None
    await db.commit()
    await db.refresh(profile)
    background_tasks.add_task(_run_ingestion_background, profile.id, {"certificate_file_bytes": file_bytes})
    return profile


@router.get("/me/ingestion-status")
async def get_ingestion_status(
    user: User = Depends(require_role("candidate")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    profile = await _get_or_create_profile(db, user)
    return {"status": profile.ingestion_status, "error": profile.ingestion_error}


@router.get("/github/oauth-url")
async def github_oauth_url(
    user: User = Depends(require_role("candidate")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    await _require_consent(db, user.id, "github_ingestion")
    settings = get_settings()
    state = secrets.token_urlsafe(24)
    _oauth_state_cache[state] = (str(user.id), time.monotonic() + _GITHUB_OAUTH_STATE_TTL_SECONDS)
    authorize_url = (
        "https://github.com/login/oauth/authorize"
        f"?client_id={settings.github_client_id}"
        f"&redirect_uri={settings.github_oauth_redirect_uri}"
        "&scope=read:user%20repo"
        f"&state={state}"
    )
    return {"authorize_url": authorize_url}


@router.get("/github/oauth/callback")
async def github_oauth_callback(
    code: str,
    state: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    settings = get_settings()
    cached = _oauth_state_cache.pop(state, None)
    if cached is None or cached[1] < time.monotonic():
        return RedirectResponse(f"{settings.frontend_url}/profile/edit?github=invalid_state")
    user_id = cached[0]

    async with httpx.AsyncClient(timeout=10.0) as client:
        token_response = await client.post(
            "https://github.com/login/oauth/access_token",
            data={
                "client_id": settings.github_client_id,
                "client_secret": settings.github_client_secret,
                "code": code,
                "redirect_uri": settings.github_oauth_redirect_uri,
            },
            headers={"Accept": "application/json"},
        )
    token_data = token_response.json()
    access_token = token_data.get("access_token")
    if not access_token:
        return RedirectResponse(f"{settings.frontend_url}/profile/edit?github=token_exchange_failed")

    # Github(...).get_user() is a blocking PyGithub HTTP call — off-thread so it doesn't
    # stall the event loop for every other in-flight request (same as github_analysis.py).
    github_username = await asyncio.to_thread(
        lambda: Github(login_or_token=access_token).get_user().login
    )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one()
    profile = await _get_or_create_profile(db, user)
    profile.github_username = github_username
    profile.ingestion_status = "processing"
    profile.ingestion_error = None
    await db.commit()

    background_tasks.add_task(
        _run_ingestion_background,
        profile.id,
        {"github_username": github_username, "github_access_token": access_token},
        access_token,
    )

    return RedirectResponse(f"{settings.frontend_url}/profile/edit?github=connected")


@router.post("/me/leetcode", response_model=CandidateProfileResponse)
async def connect_leetcode(
    body: LeetcodeConnectRequest,
    user: User = Depends(require_role("candidate")),
    db: AsyncSession = Depends(get_db),
) -> CandidateProfile:
    """Problem Solving Stats — connect by username only (LeetCode has no public OAuth)."""
    profile = await _get_or_create_profile(db, user)
    try:
        stats = await fetch_leetcode_stats(body.leetcode_username)
    except LeetcodeUnavailable as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="leetcode_username_invalid") from exc

    profile.leetcode_username = body.leetcode_username
    profile.leetcode_stats = asdict(stats)
    profile.stats_refreshed_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(profile)
    return profile


@router.post("/me/stats/refresh", response_model=CandidateProfileResponse)
async def refresh_stats(
    user: User = Depends(require_role("candidate")),
    db: AsyncSession = Depends(get_db),
) -> CandidateProfile:
    """Re-fetches LeetCode's Problem Solving Stats on demand (cooldown-gated — LeetCode's
    API is unofficial/rate-sensitive). GitHub's Development Stats refresh by reconnecting
    GitHub (`/github/oauth-url`) since no GitHub access token is persisted server-side."""
    profile = await _get_or_create_profile(db, user)
    now = datetime.now(timezone.utc)
    if profile.stats_refreshed_at is not None:
        refreshed_at = profile.stats_refreshed_at
        if refreshed_at.tzinfo is None:
            refreshed_at = refreshed_at.replace(tzinfo=timezone.utc)
        retry_at = refreshed_at + _STATS_REFRESH_COOLDOWN
        if now < retry_at:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={"error": "refresh_on_cooldown", "retry_at": retry_at.isoformat()},
            )

    if profile.leetcode_username:
        try:
            stats = await fetch_leetcode_stats(profile.leetcode_username)
            profile.leetcode_stats = asdict(stats)
        except LeetcodeUnavailable:
            logger.warning("LeetCode stats refresh failed for %s", profile.leetcode_username, exc_info=True)

    profile.stats_refreshed_at = now
    await db.commit()
    await db.refresh(profile)
    return profile


def _to_score_response(score: TalentScore) -> TalentScoreResponse:
    return TalentScoreResponse(
        overall=score.overall,
        sub_scores={
            "coding_ability": SubScore(value=score.coding_ability),
            "problem_solving": SubScore(value=score.problem_solving),
            "project_quality": SubScore(value=score.project_quality),
            "innovation": SubScore(value=score.innovation),
            "technical_consistency": SubScore(value=score.technical_consistency),
            "community_participation": SubScore(value=score.community_participation),
            "leadership": SubScore(value=score.leadership),
        },
        renormalized_subscores=score.renormalized_subscores or [],
        confidence=EvidenceConfidence(
            # Pre-v2 rows have no confidence columns — treat as fully unknown (0/7)
            # rather than fabricating a number for historical scores.
            available_signals=score.confidence_available_signals or 0,
            expected_signals=score.confidence_expected_signals or len(SUB_SCORE_NAMES),
            confidence=score.confidence if score.confidence is not None else 0.0,
        ),
        score_version=score.score_version,
        computed_at=score.computed_at,
    )


@router.get("/me/score", response_model=TalentScoreResponse | None)
async def get_my_latest_score(
    user: User = Depends(require_role("candidate")),
    db: AsyncSession = Depends(get_db),
):
    profile = await _get_or_create_profile(db, user)
    result = await db.execute(
        select(TalentScore)
        .where(TalentScore.candidate_id == profile.id)
        .order_by(TalentScore.computed_at.desc())
        .limit(1)
    )
    score = result.scalar_one_or_none()
    return _to_score_response(score) if score else None


@router.get("/me/score/history", response_model=list[TalentScoreResponse])
async def get_my_score_history(
    user: User = Depends(require_role("candidate")),
    db: AsyncSession = Depends(get_db),
) -> list[TalentScoreResponse]:
    profile = await _get_or_create_profile(db, user)
    result = await db.execute(
        select(TalentScore).where(TalentScore.candidate_id == profile.id).order_by(TalentScore.computed_at)
    )
    return [_to_score_response(s) for s in result.scalars().all()]


async def _compute_github_summary(db: AsyncSession, profile: CandidateProfile) -> GithubSummary:
    """Shared by `/me/dashboard`, `/me/github-summary`, and the public portfolio route
    (services/api/modules/public/router.py has its own copy scoped to published-only
    projects) — kept as one function here so the two never drift on aggregation logic."""
    snapshot_result = await db.execute(select(GithubSnapshot).where(GithubSnapshot.candidate_id == profile.id))
    snapshots = snapshot_result.scalars().all()
    github_stats = profile.github_stats or {}
    return GithubSummary(
        total_stars=sum(s.stars or 0 for s in snapshots),
        total_commits=sum(s.commit_count or 0 for s in snapshots),
        total_prs=sum(s.pr_count or 0 for s in snapshots),
        total_issues=sum(s.issue_count or 0 for s in snapshots),
        total_forks=sum(s.forks or 0 for s in snapshots),
        owned_repo_count=github_stats.get("owned_repo_count", 0),
        external_contributions=github_stats.get("external_contributions", 0),
        pr_review_count=github_stats.get("pr_review_count", 0),
        projects=[
            PublicPortfolioProject(
                repo_full_name=s.repo_full_name,
                stars=s.stars,
                forks=s.forks,
                languages=s.languages,
                topics=s.topics,
                pushed_at=s.pushed_at,
                description=s.description,
                commit_count=s.commit_count,
                pr_count=s.pr_count,
                issue_count=s.issue_count,
            )
            for s in sorted(snapshots, key=lambda s: s.stars or 0, reverse=True)
            if not s.is_fork
        ],
    )


@router.get("/me/badges", response_model=list[BadgeResponse])
async def get_my_badges(
    user: User = Depends(require_role("candidate")),
    db: AsyncSession = Depends(get_db),
) -> list[BadgeResponse]:
    profile = await _get_or_create_profile(db, user)
    result = await db.execute(select(Badge).where(Badge.candidate_id == profile.id))
    return [BadgeResponse.model_validate(b) for b in result.scalars().all()]


@router.get("/me/github-summary", response_model=GithubSummary)
async def get_my_github_summary(
    user: User = Depends(require_role("candidate")),
    db: AsyncSession = Depends(get_db),
) -> GithubSummary:
    """Split out from `/me/dashboard` (services/api decisions log, 2026-07-30 dashboard-
    resilience pass) so the frontend can fetch Development Stats independently of Talent
    Score — one section failing to load must not blank the whole candidate dashboard."""
    profile = await _get_or_create_profile(db, user)
    return await _compute_github_summary(db, profile)


@router.get("/me/dashboard", response_model=DashboardResponse)
async def get_my_dashboard(
    user: User = Depends(require_role("candidate")),
    db: AsyncSession = Depends(get_db),
) -> DashboardResponse:
    profile = await _get_or_create_profile(db, user)

    score_result = await db.execute(
        select(TalentScore).where(TalentScore.candidate_id == profile.id).order_by(TalentScore.computed_at)
    )
    scores = [_to_score_response(s) for s in score_result.scalars().all()]

    badge_result = await db.execute(select(Badge).where(Badge.candidate_id == profile.id))
    badges = [BadgeResponse.model_validate(b) for b in badge_result.scalars().all()]

    github_summary = await _compute_github_summary(db, profile)

    return DashboardResponse(
        profile=CandidateProfileResponse.model_validate(profile),
        latest_score=scores[-1] if scores else None,
        score_history=scores,
        badges=badges,
        github_summary=github_summary,
    )


def _to_document_response(
    doc: GeneratedDocument, file_url: str | None = None
) -> GeneratedDocumentResponse:
    return GeneratedDocumentResponse(
        id=doc.id,
        document_type=doc.document_type,
        target_job_description=doc.target_job_description,
        content=doc.content,
        file_url=file_url,
        fact_check_status=doc.fact_check_status,
        fact_check_findings=doc.fact_check_findings,
        model_used=doc.model_used,
        generated_at=doc.generated_at,
    )


async def _run_document_generation(
    db: AsyncSession,
    profile: CandidateProfile,
    document_type: str,
    target_job_description: str | None,
) -> GeneratedDocument:
    merged_profile_snapshot = {
        "headline": profile.headline,
        "location": profile.location,
        "skills": profile.skills or [],
        "experience": profile.experience or [],
        "education": profile.education or [],
        "github_username": profile.github_username,
    }
    initial_state: DocumentBuilderState = {
        "candidate_id": str(profile.id),
        "document_type": document_type,
        "merged_profile": merged_profile_snapshot,
        "target_job_description": target_job_description,
        "generated_content": None,
        "generation_error": None,
        "fact_check_status": None,
        "fact_check_findings": None,
        "attempts": 0,
    }

    with start_agent_trace(
        "candidate_intelligence.document_generation",
        input_data={"document_type": document_type, "has_target_job": bool(target_job_description)},
        user_id=str(profile.user_id),
        tags=["candidate-intelligence", "document-generation"],
    ) as trace:
        result_state = await get_resume_graph().ainvoke(initial_state)
        trace.update(output={"fact_check_status": result_state.get("fact_check_status")})
    settings = get_settings()

    if result_state.get("generation_error"):
        raise DocumentGenerationUnavailable(result_state["generation_error"])

    doc_row = GeneratedDocument(
        candidate_id=profile.id,
        document_type=document_type,
        target_job_description=target_job_description,
        content=result_state["generated_content"],
        fact_check_status=result_state["fact_check_status"],
        fact_check_findings=result_state["fact_check_findings"],
        attempts=result_state["attempts"],
        model_used=settings.llm_model_judgment,
    )
    db.add(doc_row)

    fact_check_input = {"document_type": document_type, "target_job_description": target_job_description}
    fact_check_output = {
        "fact_check_status": result_state["fact_check_status"],
        "findings": result_state["fact_check_findings"],
    }
    db.add(
        AgentRun(
            agent_name="fact_check_agent",
            subject_type="candidate",
            subject_id=profile.id,
            input_ref=fact_check_input,
            output=fact_check_output,
            model_used=settings.llm_model_fast,
            langfuse_trace_id=trace.trace_id,
        )
    )
    await db.commit()
    await db.refresh(doc_row)

    if doc_row.fact_check_status != "passed":
        raise FactCheckFailed(doc_row)
    return doc_row


@router.post("/me/resume/generate", response_model=GeneratedDocumentResponse)
async def generate_resume(
    body: ResumeGenerateRequest,
    user: User = Depends(require_role("candidate")),
    db: AsyncSession = Depends(get_db),
) -> GeneratedDocumentResponse:
    profile = await _get_or_create_profile(db, user)
    try:
        doc_row = await _run_document_generation(db, profile, "resume", body.target_job_description)
    except DocumentGenerationUnavailable as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except FactCheckFailed as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"message": "fact_check_failed", "findings": exc.document.fact_check_findings},
        ) from exc

    try:
        # WeasyPrint is CPU-heavy native rendering — keep it off the event loop.
        pdf_bytes = await asyncio.to_thread(render_resume_pdf, doc_row.content)
    except PdfGenerationUnavailable as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    try:
        # cloudinary.uploader.upload is a blocking network call — keep it off the event loop.
        public_url, storage_key = await asyncio.to_thread(
            upload_file,
            pdf_bytes,
            public_id=f"resumes/{profile.id}/{doc_row.id}",
            resource_type="raw",
        )
    except StorageUnavailable as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    file_row = File(owner_user_id=user.id, storage_key=storage_key, public_url=public_url, file_type="resume")
    db.add(file_row)
    await db.commit()
    await db.refresh(file_row)

    doc_row.file_id = file_row.id
    await db.commit()
    await db.refresh(doc_row)

    return _to_document_response(doc_row, file_url=public_url)


@router.post("/me/cover-letter/generate", response_model=GeneratedDocumentResponse)
async def generate_cover_letter(
    body: CoverLetterGenerateRequest,
    user: User = Depends(require_role("candidate")),
    db: AsyncSession = Depends(get_db),
) -> GeneratedDocumentResponse:
    profile = await _get_or_create_profile(db, user)
    try:
        doc_row = await _run_document_generation(
            db, profile, "cover_letter", body.target_job_description
        )
    except DocumentGenerationUnavailable as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except FactCheckFailed as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"message": "fact_check_failed", "findings": exc.document.fact_check_findings},
        ) from exc
    return _to_document_response(doc_row)


@router.get("/me/documents", response_model=list[GeneratedDocumentResponse])
async def list_my_documents(
    user: User = Depends(require_role("candidate")),
    db: AsyncSession = Depends(get_db),
) -> list[GeneratedDocumentResponse]:
    profile = await _get_or_create_profile(db, user)
    result = await db.execute(
        select(GeneratedDocument)
        .where(GeneratedDocument.candidate_id == profile.id)
        .order_by(GeneratedDocument.generated_at.desc())
    )
    docs = result.scalars().all()

    file_ids = [d.file_id for d in docs if d.file_id]
    file_urls: dict = {}
    if file_ids:
        file_result = await db.execute(select(File).where(File.id.in_(file_ids)))
        file_urls = {f.id: f.public_url for f in file_result.scalars().all()}

    return [_to_document_response(d, file_url=file_urls.get(d.file_id)) for d in docs]


@router.post("/me/portfolio/publish", response_model=CandidateProfileResponse)
async def publish_portfolio(
    body: PortfolioPublishRequest,
    user: User = Depends(require_role("candidate")),
    db: AsyncSession = Depends(get_db),
) -> CandidateProfile:
    profile = await _get_or_create_profile(db, user)

    # If a new username was supplied, validate and set it.
    # If not supplied (just toggling publish), the existing profile.username is reused.
    if body.username is not None:
        username = body.username.strip().lower()
        if not _USERNAME_PATTERN.match(username) or username in _RESERVED_USERNAMES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="invalid_username")
        existing = await db.execute(
            select(CandidateProfile).where(
                CandidateProfile.username == username, CandidateProfile.id != profile.id
            )
        )
        if existing.scalar_one_or_none() is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="username_taken")
        profile.username = username
    elif not profile.username:
        # Can't publish without a username — candidate must set one first.
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="username_required: set a username before publishing your portfolio",
        )

    profile.portfolio_published = True
    await db.commit()
    await db.refresh(profile)
    return profile


@router.post("/me/portfolio/unpublish", response_model=CandidateProfileResponse)
async def unpublish_portfolio(
    user: User = Depends(require_role("candidate")),
    db: AsyncSession = Depends(get_db),
) -> CandidateProfile:
    profile = await _get_or_create_profile(db, user)
    profile.portfolio_published = False
    await db.commit()
    await db.refresh(profile)
    return profile


def _years_experience_proxy(profile: CandidateProfile) -> float:
    return float(sum((e.get("years") or 0) for e in (profile.experience or [])))


def _to_career_guidance_response(row: CareerRecommendation) -> CareerGuidanceResponse:
    return CareerGuidanceResponse(
        target_role=row.target_role,
        skill_gaps=row.skill_gaps or [],
        recommended_courses=row.recommended_courses or [],
        roadmap=row.roadmap or {"stages": []},
        salary_estimate_low=row.salary_estimate_low,
        salary_estimate_high=row.salary_estimate_high,
        salary_rationale=row.salary_rationale,
        generated_at=row.generated_at,
    )


@router.get("/me/career-guidance", response_model=CareerGuidanceResponse)
async def get_my_career_guidance(
    target_role: str | None = None,
    refresh: bool = False,
    user: User = Depends(require_role("candidate")),
    db: AsyncSession = Depends(get_db),
) -> CareerGuidanceResponse:
    if target_role and target_role not in ROLE_SKILL_TAXONOMY:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"unknown_target_role. Known roles: {sorted(ROLE_SKILL_TAXONOMY)}",
        )

    profile = await _get_or_create_profile(db, user)

    if not refresh:
        cached_result = await db.execute(
            select(CareerRecommendation)
            .where(
                CareerRecommendation.candidate_id == profile.id,
                CareerRecommendation.target_role == target_role,
            )
            .order_by(CareerRecommendation.generated_at.desc())
            .limit(1)
        )
        cached = cached_result.scalar_one_or_none()
        if cached is not None and (datetime.now(timezone.utc) - cached.generated_at) < _CAREER_RECOMMENDATION_TTL:
            return _to_career_guidance_response(cached)

    score_result = await db.execute(
        select(TalentScore)
        .where(TalentScore.candidate_id == profile.id)
        .order_by(TalentScore.computed_at.desc())
        .limit(1)
    )
    latest_score = score_result.scalar_one_or_none()

    catalog_result = await db.execute(select(CourseCatalogEntry))
    catalog = [
        {
            "id": str(c.id),
            "provider": c.provider,
            "title": c.title,
            "url": c.url,
            "skill_tags": c.skill_tags,
            "level": c.level,
            "estimated_hours": c.estimated_hours,
            "is_free": c.is_free,
        }
        for c in catalog_result.scalars().all()
    ]

    candidate_skills = [s.get("name") for s in (profile.skills or []) if s.get("name")]

    initial_state: CareerGuidanceState = {
        "candidate_id": str(profile.id),
        "candidate_skills": candidate_skills,
        "location": profile.location,
        "years_experience_proxy": _years_experience_proxy(profile),
        "talent_score": latest_score.overall if latest_score else None,
        "target_role": target_role,
        "course_catalog": catalog,
        "resolved_target_role": None,
        "skill_gaps": [],
        "covered_skills": [],
        "recommended_courses": [],
        "roadmap": None,
        "salary_estimate_low": None,
        "salary_estimate_high": None,
        "salary_rationale": None,
    }

    with start_agent_trace(
        "candidate_intelligence.career_guidance",
        input_data={"target_role": target_role, "candidate_skills": candidate_skills},
        user_id=str(profile.user_id),
        tags=["candidate-intelligence", "career-guidance"],
    ) as trace:
        try:
            result_state = await get_career_guidance_graph().ainvoke(initial_state)
        except (CareerGuidanceUnavailable, RoadmapGenerationUnavailable) as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
        trace.update(output={"resolved_target_role": result_state.get("resolved_target_role")})

    row = CareerRecommendation(
        candidate_id=profile.id,
        target_role=result_state.get("resolved_target_role") or target_role,
        skill_gaps=result_state.get("skill_gaps", []),
        recommended_courses=result_state.get("recommended_courses", []),
        roadmap=result_state.get("roadmap") or {"stages": []},
        salary_estimate_low=result_state.get("salary_estimate_low"),
        salary_estimate_high=result_state.get("salary_estimate_high"),
        salary_rationale=result_state.get("salary_rationale"),
    )
    db.add(row)

    settings = get_settings()
    career_guidance_input = {"target_role": target_role, "candidate_skills": candidate_skills}
    career_guidance_output = {
        "resolved_target_role": row.target_role,
        "skill_gaps": row.skill_gaps,
        "recommended_courses": row.recommended_courses,
        "roadmap": row.roadmap,
        "salary_estimate_low": row.salary_estimate_low,
        "salary_estimate_high": row.salary_estimate_high,
    }
    db.add(
        AgentRun(
            agent_name="career_guidance_agent",
            subject_type="candidate",
            subject_id=profile.id,
            input_ref=career_guidance_input,
            output=career_guidance_output,
            model_used=settings.llm_model_judgment,
            langfuse_trace_id=trace.trace_id,
        )
    )

    await db.commit()
    await db.refresh(row)
    return _to_career_guidance_response(row)
