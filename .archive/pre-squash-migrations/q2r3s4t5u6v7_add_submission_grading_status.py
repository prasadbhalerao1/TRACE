"""Add grading_status/grading_error to submissions.

Revision ID: q2r3s4t5u6v7
Revises: p1q2r3s4t5u6
Create Date: 2026-08-04 00:00:00.000000

Assessment grading (repo fetch, static analysis, LLM code review) moved out of the
POST /assessments/{id}/submit request path into a background task, so a submission row
now exists before its score does. These columns let the client distinguish
"not graded yet" from "graded, scored null".

Existing rows were all graded synchronously before this change, so they backfill to
"done" — which is also the server_default, keeping the column non-null without a
separate backfill step.
"""
from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'q2r3s4t5u6v7'
down_revision: Union[str, Sequence[str], None] = 'p1q2r3s4t5u6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_column(inspector, table: str, column: str) -> bool:
    if not inspector.has_table(table):
        return False
    return any(c["name"] == column for c in inspector.get_columns(table))


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if not _has_column(inspector, "submissions", "grading_status"):
        op.add_column(
            "submissions",
            sa.Column(
                "grading_status",
                sa.Text(),
                nullable=False,
                server_default="done",
            ),
        )
    if not _has_column(inspector, "submissions", "grading_error"):
        op.add_column("submissions", sa.Column("grading_error", sa.Text(), nullable=True))


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if _has_column(inspector, "submissions", "grading_error"):
        op.drop_column("submissions", "grading_error")
    if _has_column(inspector, "submissions", "grading_status"):
        op.drop_column("submissions", "grading_status")
