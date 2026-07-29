"""add github_ingestion consent type

Revision ID: 44fd41ed1de0
Revises: bfa4df0973c6
Create Date: 2026-07-29 14:18:13.005835

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '44fd41ed1de0'
down_revision: Union[str, Sequence[str], None] = 'bfa4df0973c6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_constraint("ck_consents_consent_type", "consents", type_="check")
    op.create_check_constraint(
        "ck_consents_consent_type",
        "consents",
        "consent_type IN ('resume_parsing','linkedin_export','ai_interview',"
        "'perceptual_photo_hash','ai_assessment','github_ingestion')",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint("ck_consents_consent_type", "consents", type_="check")
    op.create_check_constraint(
        "ck_consents_consent_type",
        "consents",
        "consent_type IN ('resume_parsing','linkedin_export','ai_interview',"
        "'perceptual_photo_hash','ai_assessment')",
    )
