"""password_auth

Revision ID: bc5ea7945230
Revises: m8n9o0p1q2r3
Create Date: 2026-08-01 12:08:28.312362

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bc5ea7945230'
down_revision: Union[str, Sequence[str], None] = 'm8n9o0p1q2r3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('password_hash', sa.Text(), nullable=False, server_default=''))
    op.alter_column('users', 'password_hash', server_default=None)
    op.drop_column('users', 'auth_provider_id')


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column('users', sa.Column('auth_provider_id', sa.Text(), nullable=True))
    op.drop_column('users', 'password_hash')
