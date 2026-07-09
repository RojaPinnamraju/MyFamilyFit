"""Initial schema — managed by SQLAlchemy create_all

Revision ID: 001
Revises:
Create Date: 2025-01-01 00:00:00.000000

Schema is created by Base.metadata.create_all() in main.py.
This revision exists solely so alembic has a head to stamp.
"""
from typing import Sequence, Union

revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass  # Schema created by SQLAlchemy create_all()


def downgrade() -> None:
    pass
