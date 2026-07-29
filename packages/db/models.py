import uuid

from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    Index,
    Text,
)
from sqlalchemy.dialects.postgresql import INET, JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.sql import func
from sqlalchemy.types import Boolean, DateTime, Float, Integer


class Base(DeclarativeBase):
    pass


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    domain: Mapped[str | None] = mapped_column(Text)
    org_type: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint(
            "org_type IN ('company','university','hackathon_organizer')",
            name="ck_organizations_org_type",
        ),
    )


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    full_name: Mapped[str | None] = mapped_column(Text)
    role: Mapped[str] = mapped_column(Text, nullable=False)
    organization_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id")
    )
    # Clerk subject id ("sub" claim) — generic name per doc 00 §4/§5, provider-agnostic
    auth_provider_id: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())
    is_active: Mapped[bool] = mapped_column(Boolean, server_default="true")

    __table_args__ = (
        CheckConstraint(
            "role IN ('candidate','recruiter','organizer','judge','admin')",
            name="ck_users_role",
        ),
    )


class File(Base):
    """Single storage provider (Cloudinary) — see .agents/decisions.md for why the
    `storage_provider` column and `interview_audio` file_type from doc/SRS/00 §5 were dropped
    in favor of doc/multi-agent-architecture/00 §4's corrected shape."""

    __tablename__ = "files"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    storage_key: Mapped[str] = mapped_column(Text, nullable=False)
    public_url: Mapped[str | None] = mapped_column(Text)
    file_type: Mapped[str | None] = mapped_column(Text)  # resume | certificate | ppt | photo
    uploaded_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Consent(Base):
    """The ONLY place consent status lives — no module stores its own consent_given/
    consent_timestamp copy; always join to this table (doc/multi-agent-architecture/00 §4)."""

    __tablename__ = "consents"

    consent_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    consent_type: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default="granted")
    granted_at: Mapped[object] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    revoked_at: Mapped[object | None] = mapped_column(DateTime(timezone=True))
    ip_address: Mapped[str | None] = mapped_column(INET)
    terms_version: Mapped[str] = mapped_column(Text, nullable=False, server_default="1.0")

    __table_args__ = (
        CheckConstraint(
            "consent_type IN ('resume_parsing','linkedin_export','ai_interview',"
            "'perceptual_photo_hash','ai_assessment','github_ingestion')",
            name="ck_consents_consent_type",
        ),
        CheckConstraint("status IN ('granted','revoked')", name="ck_consents_status"),
    )


class Event(Base):
    __tablename__ = "events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # e.g. 'hackathon.rankings.finalized', 'hackathon.submission.scored', 'profile.updated'
    event_type: Mapped[str] = mapped_column(Text, nullable=False)
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())
    processed_at: Mapped[object | None] = mapped_column(DateTime(timezone=True))


class AgentRun(Base):
    """Explainability record — every AI score/verdict must have one (constraints.md §4)."""

    __tablename__ = "agent_runs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_name: Mapped[str] = mapped_column(Text, nullable=False)
    subject_type: Mapped[str] = mapped_column(Text, nullable=False)  # candidate | presentation | application | ...
    subject_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    input_ref: Mapped[dict | None] = mapped_column(JSONB)
    output: Mapped[dict | None] = mapped_column(JSONB)
    model_used: Mapped[str | None] = mapped_column(Text)
    langfuse_trace_id: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    actor_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    action: Mapped[str] = mapped_column(Text, nullable=False)
    target_type: Mapped[str | None] = mapped_column(Text)
    target_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())


class CandidateProfile(Base):
    """Module 1 (Candidate Intelligence) — canonical merged profile.

    Schema follows doc/multi-agent-architecture/01 §7 (adds `score_version`-adjacent
    provenance via merged_conflicts) over doc/SRS/01 §5 — same pick as Phase 0's
    files/consents resolution in .agents/decisions.md.
    """

    __tablename__ = "candidate_profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False)
    github_username: Mapped[str | None] = mapped_column(Text)
    headline: Mapped[str | None] = mapped_column(Text)
    location: Mapped[str | None] = mapped_column(Text)
    skills: Mapped[list | None] = mapped_column(JSONB)  # [{name, source, confidence}]
    experience: Mapped[list | None] = mapped_column(JSONB)
    education: Mapped[list | None] = mapped_column(JSONB)
    merged_conflicts: Mapped[list | None] = mapped_column(JSONB)
    # FR-5.2 public portfolio (`/[username]`) — neither doc set names a slug column, but
    # the SSR route can't exist without one. Nullable + unique: no username until the
    # candidate opts in via POST /candidates/me/portfolio/publish.
    username: Mapped[str | None] = mapped_column(Text, unique=True)
    portfolio_published: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    updated_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())


class GithubSnapshot(Base):
    __tablename__ = "github_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("candidate_profiles.id"), nullable=False
    )
    repo_full_name: Mapped[str] = mapped_column(Text, nullable=False)
    stars: Mapped[int | None] = mapped_column(Integer)
    forks: Mapped[int | None] = mapped_column(Integer)
    commit_count: Mapped[int | None] = mapped_column(Integer)
    pr_count: Mapped[int | None] = mapped_column(Integer)
    issue_count: Mapped[int | None] = mapped_column(Integer)
    languages: Mapped[dict | None] = mapped_column(JSONB)
    is_fork: Mapped[bool | None] = mapped_column(Boolean)
    fetched_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Certification(Base):
    __tablename__ = "certifications"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("candidate_profiles.id"), nullable=False
    )
    file_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("files.id"))
    issuer: Mapped[str | None] = mapped_column(Text)
    title: Mapped[str | None] = mapped_column(Text)
    issue_date: Mapped[object | None] = mapped_column(DateTime(timezone=True))
    credential_id: Mapped[str | None] = mapped_column(Text)
    ocr_confidence: Mapped[float | None] = mapped_column(Float)
    verification_status: Mapped[str] = mapped_column(Text, nullable=False, server_default="unverified")

    __table_args__ = (
        CheckConstraint(
            "verification_status IN ('unverified','pending','verified','rejected')",
            name="ck_certifications_verification_status",
        ),
    )


class TalentScore(Base):
    __tablename__ = "talent_scores"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("candidate_profiles.id"), nullable=False
    )
    coding_ability: Mapped[float | None] = mapped_column(Float)
    project_quality: Mapped[float | None] = mapped_column(Float)
    leadership: Mapped[float | None] = mapped_column(Float)
    problem_solving: Mapped[float | None] = mapped_column(Float)
    innovation: Mapped[float | None] = mapped_column(Float)
    community_participation: Mapped[float | None] = mapped_column(Float)
    technical_consistency: Mapped[float | None] = mapped_column(Float)
    overall: Mapped[float | None] = mapped_column(Float)
    # Which sub-scores were N/A and had their weight re-normalized away (doc 08 §1.1) —
    # part of the provenance trail, never a silent adjustment.
    renormalized_subscores: Mapped[list | None] = mapped_column(JSONB)
    score_version: Mapped[str] = mapped_column(Text, nullable=False, server_default="v1")
    computed_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (Index("idx_scores_candidate_time", "candidate_id", "computed_at"),)


class Badge(Base):
    __tablename__ = "badges"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("candidate_profiles.id"), nullable=False
    )
    skill_name: Mapped[str] = mapped_column(Text, nullable=False)
    corroboration_sources: Mapped[list] = mapped_column(JSONB, nullable=False)
    awarded_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())


class GeneratedDocument(Base):
    """Module 1 FR-5 (Resume & Portfolio Builder) — one row per resume/cover-letter
    generation attempt, covering both FR-5.1/5.3 (plain generation) and FR-5.4
    (JD-optimized: `target_job_description` set, generated bullets re-ranked/re-worded
    to that JD). Neither doc set specifies a table for this — added additively, same
    reasoning as `career_recommendations` in doc 01 §7 (one row per on-demand generation,
    not a mutable "current resume" singleton, so candidates keep a history).

    `fact_check_status`/`fact_check_findings` implement the mandatory Fact-Check Agent
    guardrail (doc 01 §4, NFR "zero tolerance for fabricated experience") — every row is
    written regardless of pass/fail for the explainability trail, but the API only ever
    hands a candidate a `failed` row's PDF/text if generation is being deliberately
    disclosed as unresolved; see `services/api/routers/candidates.py` (FactCheckFailed).
    """

    __tablename__ = "generated_documents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("candidate_profiles.id"), nullable=False
    )
    document_type: Mapped[str] = mapped_column(Text, nullable=False)  # resume | cover_letter
    target_job_description: Mapped[str | None] = mapped_column(Text)
    content: Mapped[dict] = mapped_column(JSONB, nullable=False)
    file_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("files.id"))
    fact_check_status: Mapped[str] = mapped_column(Text, nullable=False, server_default="pending")
    fact_check_findings: Mapped[list | None] = mapped_column(JSONB)
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    model_used: Mapped[str | None] = mapped_column(Text)
    generated_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint(
            "document_type IN ('resume','cover_letter')", name="ck_generated_documents_document_type"
        ),
        CheckConstraint(
            "fact_check_status IN ('pending','passed','failed')",
            name="ck_generated_documents_fact_check_status",
        ),
        Index("idx_generated_documents_candidate_time", "candidate_id", "generated_at"),
    )


class CourseCatalogEntry(Base):
    """FR-4.2/FR-4.5 — curated, statically-seeded course catalog (doc 01 §8: "maintained
    static table ... not scraped live"). Seed rows are inserted by this table's own
    migration, not by application code."""

    __tablename__ = "course_catalog"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    provider: Mapped[str] = mapped_column(Text, nullable=False)  # coursera | freecodecamp | vendor
    title: Mapped[str] = mapped_column(Text, nullable=False)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    skill_tags: Mapped[list] = mapped_column(JSONB, nullable=False)  # ["python", "system-design", ...]
    level: Mapped[str | None] = mapped_column(Text)  # beginner | intermediate | advanced
    estimated_hours: Mapped[int | None] = mapped_column(Integer)
    is_free: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint(
            "provider IN ('coursera','freecodecamp','vendor')", name="ck_course_catalog_provider"
        ),
        CheckConstraint(
            "level IS NULL OR level IN ('beginner','intermediate','advanced')",
            name="ck_course_catalog_level",
        ),
    )


class CareerRecommendation(Base):
    """FR-4 — AI Career Guidance System output (doc/multi-agent-architecture/01 §7).

    `target_role` isn't in the doc's table verbatim — added so a candidate can request
    guidance for more than one target role and each gets its own cached row (see
    .agents/decisions.md dated entry for this module)."""

    __tablename__ = "career_recommendations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("candidate_profiles.id"), nullable=False
    )
    target_role: Mapped[str | None] = mapped_column(Text)
    skill_gaps: Mapped[list | None] = mapped_column(JSONB)
    recommended_courses: Mapped[list | None] = mapped_column(JSONB)
    roadmap: Mapped[dict | None] = mapped_column(JSONB)
    # Range only, never a point estimate (doc 01 §8) — enforced at the tool layer too.
    salary_estimate_low: Mapped[int | None] = mapped_column(Integer)
    salary_estimate_high: Mapped[int | None] = mapped_column(Integer)
    salary_rationale: Mapped[str | None] = mapped_column(Text)
    generated_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("idx_career_recs_candidate_time", "candidate_id", "generated_at"),
    )


class Presentation(Base):
    __tablename__ = "presentations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    file_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("files.id"))
    linked_repo: Mapped[str | None] = mapped_column(Text)
    hackathon_submission_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default="processing")
    status_detail: Mapped[str | None] = mapped_column(Text)
    uploaded_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint(
            "status IN ('processing','done','failed')",
            name="ck_presentations_status",
        ),
    )


class PlagiarismMatch(Base):
    __tablename__ = "plagiarism_matches"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    presentation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("presentations.id"), nullable=False)
    matched_presentation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("presentations.id"), nullable=False)
    slide_index: Mapped[int] = mapped_column(Integer, nullable=False)
    similarity: Mapped[float] = mapped_column(Float, nullable=False)
    flagged_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PresentationScore(Base):
    __tablename__ = "presentation_scores"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    presentation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("presentations.id"), nullable=False)
    innovation_score: Mapped[float | None] = mapped_column(Float)
    technical_feasibility_score: Mapped[float | None] = mapped_column(Float)
    presentation_quality_score: Mapped[float | None] = mapped_column(Float)
    business_potential_score: Mapped[float | None] = mapped_column(Float)
    overall_pitch_score: Mapped[float | None] = mapped_column(Float)
    renormalized_scores: Mapped[list | None] = mapped_column(JSONB)
    summary: Mapped[str | None] = mapped_column(Text)
    suggestions: Mapped[list | None] = mapped_column(JSONB)
    ai_content_signal: Mapped[dict | None] = mapped_column(JSONB)
    computed_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("idx_presentation_scores_presentation_time", "presentation_id", "computed_at"),
    )


class Slide(Base):
    __tablename__ = "slides"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    presentation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("presentations.id"), nullable=False)
    slide_index: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str | None] = mapped_column(Text)
    body: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)
    has_image: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    ocr_text: Mapped[str | None] = mapped_column(Text)

    __table_args__ = (
        Index("idx_slides_presentation_index", "presentation_id", "slide_index"),
    )
