"""
Trust & Fraud Prevention Controller.
Handles Certificate Verification, Plagiarism Checking, Duplicate Profile Detection, Authenticity Scores, Flag Reviews, and Dispute Flow.
"""
import asyncio
import uuid
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from packages.db.models import (
    AgentRun,
    AuthenticityScore,
    CandidateProfile,
    Certification,
    Dispute,
    File,
    FraudFlag,
    Submission,
    TrustedIssuer,
    User,
    VerificationRecord,
)
from packages.shared_schemas.fraud import (
    AuthenticityScoreResponse,
    DisputeResponse,
    DisputeReviewAssist,
    DisputeSubmitRequest,
    FlagReviewRequest,
    FraudFlagDetailResponse,
    FraudFlagResponse,
    FraudReviewQueueEntry,
    TrustedIssuerCreateRequest,
    TrustedIssuerResponse,
    TrustedIssuerUpdateRequest,
    VerificationCheckResponse,
)
from services.agents.fraud.cert_graph import get_cert_graph
from services.agents.fraud.content_graph import get_content_graph
from services.agents.fraud.duplicate_graph import get_duplicate_graph
from services.agents.fraud.plagiarism_graph import get_plagiarism_graph
from services.agents.fraud.tools.aggregation import compute_authenticity_score
from services.agents.fraud.tools.dispute_review_llm import (
    DisputeReviewUnavailable,
    summarize_dispute_for_reviewer,
)
from services.agents.fraud.tools.photo_hash import compute_photo_hash
from services.agents.fraud.tools.report_llm import generate_fraud_risk_report
from services.api.core.audit import log_action
from services.api.core.config import get_settings
from services.api.core.db import get_db
from services.api.core.rbac import require_role
from services.api.core.tracing import start_agent_trace
from services.api.modules.candidates.router import _require_consent

router = APIRouter(tags=["Trust & Fraud Prevention"])

_REVIEWER_ROLES = ("admin", "recruiter")


async def _certification_or_404(db: AsyncSession, certification_id: uuid.UUID) -> Certification:
    result = await db.execute(select(Certification).where(Certification.id == certification_id))
    cert = result.scalar_one_or_none()
    if cert is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="certificate_not_found")
    return cert


async def _submission_or_404(db: AsyncSession, submission_id: uuid.UUID) -> Submission:
    result = await db.execute(select(Submission).where(Submission.id == submission_id))
    submission = result.scalar_one_or_none()
    if submission is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="submission_not_found")
    return submission


async def _fetch_trusted_issuers(db: AsyncSession) -> list[dict]:
    """Nodes stay DB-free (this codebase's universal convention) — the router fetches
    the full trusted-issuer registry once per certificate check and passes it into
    `context` for `nodes/issuer_lookup.py` to compare against."""
    result = await db.execute(select(TrustedIssuer))
    return [
        {
            "name": row.name,
            "aliases": row.aliases,
            "verification_url_template": row.verification_url_template,
            "trust_tier": row.trust_tier,
        }
        for row in result.scalars().all()
    ]


async def _candidate_profile_or_404(db: AsyncSession, candidate_id: uuid.UUID) -> CandidateProfile:
    result = await db.execute(select(CandidateProfile).where(CandidateProfile.id == candidate_id))
    profile = result.scalar_one_or_none()
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="candidate_not_found")
    return profile


async def _flag_or_404(db: AsyncSession, flag_id: uuid.UUID) -> FraudFlag:
    result = await db.execute(select(FraudFlag).where(FraudFlag.id == flag_id))
    flag = result.scalar_one_or_none()
    if flag is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="flag_not_found")
    return flag


async def _latest_photo_file(db: AsyncSession, user_id: uuid.UUID) -> File | None:
    result = await db.execute(
        select(File)
        .where(File.owner_user_id == user_id, File.file_type == "photo")
        .order_by(File.uploaded_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


def _profile_text(profile: CandidateProfile) -> str:
    parts = [profile.headline or ""]
    for exp in profile.experience or []:
        if isinstance(exp, dict):
            parts.append(" ".join(str(v) for v in exp.values() if isinstance(v, str)))
    for skill in profile.skills or []:
        if isinstance(skill, dict) and skill.get("name"):
            parts.append(str(skill["name"]))
    return " ".join(p for p in parts if p)


async def _persist_check_result(
    db: AsyncSession,
    *,
    subject_type: str,
    subject_id: uuid.UUID,
    candidate_id: uuid.UUID | None,
    signals: list[dict],
    verdict: dict,
    agent_name: str,
    trace_id: str | None = None,
) -> FraudFlag | None:
    for signal in signals:
        db.add(
            VerificationRecord(
                subject_type=subject_type,
                subject_id=subject_id,
                signal_type=signal["signal_type"],
                signal_score=signal.get("score"),
                confidence_label=signal["confidence_label"],
                evidence={"detail": signal["evidence"]},
            )
        )

    settings = get_settings()
    fraud_input = {"subject_type": subject_type, "subject_id": str(subject_id)}
    fraud_output = {"signals": signals, "verdict": verdict}
    db.add(
        AgentRun(
            agent_name=agent_name,
            subject_type=subject_type,
            subject_id=subject_id,
            input_ref=fraud_input,
            output=fraud_output,
            model_used=settings.llm_model_judgment,
            langfuse_trace_id=trace_id,
        )
    )

    flag: FraudFlag | None = None
    if verdict.get("should_flag"):
        existing = await db.execute(
            select(FraudFlag).where(
                FraudFlag.subject_type == subject_type,
                FraudFlag.subject_id == subject_id,
                FraudFlag.flag_type == verdict["flag_type"],
                FraudFlag.status.in_(("raised", "under_review")),
            )
        )
        flag = existing.scalar_one_or_none()
        if flag is None:
            evidence_items = verdict["evidence"] if isinstance(verdict["evidence"], list) else [verdict["evidence"]]
            report = await generate_fraud_risk_report(verdict["flag_type"], evidence_items)
            flag = FraudFlag(
                subject_type=subject_type,
                subject_id=subject_id,
                candidate_id=candidate_id,
                flag_type=verdict["flag_type"],
                status="raised",
                evidence={
                    "signal_evidence": evidence_items,
                    "confidence_label": verdict["confidence_label"],
                    "report_summary": report["summary"],
                    "report_cited_evidence": report["cited_evidence"],
                },
            )
            db.add(flag)
            await db.flush()

    return flag


@router.post("/verification/certificates/{certification_id}/check", response_model=VerificationCheckResponse)
async def check_certificate(
    certification_id: uuid.UUID,
    user: User = Depends(require_role(*_REVIEWER_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> VerificationCheckResponse:
    cert = await _certification_or_404(db, certification_id)

    image_url = None
    if cert.file_id:
        file_result = await db.execute(select(File).where(File.id == cert.file_id))
        file_row = file_result.scalar_one_or_none()
        image_url = file_row.public_url if file_row else None

    trusted_issuers = await _fetch_trusted_issuers(db)

    initial_state = {
        "subject_type": "certificate",
        "subject_id": str(certification_id),
        "context": {
            "issuer": cert.issuer,
            "title": cert.title,
            "credential_id": cert.credential_id,
            "ocr_confidence": cert.ocr_confidence,
            "certificate_image_url": image_url,
            "trusted_issuers": trusted_issuers,
        },
        "signals": [],
        "verdict": None,
    }
    with start_agent_trace(
        "fraud.cert_verification",
        input_data={"issuer": cert.issuer, "title": cert.title},
        user_id=str(user.id),
        tags=["fraud", "certificate"],
    ) as trace:
        result_state = await get_cert_graph().ainvoke(initial_state)
        trace.update(output=result_state["verdict"])

    flag = await _persist_check_result(
        db,
        subject_type="certificate",
        subject_id=certification_id,
        candidate_id=cert.candidate_id,
        signals=result_state["signals"],
        verdict=result_state["verdict"],
        agent_name="cert_verification_agent",
        trace_id=trace.trace_id,
    )
    await db.commit()
    if flag:
        await db.refresh(flag)

    return VerificationCheckResponse(
        subject_type="certificate",
        subject_id=certification_id,
        signals=result_state["signals"],
        flag=FraudFlagResponse.model_validate(flag) if flag else None,
    )


@router.post("/verification/submissions/{submission_id}/check", response_model=VerificationCheckResponse)
async def check_submission(
    submission_id: uuid.UUID,
    user: User = Depends(require_role(*_REVIEWER_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> VerificationCheckResponse:
    submission = await _submission_or_404(db, submission_id)
    code = (submission.code_or_answers or {}).get("code", "")

    corpus_result = await db.execute(
        select(Submission).where(
            Submission.assessment_id == submission.assessment_id, Submission.id != submission.id
        )
    )
    corpus = [
        (str(row.id), (row.code_or_answers or {}).get("code", ""))
        for row in corpus_result.scalars().all()
        if (row.code_or_answers or {}).get("code")
    ]

    candidate_profile = await _candidate_profile_or_404(db, submission.candidate_id)

    initial_state = {
        "subject_type": "submission",
        "subject_id": str(submission_id),
        "context": {
            "code": code,
            "corpus": corpus,
            "language_hint": "python",
            "candidate_github_username": candidate_profile.github_username,
        },
        "signals": [],
        "verdict": None,
    }
    with start_agent_trace(
        "fraud.plagiarism_detection",
        input_data={"submission_id": str(submission_id), "corpus_size": len(corpus)},
        user_id=str(user.id),
        tags=["fraud", "submission"],
    ) as trace:
        result_state = await get_plagiarism_graph().ainvoke(initial_state)
        trace.update(output=result_state["verdict"])

    flag = await _persist_check_result(
        db,
        subject_type="submission",
        subject_id=submission_id,
        candidate_id=submission.candidate_id,
        signals=result_state["signals"],
        verdict=result_state["verdict"],
        agent_name="plagiarism_detection_agent",
        trace_id=trace.trace_id,
    )
    await db.commit()
    if flag:
        await db.refresh(flag)

    return VerificationCheckResponse(
        subject_type="submission",
        subject_id=submission_id,
        signals=result_state["signals"],
        flag=FraudFlagResponse.model_validate(flag) if flag else None,
    )


@router.post("/verification/profiles/{candidate_id}/duplicate-check", response_model=VerificationCheckResponse)
async def check_profile_duplicate(
    candidate_id: uuid.UUID,
    user: User = Depends(require_role(*_REVIEWER_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> VerificationCheckResponse:
    profile = await _candidate_profile_or_404(db, candidate_id)
    profile_text = _profile_text(profile)

    has_resume_consent = True
    try:
        await _require_consent(db, profile.user_id, "resume_parsing")
    except HTTPException:
        has_resume_consent = False

    has_photo_consent = True
    try:
        await _require_consent(db, profile.user_id, "perceptual_photo_hash")
    except HTTPException:
        has_photo_consent = False

    other_profiles_result = await db.execute(select(CandidateProfile).where(CandidateProfile.id != candidate_id))
    other_profiles = list(other_profiles_result.scalars().all())

    text_corpus: list[tuple[str, str]] = []
    if has_resume_consent:
        text_corpus = [(str(p.id), _profile_text(p)) for p in other_profiles]

    target_photo_hash = None
    photo_corpus: list[tuple[str, str]] = []
    if has_photo_consent:
        photo_file = await _latest_photo_file(db, profile.user_id)
        if photo_file and photo_file.public_url:
            try:
                async with httpx.AsyncClient(timeout=8.0) as client:
                    resp = await client.get(photo_file.public_url)
                # PIL decode + imagehash.phash is CPU-bound — keep it off the event loop.
                target_photo_hash = (
                    await asyncio.to_thread(compute_photo_hash, resp.content)
                    if resp.status_code == 200
                    else None
                )
            except httpx.HTTPError:
                target_photo_hash = None

        if target_photo_hash:
            # One client for the whole corpus (connection reuse) instead of a fresh
            # AsyncClient per candidate; hashing is threaded so the CPU-bound PIL decode
            # doesn't stall the event loop once per corpus entry.
            async with httpx.AsyncClient(timeout=8.0) as client:
                for other in other_profiles:
                    other_photo = await _latest_photo_file(db, other.user_id)
                    if not other_photo or not other_photo.public_url:
                        continue
                    try:
                        other_resp = await client.get(other_photo.public_url)
                        other_hash = (
                            await asyncio.to_thread(compute_photo_hash, other_resp.content)
                            if other_resp.status_code == 200
                            else None
                        )
                    except httpx.HTTPError:
                        other_hash = None
                    if other_hash:
                        photo_corpus.append((str(other.id), other_hash))

    dup_state = {
        "subject_type": "profile",
        "subject_id": str(candidate_id),
        "context": {
            "profile_text": profile_text,
            "text_corpus": text_corpus,
            "photo_hash": target_photo_hash,
            "photo_corpus": photo_corpus,
        },
        "signals": [],
        "verdict": None,
    }
    with start_agent_trace(
        "fraud.duplicate_profile_detection",
        input_data={"candidate_id": str(candidate_id), "text_corpus_size": len(text_corpus), "photo_corpus_size": len(photo_corpus)},
        user_id=str(user.id),
        tags=["fraud", "profile"],
    ) as dup_trace:
        dup_result = await get_duplicate_graph().ainvoke(dup_state)
        dup_trace.update(output=dup_result["verdict"])

    content_state = {
        "subject_type": "resume",
        "subject_id": str(candidate_id),
        "context": {"sections": [s for s in [profile.headline] + [str(e) for e in (profile.experience or [])] if s]},
        "signals": [],
        "verdict": None,
    }
    with start_agent_trace(
        "fraud.ai_content_detection",
        input_data={"candidate_id": str(candidate_id)},
        user_id=str(user.id),
        tags=["fraud", "resume"],
    ) as content_trace:
        content_result = await get_content_graph().ainvoke(content_state)
        content_trace.update(output=content_result["verdict"])

    dup_flag = await _persist_check_result(
        db,
        subject_type="profile",
        subject_id=candidate_id,
        candidate_id=candidate_id,
        signals=dup_result["signals"],
        verdict=dup_result["verdict"],
        agent_name="duplicate_profile_detection_agent",
        trace_id=dup_trace.trace_id,
    )
    await _persist_check_result(
        db,
        subject_type="resume",
        subject_id=candidate_id,
        candidate_id=candidate_id,
        signals=content_result["signals"],
        verdict=content_result["verdict"],
        trace_id=content_trace.trace_id,
        agent_name="ai_content_signal_agent",
    )
    await db.commit()
    if dup_flag:
        await db.refresh(dup_flag)

    all_signals = dup_result["signals"] + content_result["signals"]
    return VerificationCheckResponse(
        subject_type="profile",
        subject_id=candidate_id,
        signals=all_signals,
        flag=FraudFlagResponse.model_validate(dup_flag) if dup_flag else None,
    )


@router.get("/candidates/{candidate_id}/authenticity-score", response_model=AuthenticityScoreResponse)
async def get_authenticity_score(
    candidate_id: uuid.UUID,
    user: User = Depends(require_role("candidate", "recruiter", "admin", "organizer", "judge")),
    db: AsyncSession = Depends(get_db),
) -> AuthenticityScoreResponse:
    profile = await _candidate_profile_or_404(db, candidate_id)
    if user.role == "candidate" and profile.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="cannot_view_other_candidates_score")

    upheld_result = await db.execute(
        select(FraudFlag).where(FraudFlag.candidate_id == candidate_id, FraudFlag.status == "upheld")
    )
    upheld_flags = [{"id": str(f.id), "flag_type": f.flag_type} for f in upheld_result.scalars().all()]

    computed = compute_authenticity_score(upheld_flags)
    score_row = AuthenticityScore(candidate_id=candidate_id, score=computed["score"], components=computed["components"])
    db.add(score_row)
    await db.commit()
    await db.refresh(score_row)
    return AuthenticityScoreResponse.model_validate(score_row)


@router.get("/candidates/{candidate_id}/flags", response_model=list[FraudFlagResponse])
async def get_candidate_flags(
    candidate_id: uuid.UUID,
    user: User = Depends(require_role("candidate", "recruiter", "admin", "organizer", "judge")),
    db: AsyncSession = Depends(get_db),
) -> list[FraudFlag]:
    profile = await _candidate_profile_or_404(db, candidate_id)
    if user.role == "candidate" and profile.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="cannot_view_other_candidates_flags")

    result = await db.execute(
        select(FraudFlag).where(FraudFlag.candidate_id == candidate_id).order_by(FraudFlag.raised_at.desc())
    )
    return list(result.scalars().all())


@router.post("/flags/{flag_id}/dispute", response_model=DisputeResponse)
async def dispute_flag(
    flag_id: uuid.UUID,
    body: DisputeSubmitRequest,
    user: User = Depends(require_role("candidate")),
    db: AsyncSession = Depends(get_db),
) -> Dispute:
    flag = await _flag_or_404(db, flag_id)
    profile_result = await db.execute(select(CandidateProfile).where(CandidateProfile.user_id == user.id))
    profile = profile_result.scalar_one_or_none()
    if profile is None or flag.candidate_id != profile.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="not_your_flag")
    if flag.status not in ("raised", "under_review"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="flag_already_resolved")

    dispute = Dispute(
        fraud_flag_id=flag_id,
        candidate_id=profile.id,
        candidate_statement=body.candidate_statement,
        supporting_files=[str(f) for f in body.supporting_files],
    )
    db.add(dispute)
    flag.status = "under_review"
    await db.commit()
    await db.refresh(dispute)
    return dispute


@router.get("/admin/fraud-review-queue", response_model=list[FraudReviewQueueEntry])
async def fraud_review_queue(
    user: User = Depends(require_role(*_REVIEWER_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> list[FraudReviewQueueEntry]:
    result = await db.execute(
        select(FraudFlag).where(FraudFlag.status.in_(("raised", "under_review"))).order_by(FraudFlag.raised_at.desc())
    )
    flags = list(result.scalars().all())

    candidate_ids = [f.candidate_id for f in flags if f.candidate_id]
    profiles_result = await db.execute(select(CandidateProfile).where(CandidateProfile.id.in_(candidate_ids)))
    profiles_by_id = {p.id: p for p in profiles_result.scalars().all()}

    flag_ids = [f.id for f in flags]
    disputes_result = await db.execute(select(Dispute.fraud_flag_id).where(Dispute.fraud_flag_id.in_(flag_ids)))
    flag_ids_with_disputes = {row[0] for row in disputes_result.all()}

    entries: list[FraudReviewQueueEntry] = []
    for flag in flags:
        profile = profiles_by_id.get(flag.candidate_id) if flag.candidate_id else None
        entries.append(
            FraudReviewQueueEntry(
                flag=FraudFlagResponse.model_validate(flag),
                candidate_headline=profile.headline if profile else None,
                candidate_github_username=profile.github_username if profile else None,
                has_dispute=flag.id in flag_ids_with_disputes,
            )
        )
    return entries


@router.get("/flags/{flag_id}", response_model=FraudFlagDetailResponse)
async def get_flag_detail(
    flag_id: uuid.UUID,
    user: User = Depends(require_role(*_REVIEWER_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> FraudFlagDetailResponse:
    flag = await _flag_or_404(db, flag_id)

    dispute_result = await db.execute(
        select(Dispute).where(Dispute.fraud_flag_id == flag_id).order_by(Dispute.submitted_at.desc()).limit(1)
    )
    dispute = dispute_result.scalar_one_or_none()

    assist = DisputeReviewAssist(available=False)
    if dispute is not None:
        try:
            summary = await summarize_dispute_for_reviewer(flag.evidence, dispute.candidate_statement or "")
            assist = DisputeReviewAssist(
                available=True,
                candidate_context_summary=summary["candidate_context_summary"],
                points_of_agreement_or_conflict=summary["points_of_agreement_or_conflict"],
            )
        except DisputeReviewUnavailable:
            assist = DisputeReviewAssist(available=False)

    return FraudFlagDetailResponse(
        flag=FraudFlagResponse.model_validate(flag),
        dispute=DisputeResponse.model_validate(dispute) if dispute else None,
        dispute_review_assist=assist,
    )


@router.patch("/flags/{flag_id}/review", response_model=FraudFlagResponse)
async def review_flag(
    flag_id: uuid.UUID,
    body: FlagReviewRequest,
    user: User = Depends(require_role(*_REVIEWER_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> FraudFlag:
    if body.status not in ("upheld", "dismissed"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="invalid_review_status")

    flag = await _flag_or_404(db, flag_id)

    if body.status == "upheld" and not (body.review_notes and body.review_notes.strip()):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="review_notes_required_for_upheld",
        )

    flag.status = body.status
    flag.review_notes = body.review_notes
    flag.reviewed_by = user.id
    flag.reviewed_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(flag)
    return flag


# --- Trusted issuer registry (FR-1) — admin-only management of the known-issuer table
# that `services/agents/fraud/tools/issuer_lookup.py` checks certificates against. ---


async def _trusted_issuer_or_404(db: AsyncSession, issuer_id: uuid.UUID) -> TrustedIssuer:
    result = await db.execute(select(TrustedIssuer).where(TrustedIssuer.id == issuer_id))
    issuer = result.scalar_one_or_none()
    if issuer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="trusted_issuer_not_found")
    return issuer


@router.get("/admin/trusted-issuers", response_model=list[TrustedIssuerResponse])
async def list_trusted_issuers(
    admin: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> list[TrustedIssuer]:
    result = await db.execute(select(TrustedIssuer).order_by(TrustedIssuer.name))
    return list(result.scalars().all())


@router.post("/admin/trusted-issuers", response_model=TrustedIssuerResponse, status_code=status.HTTP_201_CREATED)
async def create_trusted_issuer(
    body: TrustedIssuerCreateRequest,
    admin: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> TrustedIssuer:
    if body.trust_tier not in ("platform", "university", "employer", "community"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="invalid_trust_tier")

    existing = await db.execute(select(TrustedIssuer).where(TrustedIssuer.name == body.name))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="trusted_issuer_already_exists")

    issuer = TrustedIssuer(
        name=body.name,
        aliases=body.aliases,
        verification_url_template=body.verification_url_template,
        trust_tier=body.trust_tier,
        notes=body.notes,
        added_by_user_id=admin.id,
    )
    db.add(issuer)
    await log_action(
        db,
        actor_user_id=admin.id,
        action="trusted_issuer_added",
        target_type="trusted_issuer",
        target_id=issuer.id,
    )
    await db.commit()
    await db.refresh(issuer)
    return issuer


@router.patch("/admin/trusted-issuers/{issuer_id}", response_model=TrustedIssuerResponse)
async def update_trusted_issuer(
    issuer_id: uuid.UUID,
    body: TrustedIssuerUpdateRequest,
    admin: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> TrustedIssuer:
    issuer = await _trusted_issuer_or_404(db, issuer_id)

    if body.trust_tier is not None and body.trust_tier not in ("platform", "university", "employer", "community"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="invalid_trust_tier")

    if body.name is not None:
        issuer.name = body.name
    if body.aliases is not None:
        issuer.aliases = body.aliases
    if body.verification_url_template is not None:
        issuer.verification_url_template = body.verification_url_template
    if body.trust_tier is not None:
        issuer.trust_tier = body.trust_tier
    if body.notes is not None:
        issuer.notes = body.notes

    await log_action(
        db,
        actor_user_id=admin.id,
        action="trusted_issuer_updated",
        target_type="trusted_issuer",
        target_id=issuer.id,
    )
    await db.commit()
    await db.refresh(issuer)
    return issuer


@router.delete("/admin/trusted-issuers/{issuer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_trusted_issuer(
    issuer_id: uuid.UUID,
    admin: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> None:
    issuer = await _trusted_issuer_or_404(db, issuer_id)
    await log_action(
        db,
        actor_user_id=admin.id,
        action="trusted_issuer_removed",
        target_type="trusted_issuer",
        target_id=issuer.id,
    )
    await db.delete(issuer)
    await db.commit()
