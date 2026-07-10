"""Add activity_level to users; create medications and medication_logs tables

Revision ID: 004
Revises: 003
Create Date: 2026-07-10
"""
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op

revision:      str                            = '004'
down_revision: Union[str, None]               = '003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on:    Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # ── 1. Enums (idempotent via exception handler) ───────────────────────────
    # Using DO blocks with EXCEPTION avoids the "type already exists" error
    # without needing a separate catalog query.
    conn.execute(sa.text("""
        DO $$ BEGIN
            CREATE TYPE activitylevel AS ENUM
                ('sedentary','light','moderate','active','very_active');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
    """))

    conn.execute(sa.text("""
        DO $$ BEGIN
            CREATE TYPE foodtiming AS ENUM ('before','after','with','any');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
    """))

    conn.execute(sa.text("""
        DO $$ BEGIN
            CREATE TYPE medlogstatus AS ENUM ('taken','skipped');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
    """))

    # ── 2. activity_level column ──────────────────────────────────────────────
    # No DEFAULT on the ADD COLUMN — avoids a PostgreSQL limitation where a
    # newly-created enum type cannot be used in a DEFAULT expression within
    # the same transaction.  The application falls back to MODERATE in Python.
    conn.execute(sa.text("""
        ALTER TABLE users
            ADD COLUMN IF NOT EXISTS activity_level activitylevel
    """))

    # ── 3. medications table ──────────────────────────────────────────────────
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS medications (
            id             SERIAL PRIMARY KEY,
            user_id        INTEGER NOT NULL REFERENCES users(id),
            name           VARCHAR NOT NULL,
            dosage         VARCHAR,
            frequency      VARCHAR NOT NULL,
            reminder_times JSON    NOT NULL DEFAULT '[]',
            food_timing    foodtiming NOT NULL DEFAULT 'any',
            notes          VARCHAR,
            start_date     DATE,
            end_date       DATE,
            is_active      BOOLEAN NOT NULL DEFAULT true,
            created_at     TIMESTAMPTZ DEFAULT now()
        )
    """))

    # ── 4. medication_logs table ──────────────────────────────────────────────
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS medication_logs (
            id             SERIAL PRIMARY KEY,
            medication_id  INTEGER NOT NULL REFERENCES medications(id),
            user_id        INTEGER NOT NULL REFERENCES users(id),
            log_date       DATE NOT NULL,
            reminder_time  VARCHAR,
            status         medlogstatus NOT NULL,
            notes          VARCHAR,
            logged_at      TIMESTAMPTZ DEFAULT now()
        )
    """))


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("DROP TABLE IF EXISTS medication_logs"))
    conn.execute(sa.text("DROP TABLE IF EXISTS medications"))
    conn.execute(sa.text(
        "ALTER TABLE users DROP COLUMN IF EXISTS activity_level"
    ))
    conn.execute(sa.text("DROP TYPE IF EXISTS activitylevel"))
    conn.execute(sa.text("DROP TYPE IF EXISTS foodtiming"))
    conn.execute(sa.text("DROP TYPE IF EXISTS medlogstatus"))
