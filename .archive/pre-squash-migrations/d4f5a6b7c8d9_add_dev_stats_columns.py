"""Add leetcode_username + github_stats/leetcode_stats cache columns (Codolio-style
Development Stats / Problem Solving Stats split on the candidate profile).

Revision ID: d4f5a6b7c8d9
Revises: c7e8f9a0b1c2
Create Date: 2026-07-30 19:00:00.000000
"""
from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'd4f5a6b7c8d9'
down_revision: Union[str, Sequence[str], None] = 'c7e8f9a0b1c2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('candidate_profiles', sa.Column('leetcode_username', sa.Text(), nullable=True))
    op.add_column('candidate_profiles', sa.Column('github_stats', postgresql.JSONB(), nullable=True))
    op.add_column('candidate_profiles', sa.Column('leetcode_stats', postgresql.JSONB(), nullable=True))
    op.add_column(
        'candidate_profiles',
        sa.Column('stats_refreshed_at', sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('candidate_profiles', 'stats_refreshed_at')
    op.drop_column('candidate_profiles', 'leetcode_stats')
    op.drop_column('candidate_profiles', 'github_stats')
    op.drop_column('candidate_profiles', 'leetcode_username')
