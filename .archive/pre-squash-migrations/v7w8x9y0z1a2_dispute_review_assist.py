"""Cache the dispute reviewer-assist summary on the dispute row.

`GET /flags/{id}` regenerated this summary with a live LLM call on every request — while
holding a pooled DB connection — even though both of its inputs (the flag's evidence and
the candidate's statement) are immutable once the dispute is submitted. Opening the same
flag twice cost two model calls for an identical result.

Nullable with no backfill: null means "not summarized yet", and the first read of each
existing dispute fills it in.

Revision ID: v7w8x9y0z1a2
Revises: u6v7w8x9y0z1
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "v7w8x9y0z1a2"
down_revision = "u6v7w8x9y0z1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("disputes", sa.Column("review_assist", JSONB(), nullable=True))


def downgrade() -> None:
    op.drop_column("disputes", "review_assist")
