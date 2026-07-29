import uuid

from sqlalchemy import ARRAY, CheckConstraint, ForeignKey, Index, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from sqlalchemy.types import Boolean, DateTime, Float, Integer

from packages.db.models.base import Base

# Kanban stage vocabulary — the architecture doc's 6-value CHECK constraint, the most complete of
# three inconsistent lists found across doc/SRS/02, doc/multi-agent-architecture/02, and the two
# frontend mock pages built ahead of this backend. SRS FR-1.4's extra `assessed` stage is deferred
# until Module 03 (Assessment) exists, same as Module 01's "seed fake data upstream, don't block on
# missing modules" rule.
_APPLICATION_STAGES = "sourced,screened,interview_scheduled,offered,rejected,hired".split(",")


class Job(Base):
    """Module 2 (AI Recruitment Platform) — a recruiter's job posting.

    Schema follows doc/multi-agent-architecture/02 §6 (single `organization_id` column — SRS/02's
    duplicate `org_id`/`organization_id` is a known doc difference, see
    .agents/DOCUMENTATION_MAP.md, resolved in favor of the architecture doc's single column)."""

    __tablename__ = "jobs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id")
    )
    posted_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    required_skills: Mapped[list | None] = mapped_column(JSONB)  # ["React", "Python", "FastAPI"]
    min_experience_years: Mapped[int | None] = mapped_column(Integer)
    location: Mapped[str | None] = mapped_column(Text)
    is_remote: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Application(Base):
    """FR-1.4 kanban pipeline. `source` isn't in either doc's SQL, but FR-4.3's "source-of-hire
    breakdown: direct application vs hackathon-sourced vs copilot-search" can't be computed
    without it — added additively, same reasoning as Module 01's `username` column."""

    __tablename__ = "applications"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("jobs.id"), nullable=False)
    candidate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("candidate_profiles.id"), nullable=False
    )
    stage: Mapped[str] = mapped_column(Text, nullable=False, server_default="sourced")
    source: Mapped[str | None] = mapped_column(Text)  # direct | copilot_search | hackathon
    applied_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())
    stage_updated_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint(
            f"stage IN ({', '.join(repr(s) for s in _APPLICATION_STAGES)})",
            name="ck_applications_stage",
        ),
        CheckConstraint(
            "source IS NULL OR source IN ('direct','copilot_search','hackathon')",
            name="ck_applications_source",
        ),
        UniqueConstraint("job_id", "candidate_id", name="uq_applications_job_candidate"),
        Index("idx_applications_job_stage", "job_id", "stage"),
        Index("idx_applications_candidate", "candidate_id"),
    )


class MatchScore(Base):
    """FR-2 — the 4-term composite score from doc/multi-agent-architecture/08 §2. Always shown to
    recruiters as this breakdown, never a bare percentage (doc 08/09 NFR)."""

    __tablename__ = "match_scores"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("jobs.id"), nullable=False)
    candidate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("candidate_profiles.id"), nullable=False
    )
    match_percentage: Mapped[float | None] = mapped_column(Float)
    skill_similarity: Mapped[float | None] = mapped_column(Float)
    semantic_similarity: Mapped[float | None] = mapped_column(Float)
    experience_match: Mapped[float | None] = mapped_column(Float)
    talent_score_alignment: Mapped[float | None] = mapped_column(Float)
    project_relevance: Mapped[float | None] = mapped_column(Float)
    explanation: Mapped[str | None] = mapped_column(Text)
    computed_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("job_id", "candidate_id", name="uq_match_scores_job_candidate"),
        Index("idx_match_scores_job_time", "job_id", "computed_at"),
    )


class CopilotConversation(Base):
    """FR-3 — one row per recruiter conversation. No LangGraph checkpointer is used anywhere in
    this codebase (every graph is a one-shot `ainvoke()`); `messages` is manually loaded into the
    next turn's initial state and re-saved after, same manual-persistence pattern as elsewhere."""

    __tablename__ = "copilot_conversations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    recruiter_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    messages: Mapped[list | None] = mapped_column(JSONB)
    structured_filters: Mapped[dict | None] = mapped_column(JSONB)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[object] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class SkillTaxonomyEntry(Base):
    """Synonym resolution for the Query Understanding Agent's NL filter parsing (e.g. "ML" /
    "Machine Learning" resolve to one canonical skill)."""

    __tablename__ = "skill_taxonomy"

    canonical_name: Mapped[str] = mapped_column(Text, primary_key=True)
    synonyms: Mapped[list | None] = mapped_column(ARRAY(Text))


class LocationAlias(Base):
    """Synonym resolution for location filters (e.g. "Delhi NCR" / "New Delhi")."""

    __tablename__ = "location_aliases"

    canonical_name: Mapped[str] = mapped_column(Text, primary_key=True)
    aliases: Mapped[list | None] = mapped_column(ARRAY(Text))
