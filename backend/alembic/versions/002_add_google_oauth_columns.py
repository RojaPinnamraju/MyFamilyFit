"""Add Google OAuth columns to users table

Revision ID: 002
Revises: 001
Create Date: 2025-01-02 00:00:00.000000

Adds three columns:
  - google_id    VARCHAR UNIQUE NULL  — Google account sub/ID
  - avatar_url   VARCHAR NULL         — Google profile picture URL
  - auth_provider VARCHAR NOT NULL DEFAULT 'local'

Uses existence checks so this migration is safe to run against:
  • Fresh databases  — create_all() already added the columns → skip them
  • Existing databases — columns are missing → add them
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.engine.reflection import Inspector

revision:       str                           = '002'
down_revision:  Union[str, None]              = '001'
branch_labels:  Union[str, Sequence[str], None] = None
depends_on:     Union[str, Sequence[str], None] = None


def _existing_columns(table: str) -> set[str]:
    bind = op.get_bind()
    inspector = Inspector.from_engine(bind)
    return {c['name'] for c in inspector.get_columns(table)}


def _existing_indexes(table: str) -> set[str]:
    bind = op.get_bind()
    inspector = Inspector.from_engine(bind)
    return {i['name'] for i in inspector.get_indexes(table)}


def upgrade() -> None:
    existing = _existing_columns('users')

    if 'google_id' not in existing:
        op.add_column('users', sa.Column('google_id', sa.String(), nullable=True))

    if 'avatar_url' not in existing:
        op.add_column('users', sa.Column('avatar_url', sa.String(), nullable=True))

    if 'auth_provider' not in existing:
        op.add_column(
            'users',
            sa.Column(
                'auth_provider',
                sa.String(),
                nullable=False,
                server_default='local',   # backfill existing rows
            ),
        )

    # Unique index on google_id
    if 'ix_users_google_id' not in _existing_indexes('users'):
        op.create_index('ix_users_google_id', 'users', ['google_id'], unique=True)


def downgrade() -> None:
    indexes = _existing_indexes('users')
    if 'ix_users_google_id' in indexes:
        op.drop_index('ix_users_google_id', table_name='users')

    existing = _existing_columns('users')
    for col in ('auth_provider', 'avatar_url', 'google_id'):
        if col in existing:
            op.drop_column('users', col)
