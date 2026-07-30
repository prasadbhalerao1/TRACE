from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

ASSESSMENT_TYPES = ("coding", "mcq", "project_analysis")


class AssessmentCreateRequest(BaseModel):
    # Nullable: a recruiter can author an assessment template (e.g. reusable per job_id)
    # before assigning it to any specific candidate, same "exists-before-assigned"
    # pattern as job_id itself. When set, it targets `candidate_profiles.id` — the same
    # FK convention every other candidate-scoped table in this module already uses
    # (Submission.candidate_id, InterviewSession.candidate_id, ContributionReport
    # .candidate_id all reference candidate_profiles, not users).
    job_id: UUID | None = None
    candidate_id: UUID | None = None
    type: str
    spec: dict


class AssessmentResponse(BaseModel):
    """Includes the full `spec` — hidden tests included for `type='coding'` — since the
    candidate must execute them client-side (doc 03 §2's Pyodide-only sandbox design).
    This is the doc's own accepted tradeoff, not a leak to fix."""

    model_config = {"from_attributes": True}

    id: UUID
    job_id: UUID | None
    candidate_id: UUID | None
    type: str
    spec: dict | None
    created_at: datetime


class TestResult(BaseModel):
    test_name: str
    passed: bool


class SubmissionRequest(BaseModel):
    # Coding: {"code": "..."}; MCQ: {"answers": {"q1": "b", ...}}; project_analysis:
    # {"repo_full_name": "owner/repo"}.
    code_or_answers: dict
    # Pass/fail only, computed client-side — never the expected values themselves.
    test_results: list[TestResult] = []


class StaticAnalysisFinding(BaseModel):
    tool: str  # radon | lizard | bandit
    summary: str
    details: dict


class CodeReviewRubric(BaseModel):
    readability: float | None
    architecture: float | None
    red_flags: list[str]
    rationale: str | None


class SubmissionResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    assessment_id: UUID
    candidate_id: UUID
    code_or_answers: dict | None
    test_results: dict | None
    static_analysis: dict | None
    llm_review: dict | None
    score: float | None
    submitted_at: datetime


# --- FR-2: AI Interview Agent ---


class InterviewStartRequest(BaseModel):
    job_id: UUID | None = None
    topic_plan: list[str] = []  # empty = auto-derive from candidate profile


class InterviewTurnResponse(BaseModel):
    session_id: UUID
    question: str | None  # None when the interview has concluded (call /end next)
    topics_remaining: int
    status: str  # in_progress | completed


class InterviewAnswerRequest(BaseModel):
    answer_text: str


class InterviewSessionResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    candidate_id: UUID
    job_id: UUID | None
    status: str
    started_at: datetime
    ended_at: datetime | None


class TranscriptTurnResponse(BaseModel):
    model_config = {"from_attributes": True}

    turn_index: int
    role: str
    text: str
    ts: datetime


class InterviewReportResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    session_id: UUID
    response_confidence_signal: float | None
    technical_rating: float | None
    communication_rating: float | None
    hiring_recommendation: str | None
    generated_at: datetime


class InterviewReportWithTranscriptResponse(InterviewReportResponse):
    transcript: list[TranscriptTurnResponse]


# --- FR-3: Team Contribution Analytics ---


class ContributionReportGenerateRequest(BaseModel):
    repo_full_name: str
    github_usernames: list[str]


class ContributionReportResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    repo_full_name: str
    candidate_id: UUID | None
    github_username: str | None
    contribution_share: float | None
    commits: int | None
    lines_survived: int | None
    prs_opened: int | None
    prs_reviewed: int | None
    anomaly_note: str | None
    generated_at: datetime
