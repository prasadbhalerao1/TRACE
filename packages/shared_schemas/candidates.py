from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

SUB_SCORE_NAMES = (
    "coding_ability",
    "problem_solving",
    "project_quality",
    "innovation",
    "technical_consistency",
    "community_participation",
    "leadership",
)


class SubScore(BaseModel):
    value: float | None  # 0-100, None when not yet computable (cold start)
    evidence: list[str] = []  # agent_run ids
    rationale: str | None = None


class CandidateProfileResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    user_id: UUID
    github_username: str | None
    headline: str | None
    location: str | None
    skills: list[dict] | None
    experience: list[dict] | None
    education: list[dict] | None
    merged_conflicts: list[dict] | None
    username: str | None
    portfolio_published: bool
    updated_at: datetime


class ConflictResolution(BaseModel):
    field: str
    resolved_value: str


class TalentScoreResponse(BaseModel):
    overall: float | None
    sub_scores: dict[str, SubScore]
    renormalized_subscores: list[str]
    score_version: str
    computed_at: datetime


class BadgeResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    skill_name: str
    corroboration_sources: list[dict]
    awarded_at: datetime


class GithubIngestRequest(BaseModel):
    github_username: str


class DashboardResponse(BaseModel):
    profile: CandidateProfileResponse
    latest_score: TalentScoreResponse | None
    score_history: list[TalentScoreResponse]
    badges: list[BadgeResponse]


# --- FR-5: AI Resume & Portfolio Builder ---


class FactCheckFinding(BaseModel):
    """One claim the Fact-Check Agent checked in a generated document."""

    claim: str
    supported: bool
    note: str | None = None


class ResumeGenerateRequest(BaseModel):
    # FR-5.4: when set, bullets are re-ranked/re-worded to emphasize this JD's
    # keywords — still grounded only in the candidate's actual profile data.
    target_job_description: str | None = None


class CoverLetterGenerateRequest(BaseModel):
    # FR-5.3: cover letters are always parameterized by a target JD.
    target_job_description: str


class GeneratedDocumentResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    document_type: str  # "resume" | "cover_letter"
    target_job_description: str | None
    content: dict
    file_url: str | None = None
    fact_check_status: str  # "pending" | "passed" | "failed"
    fact_check_findings: list[FactCheckFinding] | None
    model_used: str | None
    generated_at: datetime


class PortfolioPublishRequest(BaseModel):
    username: str


class PublicPortfolioProject(BaseModel):
    repo_full_name: str
    stars: int | None
    forks: int | None
    languages: dict | None


class PublicPortfolioResponse(BaseModel):
    """FR-5.2 — payload for the public, unauthenticated, SSR `/[username]` route.
    Read-only, no PII beyond what the candidate chose to publish (no email/user_id)."""

    username: str
    headline: str | None
    location: str | None
    skills: list[dict] | None
    experience: list[dict] | None
    education: list[dict] | None
    projects: list[PublicPortfolioProject]
    badges: list[BadgeResponse]
    overall_score: float | None
    updated_at: datetime


# --- FR-4: AI Career Guidance System ---


class CareerGuidanceResponse(BaseModel):
    """FR-4.1-4.5. `salary_estimate_low`/`salary_estimate_high` are a range only —
    never a point estimate (doc 01 §8) — and are `None` together when no Talent Score
    or no trained salary model is available yet (cold start, not fabrication)."""

    target_role: str | None
    skill_gaps: list[dict]  # [{skill, similarity, weight, priority}], worst gap first
    recommended_courses: list[dict]  # course_catalog rows matched to the gaps above
    roadmap: dict  # {"stages": [{"stage","skills","estimated_weeks","description"}]}
    salary_estimate_low: int | None
    salary_estimate_high: int | None
    salary_rationale: str | None = None
    generated_at: datetime
