"""Add open-source contributions and hackathon performance to talent score.

Adds two new sub-scores to TalentScore (open_source_contributions, hackathon_performance)
and a new hackathon_experience JSONB field to CandidateProfile for self-reported
hackathon experience (external hackathons not run on this platform).

Revision ID: m8n9o0p1q2r3
Revises: l7m8n9o0p1q2
Create Date: 2026-08-01 00:00:00.000000
"""
from typing import Union
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'm8n9o0p1q2r3'
down_revision: Union[str, Sequence[str], None] = 'l7m8n9o0p1q2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add two new columns to talent_scores
    op.add_column(
        'talent_scores',
        sa.Column('open_source_contributions', sa.Float(), nullable=True)
    )
    op.add_column(
        'talent_scores',
        sa.Column('hackathon_performance', sa.Float(), nullable=True)
    )

    # Add hackathon_experience JSONB field to candidate_profiles
    op.add_column(
        'candidate_profiles',
        sa.Column('hackathon_experience', sa.JSON(), nullable=True)
    )


def downgrade() -> None:
    op.drop_column('talent_scores', 'open_source_contributions')
    op.drop_column('talent_scores', 'hackathon_performance')
    op.drop_column('candidate_profiles', 'hackathon_experience')
