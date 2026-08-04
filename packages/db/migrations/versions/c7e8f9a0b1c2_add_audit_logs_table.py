"""Add audit_logs table (Track 4 — admin user management and audit log)

Revision ID: c7e8f9a0b1c2
Revises: 54e04d937561
Create Date: 2026-07-30 18:00:00.000000

NOTE: down_revision will be rebased to chain off b1c2d3e4f5a6 (Track 1
candidate_id migration) when Track 1 merges first. See .agents/memory/
project_qa_fix_tracks_running_20260730.md §7 for the standard protocol.
"""
from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'c7e8f9a0b1c2'
down_revision: Union[str, Sequence[str], None] = 'b1c2d3e4f5a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # `audit_logs` is already created by the base revision 14fb3de7e078
    # (shared_core_tables), so this migration is a no-op on any database built from
    # scratch — without this guard `alembic upgrade head` fails with DuplicateTable on
    # a fresh DB, making first-time setup impossible. It is kept (rather than deleted)
    # because existing databases have this revision recorded as applied, and it stays
    # non-empty for any legacy DB whose base predates the table.
    if sa.inspect(op.get_bind()).has_table('audit_logs'):
        return

    op.create_table(
        'audit_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('actor_user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('action', sa.Text(), nullable=False),
        sa.Column('target_type', sa.Text(), nullable=True),
        sa.Column('target_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(['actor_user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    # Intentionally a no-op: `audit_logs` is owned by the base revision
    # 14fb3de7e078, which drops it in its own downgrade. Dropping it here would
    # destroy a table this migration did not create.
    pass
