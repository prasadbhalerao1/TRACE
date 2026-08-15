"""add candidate_id to assessments

Revision ID: b1c2d3e4f5a6
Revises: afe5f58698f3
Create Date: 2026-07-30 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'b1c2d3e4f5a6'
down_revision: Union[str, Sequence[str], None] = '54e04d937561'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "assessments",
        sa.Column("candidate_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_assessments_candidate_id_candidate_profiles",
        "assessments",
        "candidate_profiles",
        ["candidate_id"],
        ["id"],
    )
    op.create_index("idx_assessments_candidate", "assessments", ["candidate_id"])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("idx_assessments_candidate", table_name="assessments")
    op.drop_constraint(
        "fk_assessments_candidate_id_candidate_profiles", "assessments", type_="foreignkey"
    )
    op.drop_column("assessments", "candidate_id")
