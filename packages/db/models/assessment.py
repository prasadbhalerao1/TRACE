import uuid

from sqlalchemy import CheckConstraint, ForeignKey, Index, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from sqlalchemy.types import DateTime, Float, Integer

from packages.db.models.base import Base


class Assessment(Base):
    """Module 3 (Assessment & Verification) — FR-1. `spec` includes hidden test cases in
    full (candidate must execute them client-side per doc 03 §2's Pyodide-only sandbox
    design) for `type='coding'`, the question bank for `type='mcq'`, or is empty/unused
    for `type='project_analysis'` (that submission is a repo reference, not a spec)."""

    __tablename__ = "assessments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("jobs.id"))
    # Nullable — an assessment can be authored as a reusable template before it's
    # assigned to any specific candidate (mirrors job_id's own nullability). FKs to
    # candidate_profiles, not users, matching Submission/InterviewSession/
    # ContributionReport's existing convention for every other candidate-scoped column
    # in this module.
    candidate_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("candidate_profiles.id")
    )
    type: Mapped[str] = mapped_column(Text, nullable=False)
    spec: Mapped[dict | None] = mapped_column(JSONB)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint("type IN ('coding','mcq','project_analysis')", name="ck_assessments_type"),
        Index("idx_assessments_candidate", "candidate_id"),
    )


class Submission(Base):
    __tablename__ = "submissions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assessment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("assessments.id"), nullable=False
    )
    candidate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("candidate_profiles.id"), nullable=False
    )
    code_or_answers: Mapped[dict | None] = mapped_column(JSONB)
    # Pass/fail per hidden test as computed client-side — never the expected values
    # themselves, per doc 03 §2's client-execution design.
    test_results: Mapped[dict | None] = mapped_column(JSONB)
    static_analysis: Mapped[dict | None] = mapped_column(JSONB)
    llm_review: Mapped[dict | None] = mapped_column(JSONB)
    score: Mapped[float | None] = mapped_column(Float)
    submitted_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (Index("idx_submissions_assessment", "assessment_id"),)


class InterviewSession(Base):
    """`consent_id` is the ONLY consent reference (architecture doc §8's finalized schema
    — no duplicate `consent_given`/`consent_timestamp` columns, see
    .agents/DOCUMENTATION_MAP.md's Known Differences)."""

    __tablename__ = "interview_sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("candidate_profiles.id"), nullable=False
    )
    job_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("jobs.id"))
    consent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("consents.consent_id"), nullable=False
    )
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default="in_progress")
    # Server-side working state for the turn-based graph (topic_plan, current_topic_idx,
    # per_topic_scores, follow_up_count_this_topic) — no LangGraph checkpointer exists
    # anywhere in this codebase; this is the manual-persistence slot for it, same
    # convention as Module 02's `copilot_conversations.structured_filters`.
    state: Mapped[dict | None] = mapped_column(JSONB)
    started_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())
    ended_at: Mapped[object | None] = mapped_column(DateTime(timezone=True))

    __table_args__ = (
        CheckConstraint(
            "status IN ('in_progress','completed','abandoned')", name="ck_interview_sessions_status"
        ),
    )


class InterviewTranscriptTurn(Base):
    __tablename__ = "interview_transcripts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("interview_sessions.id"), nullable=False
    )
    turn_index: Mapped[int] = mapped_column(Integer, nullable=False)
    role: Mapped[str] = mapped_column(Text, nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    ts: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint("role IN ('agent','candidate')", name="ck_interview_transcripts_role"),
        Index("idx_interview_transcripts_session_turn", "session_id", "turn_index"),
    )


class InterviewReport(Base):
    """`response_confidence_signal` — architecture doc §6's renaming of SRS's
    `confidence_score`, explicitly to make clear it's transcript-derived (hedging
    language, answer specificity/structure), never voice-biometric/emotion inference."""

    __tablename__ = "interview_reports"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("interview_sessions.id"), nullable=False
    )
    response_confidence_signal: Mapped[float | None] = mapped_column(Float)
    technical_rating: Mapped[float | None] = mapped_column(Float)
    communication_rating: Mapped[float | None] = mapped_column(Float)
    hiring_recommendation: Mapped[str | None] = mapped_column(Text)
    generated_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ContributionReport(Base):
    """FR-3. `github_username` is additive (neither doc's SQL has it) — a team member
    who isn't yet a platform candidate still needs to show up in the report;
    `candidate_id` stays nullable exactly as both docs' own SQL already has it."""

    __tablename__ = "contribution_reports"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    repo_full_name: Mapped[str] = mapped_column(Text, nullable=False)
    candidate_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("candidate_profiles.id")
    )
    github_username: Mapped[str | None] = mapped_column(Text)
    contribution_share: Mapped[float | None] = mapped_column(Float)
    commits: Mapped[int | None] = mapped_column(Integer)
    lines_survived: Mapped[int | None] = mapped_column(Integer)
    prs_opened: Mapped[int | None] = mapped_column(Integer)
    prs_reviewed: Mapped[int | None] = mapped_column(Integer)
    anomaly_note: Mapped[str | None] = mapped_column(Text)
    generated_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (Index("idx_contribution_reports_repo", "repo_full_name"),)
