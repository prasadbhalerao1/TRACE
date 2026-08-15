"""Add topics + pushed_at to github_snapshots (repository analytics / skills section
of the redesigned Codolio-style dashboard).

Revision ID: e5f6a7b8c9d0
Revises: d4f5a6b7c8d9
Create Date: 2026-07-30 20:30:00.000000
"""
from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'e5f6a7b8c9d0'
down_revision: Union[str, Sequence[str], None] = 'd4f5a6b7c8d9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('github_snapshots', sa.Column('topics', postgresql.JSONB(), nullable=True))
    op.add_column('github_snapshots', sa.Column('pushed_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('github_snapshots', 'pushed_at')
    op.drop_column('github_snapshots', 'topics')
