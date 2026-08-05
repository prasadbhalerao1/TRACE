"""Add ranking_status/ranking_error to hackathons.

Revision ID: r3s4t5u6v7w8
Revises: q2r3s4t5u6v7
Create Date: 2026-08-04 00:00:00.000000

Ranking finalization (per-team repo verification, cross-event novelty search, composite
scoring) moved out of the POST /hackathons/{id}/rankings/finalize request path into a
background task, so the organizer needs a way to poll for completion.

Tracked separately from `hackathons.status` because that column is CHECK-constrained to
the lifecycle values (draft/active/judging/finalized) and means something different — it
is the event's state, not the state of one finalize run. Mirrors `jobs.matching_status`.

Existing rows have no run in flight, so they backfill to "idle" via the server_default.
"""
from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'r3s4t5u6v7w8'
down_revision: Union[str, Sequence[str], None] = 'q2r3s4t5u6v7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_column(inspector, table: str, column: str) -> bool:
    if not inspector.has_table(table):
        return False
    return any(c["name"] == column for c in inspector.get_columns(table))


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if not _has_column(inspector, "hackathons", "ranking_status"):
        op.add_column(
            "hackathons",
            sa.Column("ranking_status", sa.Text(), nullable=False, server_default="idle"),
        )
    if not _has_column(inspector, "hackathons", "ranking_error"):
        op.add_column("hackathons", sa.Column("ranking_error", sa.Text(), nullable=True))


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if _has_column(inspector, "hackathons", "ranking_error"):
        op.drop_column("hackathons", "ranking_error")
    if _has_column(inspector, "hackathons", "ranking_status"):
        op.drop_column("hackathons", "ranking_status")
