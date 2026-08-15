"""Index the two tables that are scanned on hot paths.

**events** — `event_consumer.process_pending_events` polls for unprocessed rows of one
event type every 30 seconds, forever. Unindexed, that was a sequential scan of the whole
table on every tick, growing with total event history while the result set is almost
always empty.

A *partial* index rather than a plain one: only unprocessed rows are ever queried, and
they are a tiny, self-limiting subset of an append-only table. The index therefore stays
small no matter how many events accumulate, and processed rows drop out of it
automatically once `processed_at` is set.

**agent_runs** — every agent run is looked up by `(subject_type, subject_id)` to build a
subject's provenance trail, on a table that grows with every ingestion, scoring pass and
fraud check. It had no index at all.

Revision ID: w8x9y0z1a2b3
Revises: v7w8x9y0z1a2
"""
from alembic import op
import sqlalchemy as sa

revision = "w8x9y0z1a2b3"
down_revision = "v7w8x9y0z1a2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index(
        "idx_events_unprocessed_type",
        "events",
        ["event_type"],
        postgresql_where=sa.text("processed_at IS NULL"),
    )
    op.create_index("idx_agent_runs_subject", "agent_runs", ["subject_type", "subject_id"])


def downgrade() -> None:
    op.drop_index("idx_agent_runs_subject", table_name="agent_runs")
    op.drop_index("idx_events_unprocessed_type", table_name="events")
