"""Add scoring_rubric column to interview_definitions table

Revision ID: n9o0p1q2r3s4
Revises: bc5ea7945230
Create Date: 2026-08-01 12:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'n9o0p1q2r3s4'
down_revision: Union[str, Sequence[str], None] = 'bc5ea7945230'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add scoring_rubric column to interview_definitions table."""
    op.add_column(
        'interview_definitions',
        sa.Column('scoring_rubric', postgresql.JSONB(astext_type=sa.Text()), nullable=True)
    )


def downgrade() -> None:
    """Remove scoring_rubric column from interview_definitions table."""
    op.drop_column('interview_definitions', 'scoring_rubric')
