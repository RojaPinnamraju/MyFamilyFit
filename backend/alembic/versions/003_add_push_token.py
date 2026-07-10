"""Add push_token column to users table

Revision ID: 003
Revises: 002
Create Date: 2026-07-09
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.engine.reflection import Inspector

revision:      str                            = '003'
down_revision: Union[str, None]               = '002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on:    Union[str, Sequence[str], None] = None


def _cols(table: str) -> set[str]:
    return {c['name'] for c in Inspector.from_engine(op.get_bind()).get_columns(table)}


def upgrade() -> None:
    if 'push_token' not in _cols('users'):
        op.add_column('users', sa.Column('push_token', sa.String(), nullable=True))


def downgrade() -> None:
    if 'push_token' in _cols('users'):
        op.drop_column('users', 'push_token')
