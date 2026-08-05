import uuid

from sqlalchemy import CheckConstraint, ForeignKey, Index, Text
from sqlalchemy.dialects.postgresql import INET, UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from sqlalchemy.types import DateTime

from packages.db.models.base import Base


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
        # Every consent read is "the latest granted consent of this type for this
        # candidate", ordered by granted_at DESC — see the interview-start and ingestion
        # paths. `granted_at` is part of the index (descending) so that lookup terminates
        # at the first matching row instead of sorting the candidate's whole history.
        Index("idx_consents_candidate_granted", "candidate_id", granted_at.desc()),
    )
