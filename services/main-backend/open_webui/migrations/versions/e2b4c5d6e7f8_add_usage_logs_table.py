"""add usage logs table

Revision ID: e2b4c5d6e7f8
Revises: 42e2978c7933
Create Date: 2026-07-14 15:04:00

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e2b4c5d6e7f8'
down_revision: Union[str, None] = '42e2978c7933'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if 'usage_logs' not in tables:
        op.create_table(
            'usage_logs',
            sa.Column('id', sa.String(), primary_key=True, unique=True),
            sa.Column('user_id', sa.String(), nullable=False),
            sa.Column('api_key_id', sa.String(), nullable=True),
            sa.Column('model', sa.String(), nullable=False),
            sa.Column('provider', sa.String(), nullable=False),
            sa.Column('prompt_tokens', sa.Integer(), nullable=True, default=0),
            sa.Column('completion_tokens', sa.Integer(), nullable=True, default=0),
            sa.Column('total_tokens', sa.Integer(), nullable=True, default=0),
            sa.Column('cost', sa.Float(), nullable=True, default=0.0),
            sa.Column('created_at', sa.BigInteger(), nullable=True),
        )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if 'usage_logs' in tables:
        op.drop_table('usage_logs')
