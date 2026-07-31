"""
Assessment Controller.
Handles Skill Verification Assessments, Live AI Interviewer Sessions & Reports, and Team Contribution Analytics.
"""
import base64
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from github import Github
from github.GithubException import GithubException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from packages.db.models import (
    AgentRun,
    Assessment,
    CandidateProfile,
    Consent,
    ContributionReport,
    InterviewDefinition,
    InterviewReport,
    InterviewSession,
    InterviewTranscriptTurn,
    Submission,
    User,
)
from packages.shared_schemas.assessment import (
    AssessmentCreateRequest,
    AssessmentResponse,
    ContributionReportGenerateRequest,
    ContributionReportResponse,
    GenerateDefinitionQuestionsRequest,
    GenerateDefinitionQuestionsResponse,
    InterviewAnswerRequest,
    InterviewDefinitionAttemptResponse,
    InterviewDefinitionCreateRequest,
    InterviewDefinitionQuestion,
    InterviewDefinitionResponse,
    InterviewDefinitionUpdateRequest,
    InterviewReportWithTranscriptResponse,
    InterviewSessionResponse,
    InterviewStartRequest,
    InterviewTurnResponse,
    SubmissionRequest,
    SubmissionResponse,
)
from services.agents.assessment.contribution_graph import get_contribution_graph
from services.agents.assessment.interview_definition_graph import get_interview_definition_graph
from services.agents.assessment.interview_graph import get_interview_graph
from services.agents.assessment.interview_report_graph import get_interview_report_graph
from services.agents.assessment.state import ContributionState, DefinitionQuestionState, InterviewReportState, InterviewState, VerificationState
from services.agents.assessment.tools.llm_review import AssessmentUnavailable
from services.agents.assessment.tools.interview_llm import generate_definition_questions
from services.agents.assessment.verification_graph import get_verification_graph
from services.api.core.config import get_settings
from services.api.core.db import get_db
from services.api.core.rbac import require_role
from services.api.core.tracing import start_agent_trace
from services.api.modules.candidates.router import _get_or_create_profile, _require_consent

router = APIRouter(tags=["Assessments & Verification"])


def _candidate_profile_summary(profile: CandidateProfile) -> str:
    skills = ", ".join(s.get("name", "") for s in (profile.skills or []) if s.get("name"))
    parts = []
    if profile.headline:
        parts.append(profile.headline)
    if skills:
        parts.append(f"Skills: {skills}")
    if profile.location:
        parts.append(f"Location: {profile.location}")
    return " | ".join(parts) or "No profile details available."


def _fetch_repo_sample_source(repo_full_name: str, max_size: int = 20_000) -> str:
    client = Github(retry=None)
    try:
        repo = client.get_repo(repo_full_name)
        contents = repo.get_contents("")
        for item in contents:
            if item.path.endswith(".py") and item.size < max_size:
                return base64.b64decode(item.content).decode("utf-8", errors="ignore")
    except (GithubException, UnicodeDecodeError):
        pass
    return ""


@router.post("/assessments", response_model=AssessmentResponse, status_code=status.HTTP_201_CREATED)
async def create_assessment(
    body: AssessmentCreateRequest,
    user: User = Depends(require_role("recruiter")),
    db: AsyncSession = Depends(get_db),
) -> Assessment:
    assessment = Assessment(
        job_id=body.job_id, candidate_id=body.candidate_id, type=body.type, spec=body.spec
    )
    db.add(assessment)
    await db.commit()
    await db.refresh(assessment)
    return assessment


@router.get("/assessments/mine", response_model=list[AssessmentResponse])
async def list_my_assessments(
    user: User = Depends(require_role("candidate")),
    db: AsyncSession = Depends(get_db),
) -> list[Assessment]:
    profile = await _get_or_create_profile(db, user)
    result = await db.execute(
        select(Assessment)
        .where(Assessment.candidate_id == profile.id)
        .order_by(Assessment.created_at.desc())
    )
    return list(result.scalars().all())


@router.get("/assessments/{assessment_id}", response_model=AssessmentResponse)
async def get_assessment(
    assessment_id: uuid.UUID,
    user: User = Depends(require_role("candidate")),
    db: AsyncSession = Depends(get_db),
) -> Assessment:
    result = await db.execute(select(Assessment).where(Assessment.id == assessment_id))
    assessment = result.scalar_one_or_none()
    if assessment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="assessment_not_found")
    return assessment


@router.post("/assessments/{assessment_id}/submit", response_model=SubmissionResponse)
async def submit_assessment(
    assessment_id: uuid.UUID,
    body: SubmissionRequest,
    user: User = Depends(require_role("candidate")),
    db: AsyncSession = Depends(get_db),
) -> Submission:
    await _require_consent(db, user.id, "ai_assessment")
    profile = await _get_or_create_profile(db, user)

    result = await db.execute(select(Assessment).where(Assessment.id == assessment_id))
    assessment = result.scalar_one_or_none()
    if assessment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="assessment_not_found")

    code_or_answers = dict(body.code_or_answers)
    if assessment.type == "project_analysis":
        repo_full_name = code_or_answers.get("repo_full_name", "")
        code_or_answers["code"] = _fetch_repo_sample_source(repo_full_name) if repo_full_name else ""

    initial_state: VerificationState = {
        "assessment_type": assessment.type,
        "spec": assessment.spec or {},
        "code_or_answers": code_or_answers,
        "test_results": [r.model_dump() for r in body.test_results],
        "static_analysis": {},
        "tests_passed": 0,
        "tests_total": 0,
        "grading_rationale": None,
        "llm_review": None,
        "score": None,
    }

    with start_agent_trace(
        "assessment.verification",
        input_data={"assessment_type": assessment.type},
        user_id=str(user.id),
        tags=["assessment", "verification"],
    ) as trace:
        try:
            result_state = await get_verification_graph().ainvoke(initial_state)
        except AssessmentUnavailable as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
        trace.update(output={"score": result_state["score"], "tests_passed": result_state["tests_passed"]})

    submission = Submission(
        assessment_id=assessment.id,
        candidate_id=profile.id,
        code_or_answers=body.code_or_answers,
        test_results={"results": [r.model_dump() for r in body.test_results], "rationale": result_state["grading_rationale"]},
        static_analysis=result_state["static_analysis"],
        llm_review=result_state["llm_review"],
        score=result_state["score"],
    )
    db.add(submission)
    await db.flush()

    settings = get_settings()
    verification_input = {"assessment_type": assessment.type, "tests_total": result_state["tests_total"]}
    verification_output = {"score": result_state["score"], "tests_passed": result_state["tests_passed"]}
    db.add(
        AgentRun(
            agent_name="verification_report_agent",
            subject_type="submission",
            subject_id=submission.id,
            input_ref=verification_input,
            output=verification_output,
            model_used=settings.llm_model_judgment,
            langfuse_trace_id=trace.trace_id,
        )
    )
    await db.commit()
    await db.refresh(submission)
    return submission


@router.get("/submissions/{submission_id}", response_model=SubmissionResponse)
async def get_submission(
    submission_id: uuid.UUID,
    user: User = Depends(require_role("recruiter")),
    db: AsyncSession = Depends(get_db),
) -> Submission:
    result = await db.execute(select(Submission).where(Submission.id == submission_id))
    submission = result.scalar_one_or_none()
    if submission is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="submission_not_found")
    return submission


def _default_topic_plan(profile: CandidateProfile) -> list[str]:
    skills = [s.get("name") for s in (profile.skills or []) if s.get("name")]
    return skills[:4] if skills else ["general software engineering experience"]


async def _definition_owned_by(db: AsyncSession, definition_id: uuid.UUID, user: User) -> InterviewDefinition:
    result = await db.execute(select(InterviewDefinition).where(InterviewDefinition.id == definition_id))
    definition = result.scalar_one_or_none()
    if definition is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="interview_definition_not_found")
    if definition.created_by_user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="not_your_interview_definition")
    return definition


@router.post("/interview-definitions/generate-questions", response_model=GenerateDefinitionQuestionsResponse)
async def generate_definition_questions_endpoint(
    body: GenerateDefinitionQuestionsRequest,
    user: User = Depends(require_role("recruiter", "candidate")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Generate interview topics from role/JD context without persisting. Recruiters use this to create definitions; candidates use it for practice interviews."""
    initial_state: DefinitionQuestionState = {
        "role_title": body.role_title,
        "job_description": body.job_description,
        "years_experience": body.years_experience,
        "question_count": body.question_count,
        "topics": [],
    }

    with start_agent_trace(
        "assessment.interview.definition_questions",
        input_data={"role_title": body.role_title, "question_count": body.question_count},
        user_id=str(user.id),
        tags=["assessment", "interview", "definition"],
    ) as trace:
        try:
            result_state = await get_interview_definition_graph().ainvoke(initial_state)
        except AssessmentUnavailable as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
        trace.update(output={"topics": result_state["topics"]})

    questions = [
        InterviewDefinitionQuestion(id=str(i), topic=topic)
        for i, topic in enumerate(result_state["topics"])
    ]
    return {"questions": questions}


@router.post("/interview-definitions", response_model=InterviewDefinitionResponse, status_code=status.HTTP_201_CREATED)
async def create_interview_definition(
    body: InterviewDefinitionCreateRequest,
    user: User = Depends(require_role("recruiter")),
    db: AsyncSession = Depends(get_db),
) -> InterviewDefinition:
    """Persist a new interview definition."""
    definition = InterviewDefinition(
        created_by_user_id=user.id,
        title=body.title,
        role_title=body.role_title,
        job_description=body.job_description,
        years_experience=body.years_experience,
        questions=[q.model_dump() for q in body.questions],
        question_count=len(body.questions),
        duration_minutes=body.duration_minutes,
        is_active=True,
    )
    db.add(definition)
    await db.commit()
    await db.refresh(definition)
    return definition


@router.get("/interview-definitions/mine", response_model=list[InterviewDefinitionResponse])
async def list_my_interview_definitions(
    user: User = Depends(require_role("recruiter")),
    db: AsyncSession = Depends(get_db),
) -> list[InterviewDefinition]:
    """List interview definitions created by the recruiter."""
    result = await db.execute(
        select(InterviewDefinition)
        .where(InterviewDefinition.created_by_user_id == user.id)
        .order_by(InterviewDefinition.created_at.desc())
    )
    return list(result.scalars().all())


@router.get("/interview-definitions/open", response_model=list[InterviewDefinitionResponse])
async def list_open_interview_definitions(
    user: User = Depends(require_role("candidate")),
    db: AsyncSession = Depends(get_db),
) -> list[InterviewDefinition]:
    """Browse open interview definitions (candidates)."""
    result = await db.execute(
        select(InterviewDefinition)
        .where(InterviewDefinition.is_active == True)
        .order_by(InterviewDefinition.created_at.desc())
    )
    return list(result.scalars().all())


@router.patch("/interview-definitions/{definition_id}", response_model=InterviewDefinitionResponse)
async def update_interview_definition(
    definition_id: uuid.UUID,
    body: InterviewDefinitionUpdateRequest,
    user: User = Depends(require_role("recruiter")),
    db: AsyncSession = Depends(get_db),
) -> InterviewDefinition:
    """Update an interview definition (ownership-checked)."""
    definition = await _definition_owned_by(db, definition_id, user)

    if body.title is not None:
        definition.title = body.title
    if body.questions is not None:
        definition.questions = [q.model_dump() for q in body.questions]
        definition.question_count = len(body.questions)
    if body.duration_minutes is not None:
        definition.duration_minutes = body.duration_minutes
    if body.is_active is not None:
        definition.is_active = body.is_active

    await db.commit()
    await db.refresh(definition)
    return definition


@router.get("/interview-definitions/{definition_id}/attempts", response_model=list[InterviewDefinitionAttemptResponse])
async def list_interview_definition_attempts(
    definition_id: uuid.UUID,
    user: User = Depends(require_role("recruiter")),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """List all interview attempts for a definition (ownership-checked)."""
    definition = await _definition_owned_by(db, definition_id, user)

    result = await db.execute(
        select(InterviewSession, CandidateProfile)
        .join(CandidateProfile, InterviewSession.candidate_id == CandidateProfile.id)
        .where(InterviewSession.interview_definition_id == definition_id)
        .order_by(InterviewSession.started_at.desc())
    )

    attempts = []
    for session, profile in result.all():
        # Check if a report exists
        report_result = await db.execute(
            select(InterviewReport).where(InterviewReport.session_id == session.id)
        )
        has_report = report_result.scalar_one_or_none() is not None

        attempts.append({
            "session_id": session.id,
            "candidate_id": profile.id,
            "candidate_name": profile.full_name,
            "status": session.status,
            "started_at": session.started_at,
            "ended_at": session.ended_at,
            "has_report": has_report,
        })

    return attempts


@router.post("/interview-sessions", response_model=InterviewTurnResponse, status_code=status.HTTP_201_CREATED)
async def start_interview(
    body: InterviewStartRequest,
    user: User = Depends(require_role("candidate")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(
        select(Consent).where(
            Consent.candidate_id == user.id, Consent.consent_type == "ai_interview", Consent.status == "granted"
        )
    )
    consent = result.scalar_one_or_none()
    if consent is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="consent_required:ai_interview")

    profile = await _get_or_create_profile(db, user)

    # Derive topic_plan and job_context from definition if provided
    job_context = None
    if body.interview_definition_id:
        def_result = await db.execute(select(InterviewDefinition).where(InterviewDefinition.id == body.interview_definition_id))
        definition = def_result.scalar_one_or_none()
        if definition is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="interview_definition_not_found")
        topic_plan = [q["topic"] for q in definition.questions]
        job_context = {
            "role_title": definition.role_title,
            "job_description": definition.job_description,
            "years_experience": definition.years_experience,
        }
    else:
        topic_plan = body.topic_plan or _default_topic_plan(profile)

    session = InterviewSession(
        candidate_id=profile.id,
        job_id=body.job_id,
        interview_definition_id=body.interview_definition_id,
        consent_id=consent.consent_id,
        state={
            "topic_plan": topic_plan,
            "current_topic_idx": 0,
            "transcript": [],
            "per_topic_scores": {},
            "follow_up_count_this_topic": 0,
            "job_context": job_context,
        },
    )
    db.add(session)
    await db.flush()

    initial_state: InterviewState = {
        "session_id": str(session.id),
        "candidate_id": str(profile.id),
        "mode": "start",
        "candidate_profile_summary": _candidate_profile_summary(profile),
        "job_context": job_context,
        "topic_plan": topic_plan,
        "current_topic_idx": 0,
        "transcript": [],
        "per_topic_scores": {},
        "follow_up_count_this_topic": 0,
        "next_question": None,
        "interview_status": "in_progress",
        "last_answer_verdict": None,
    }
    with start_agent_trace(
        "assessment.interview.start",
        input_data={"topic_plan": topic_plan},
        user_id=str(user.id),
        session_id=str(session.id),
        tags=["assessment", "interview"],
    ) as trace:
        try:
            result_state = await get_interview_graph().ainvoke(initial_state)
        except AssessmentUnavailable as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
        trace.update(output={"question": result_state["next_question"]})

    session.state = {
        "topic_plan": result_state["topic_plan"],
        "current_topic_idx": result_state["current_topic_idx"],
        "transcript": result_state["transcript"],
        "per_topic_scores": result_state["per_topic_scores"],
        "follow_up_count_this_topic": result_state["follow_up_count_this_topic"],
    }
    db.add(
        InterviewTranscriptTurn(session_id=session.id, turn_index=0, role="agent", text=result_state["next_question"])
    )
    await db.commit()

    return {
        "session_id": session.id,
        "question": result_state["next_question"],
        "topics_remaining": len(topic_plan) - result_state["current_topic_idx"],
        "status": result_state["interview_status"],
    }


@router.post("/interview-sessions/{session_id}/turn", response_model=InterviewTurnResponse)
async def interview_turn(
    session_id: uuid.UUID,
    body: InterviewAnswerRequest,
    user: User = Depends(require_role("candidate")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(select(InterviewSession).where(InterviewSession.id == session_id))
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="interview_session_not_found")
    if session.status != "in_progress":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="interview_session_not_in_progress")

    profile_result = await db.execute(select(CandidateProfile).where(CandidateProfile.id == session.candidate_id))
    profile = profile_result.scalar_one()

    saved = session.state or {}
    transcript = [*saved.get("transcript", []), {"role": "candidate", "text": body.answer_text}]

    initial_state: InterviewState = {
        "session_id": str(session.id),
        "candidate_id": str(session.candidate_id),
        "mode": "turn",
        "candidate_profile_summary": _candidate_profile_summary(profile),
        "job_context": saved.get("job_context"),
        "topic_plan": saved.get("topic_plan", []),
        "current_topic_idx": saved.get("current_topic_idx", 0),
        "transcript": transcript,
        "per_topic_scores": saved.get("per_topic_scores", {}),
        "follow_up_count_this_topic": saved.get("follow_up_count_this_topic", 0),
        "next_question": None,
        "interview_status": "in_progress",
        "last_answer_verdict": None,
    }
    with start_agent_trace(
        "assessment.interview.turn",
        input_data={"answer_text": body.answer_text},
        user_id=str(user.id),
        session_id=str(session.id),
        tags=["assessment", "interview"],
    ) as trace:
        try:
            result_state = await get_interview_graph().ainvoke(initial_state)
        except AssessmentUnavailable as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
        trace.update(output={"question": result_state["next_question"], "status": result_state["interview_status"]})

    session.state = {
        "topic_plan": result_state["topic_plan"],
        "current_topic_idx": result_state["current_topic_idx"],
        "transcript": result_state["transcript"],
        "per_topic_scores": result_state["per_topic_scores"],
        "follow_up_count_this_topic": result_state["follow_up_count_this_topic"],
        "job_context": result_state.get("job_context"),
    }

    existing_turns = await db.execute(
        select(InterviewTranscriptTurn.turn_index).where(InterviewTranscriptTurn.session_id == session.id)
    )
    next_index = max((row[0] for row in existing_turns.all()), default=-1) + 1
    db.add(InterviewTranscriptTurn(session_id=session.id, turn_index=next_index, role="candidate", text=body.answer_text))
    if result_state["next_question"]:
        db.add(
            InterviewTranscriptTurn(
                session_id=session.id, turn_index=next_index + 1, role="agent", text=result_state["next_question"]
            )
        )

    if result_state["interview_status"] == "completed":
        session.status = "completed"
        session.ended_at = datetime.now(timezone.utc)

    await db.commit()

    return {
        "session_id": session.id,
        "question": result_state["next_question"],
        "topics_remaining": len(result_state["topic_plan"]) - result_state["current_topic_idx"],
        "status": result_state["interview_status"],
    }


@router.post("/interview-sessions/{session_id}/end", response_model=InterviewReportWithTranscriptResponse)
async def end_interview(
    session_id: uuid.UUID,
    user: User = Depends(require_role("candidate")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(select(InterviewSession).where(InterviewSession.id == session_id))
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="interview_session_not_found")

    saved = session.state or {}
    report_state: InterviewReportState = {
        "transcript": saved.get("transcript", []),
        "per_topic_scores": saved.get("per_topic_scores", {}),
        "topic_plan": saved.get("topic_plan", []),
        "response_confidence_signal": None,
        "technical_rating": None,
        "communication_rating": None,
        "hiring_recommendation": None,
    }
    with start_agent_trace(
        "assessment.interview.report",
        input_data={"topic_count": len(saved.get("topic_plan", []))},
        user_id=str(user.id),
        session_id=str(session.id),
        tags=["assessment", "interview"],
    ) as trace:
        try:
            result_state = await get_interview_report_graph().ainvoke(report_state)
        except AssessmentUnavailable as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
        trace.update(output=dict(result_state))

    if session.status != "completed":
        session.status = "completed"
        session.ended_at = datetime.now(timezone.utc)

    report = InterviewReport(
        session_id=session.id,
        response_confidence_signal=result_state["response_confidence_signal"],
        technical_rating=result_state["technical_rating"],
        communication_rating=result_state["communication_rating"],
        hiring_recommendation=result_state["hiring_recommendation"],
    )
    db.add(report)

    settings = get_settings()
    interview_input = {"topic_count": len(saved.get("topic_plan", []))}
    interview_output = dict(result_state)
    db.add(
        AgentRun(
            agent_name="interview_report_agent",
            subject_type="interview_session",
            subject_id=session.id,
            input_ref=interview_input,
            output=interview_output,
            model_used=settings.llm_model_judgment,
            langfuse_trace_id=trace.trace_id,
        )
    )
    await db.commit()
    await db.refresh(report)

    transcript_result = await db.execute(
        select(InterviewTranscriptTurn)
        .where(InterviewTranscriptTurn.session_id == session.id)
        .order_by(InterviewTranscriptTurn.turn_index)
    )
    transcript_rows = transcript_result.scalars().all()

    return {
        "id": report.id,
        "session_id": report.session_id,
        "response_confidence_signal": report.response_confidence_signal,
        "technical_rating": report.technical_rating,
        "communication_rating": report.communication_rating,
        "hiring_recommendation": report.hiring_recommendation,
        "generated_at": report.generated_at,
        "transcript": transcript_rows,
    }


@router.get("/interview-sessions/{session_id}/report", response_model=InterviewReportWithTranscriptResponse)
async def get_interview_report(
    session_id: uuid.UUID,
    user: User = Depends(require_role("recruiter")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(
        select(InterviewReport).where(InterviewReport.session_id == session_id).order_by(InterviewReport.generated_at.desc())
    )
    report = result.scalars().first()
    if report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="interview_report_not_found")

    transcript_result = await db.execute(
        select(InterviewTranscriptTurn)
        .where(InterviewTranscriptTurn.session_id == session_id)
        .order_by(InterviewTranscriptTurn.turn_index)
    )
    return {
        "id": report.id,
        "session_id": report.session_id,
        "response_confidence_signal": report.response_confidence_signal,
        "technical_rating": report.technical_rating,
        "communication_rating": report.communication_rating,
        "hiring_recommendation": report.hiring_recommendation,
        "generated_at": report.generated_at,
        "transcript": transcript_result.scalars().all(),
    }


@router.post("/contribution-reports/generate", response_model=list[ContributionReportResponse])
async def generate_contribution_report(
    body: ContributionReportGenerateRequest,
    user: User = Depends(require_role("recruiter")),
    db: AsyncSession = Depends(get_db),
) -> list[ContributionReport]:
    initial_state: ContributionState = {
        "repo_full_name": body.repo_full_name,
        "github_usernames": body.github_usernames,
        "access_token": None,
        "raw_stats": {},
        "shares": {},
        "narratives": {},
        "results": [],
    }
    with start_agent_trace(
        "assessment.contribution_report",
        input_data={"repo_full_name": body.repo_full_name, "member_count": len(body.github_usernames)},
        user_id=str(user.id),
        tags=["assessment", "contribution"],
    ) as trace:
        try:
            result_state = await get_contribution_graph().ainvoke(initial_state)
        except AssessmentUnavailable as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
        trace.update(output={"results": result_state["results"]})

    profiles_result = await db.execute(
        select(CandidateProfile).where(CandidateProfile.github_username.in_(body.github_usernames))
    )
    profile_by_username = {p.github_username: p for p in profiles_result.scalars().all()}

    rows: list[ContributionReport] = []
    for r in result_state["results"]:
        matched_profile = profile_by_username.get(r["github_username"])
        row = ContributionReport(
            repo_full_name=body.repo_full_name,
            candidate_id=matched_profile.id if matched_profile else None,
            github_username=r["github_username"],
            contribution_share=r["contribution_share"],
            commits=r["commits"],
            lines_survived=r["lines_survived"],
            prs_opened=r["prs_opened"],
            prs_reviewed=r["prs_reviewed"],
            anomaly_note=r["anomaly_note"],
        )
        db.add(row)
        rows.append(row)

    settings = get_settings()
    contribution_input = {"repo_full_name": body.repo_full_name, "member_count": len(body.github_usernames)}
    contribution_output = {"results": result_state["results"]}
    db.add(
        AgentRun(
            agent_name="contribution_weighting_agent",
            subject_type="repo",
            subject_id=uuid.uuid5(uuid.NAMESPACE_URL, body.repo_full_name),
            input_ref=contribution_input,
            output=contribution_output,
            model_used=settings.embedding_model,
            langfuse_trace_id=trace.trace_id,
        )
    )
    await db.commit()
    for row in rows:
        await db.refresh(row)
    return rows


@router.get("/contribution-reports", response_model=list[ContributionReportResponse])
async def list_contribution_reports(
    repo_full_name: str = Query(...),
    user: User = Depends(require_role("recruiter")),
    db: AsyncSession = Depends(get_db),
) -> list[ContributionReport]:
    result = await db.execute(
        select(ContributionReport)
        .where(ContributionReport.repo_full_name == repo_full_name)
        .order_by(ContributionReport.contribution_share.desc())
    )
    return list(result.scalars().all())
