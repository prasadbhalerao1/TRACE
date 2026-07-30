"""
Candidate Controller & Intelligence Endpoints.
Handles Candidate Profile Ingestion, Talent Score™ Calculation, GitHub Sync, and Career Guidance.
"""
import re
import secrets
import time
from dataclasses import asdict
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from fastapi.responses import RedirectResponse
from github import Github
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

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
    TalentScore,
    User,
)
from packages.shared_schemas.candidates import (
    BadgeResponse,
    CandidateProfileResponse,
    CareerGuidanceResponse,
    CoverLetterGenerateRequest,
    DashboardResponse,
    GeneratedDocumentResponse,
    PortfolioPublishRequest,
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
from services.api.core.tracing import record_agent_trace

_CAREER_RECOMMENDATION_TTL = timedelta(hours=24)
_GITHUB_OAUTH_STATE_TTL_SECONDS = 600
_oauth_state_cache: dict[str, tuple[str, float]] = {}

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
    if result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=f"consent_required:{consent_type}"
        )


async def _run_ingestion_and_persist(
    db: AsyncSession, profile: CandidateProfile, state_overrides: dict
) -> CandidateProfile:
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
        "sub_scores": {},
        "overall_score": None,
        "renormalized_subscores": [],
        "badges": [],
        **state_overrides,
    }

    result_state = await get_graph().ainvoke(initial_state)

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
            overall=result_state["overall_score"],
            renormalized_subscores=result_state["renormalized_subscores"],
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
                langfuse_trace_id=record_agent_trace(
                    "talent_scoring_agent", talent_scoring_input, talent_scoring_output, settings.llm_model_judgment
                ),
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
    user: User = Depends(require_role("candidate")),
    db: AsyncSession = Depends(get_db),
) -> CandidateProfile:
    await _require_consent(db, user.id, "resume_parsing")
    profile = await _get_or_create_profile(db, user)
    file_bytes = await file.read()
    return await _run_ingestion_and_persist(
        db,
        profile,
        {"raw_resume_bytes": file_bytes, "raw_resume_content_type": file.content_type},
    )


@router.post("/me/ingest/certificate", response_model=CandidateProfileResponse)
async def ingest_certificate(
    file: UploadFile,
    user: User = Depends(require_role("candidate")),
    db: AsyncSession = Depends(get_db),
) -> CandidateProfile:
    profile = await _get_or_create_profile(db, user)
    file_bytes = await file.read()
    return await _run_ingestion_and_persist(db, profile, {"certificate_file_bytes": file_bytes})


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

    github_username = Github(login_or_token=access_token).get_user().login

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one()
    profile = await _get_or_create_profile(db, user)
    profile.github_username = github_username
    await db.commit()

    await _run_ingestion_and_persist(
        db, profile, {"github_username": github_username, "github_access_token": access_token}
    )
    return RedirectResponse(f"{settings.frontend_url}/profile/edit?github=connected")


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

    return DashboardResponse(
        profile=CandidateProfileResponse.model_validate(profile),
        latest_score=scores[-1] if scores else None,
        score_history=scores,
        badges=badges,
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

    result_state = await get_resume_graph().ainvoke(initial_state)
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
            langfuse_trace_id=record_agent_trace(
                "fact_check_agent", fact_check_input, fact_check_output, settings.llm_model_fast
            ),
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
        pdf_bytes = render_resume_pdf(doc_row.content)
    except PdfGenerationUnavailable as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    try:
        public_url, storage_key = upload_file(
            pdf_bytes, public_id=f"resumes/{profile.id}/{doc_row.id}", resource_type="raw"
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
    username = body.username.strip().lower()
    if not _USERNAME_PATTERN.match(username) or username in _RESERVED_USERNAMES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="invalid_username")

    profile = await _get_or_create_profile(db, user)
    existing = await db.execute(
        select(CandidateProfile).where(
            CandidateProfile.username == username, CandidateProfile.id != profile.id
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="username_taken")

    profile.username = username
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

    try:
        result_state = await get_career_guidance_graph().ainvoke(initial_state)
    except (CareerGuidanceUnavailable, RoadmapGenerationUnavailable) as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

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
            langfuse_trace_id=record_agent_trace(
                "career_guidance_agent", career_guidance_input, career_guidance_output, settings.llm_model_judgment
            ),
        )
    )

    await db.commit()
    await db.refresh(row)
    return _to_career_guidance_response(row)
