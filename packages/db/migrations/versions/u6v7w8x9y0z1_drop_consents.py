"""Drop the consent system.

Removes the `consents` table and the `interview_sessions.consent_id` FK that pointed at
it. Consent was collected as a separate up-front step before resume parsing, GitHub
ingestion, AI assessments and AI interviews; it has been removed from the product, so
the enforcement helpers, the grant endpoint and this storage all go together.

`interview_sessions.consent_id` was NOT NULL, so it has to be dropped before the table
it references. The downgrade cannot restore consent *rows* — the data is gone — so it
recreates the column as nullable rather than pretending otherwise.

Revision ID: u6v7w8x9y0z1
Revises: t5u6v7w8x9y0
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy.dialects.postgresql import UUID

revision = "u6v7w8x9y0z1"
down_revision = "t5u6v7w8x9y0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint(
        "interview_sessions_consent_id_fkey", "interview_sessions", type_="foreignkey"
    )
    op.drop_column("interview_sessions", "consent_id")
    op.drop_index("idx_consents_candidate_granted", table_name="consents")
    op.drop_table("consents")


def downgrade() -> None:
    # Mirrors the pre-drop table exactly, including the server defaults and the
    # revoked_at/ip_address/terms_version columns that the ORM model never mapped.
    op.create_table(
        "consents",
        sa.Column("consent_id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "candidate_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False
        ),
        sa.Column("consent_type", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False, server_default="granted"),
        sa.Column(
            "granted_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ip_address", postgresql.INET(), nullable=True),
        sa.Column("terms_version", sa.Text(), nullable=False, server_default="1.0"),
        sa.CheckConstraint(
            "consent_type IN ('resume_parsing','linkedin_export','ai_interview',"
            "'perceptual_photo_hash','ai_assessment','github_ingestion')",
            name="ck_consents_consent_type",
        ),
        sa.CheckConstraint("status IN ('granted','revoked')", name="ck_consents_status"),
    )
    op.create_index(
        "idx_consents_candidate_granted",
        "consents",
        ["candidate_id", sa.text("granted_at DESC")],
    )
    # Nullable on the way back: the original rows are gone, so existing interview
    # sessions have no consent to point at and a NOT NULL column could not be filled.
    op.add_column(
        "interview_sessions", sa.Column("consent_id", UUID(as_uuid=True), nullable=True)
    )
    op.create_foreign_key(
        "interview_sessions_consent_id_fkey",
        "interview_sessions",
        "consents",
        ["consent_id"],
        ["consent_id"],
    )
