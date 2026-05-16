"""Add user_quizzes table for multi-user quiz ownership

Revision ID: a1b2c3d4e5f6
Revises: d60bdfad8623
Create Date: 2026-05-16 08:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'd60bdfad8623'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(table: str) -> bool:
    conn = op.get_bind()
    result = conn.execute(
        text(
            "SELECT COUNT(*) FROM information_schema.tables "
            "WHERE table_schema = DATABASE() AND table_name = :t"
        ),
        {"t": table},
    )
    return result.scalar() > 0


def upgrade() -> None:
    # ── Create user_quizzes table ──────────────────────────────────────────────
    if not _table_exists("user_quizzes"):
        op.create_table(
            "user_quizzes",
            sa.Column("id", sa.String(255), primary_key=True),
            sa.Column("user_id", sa.String(255), sa.ForeignKey("users.id"), nullable=False, index=True),
            sa.Column("quiz_id", sa.String(255), sa.ForeignKey("quizzes.id"), nullable=False, index=True),
            sa.Column("is_owner", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("deleted_at", sa.DateTime(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.UniqueConstraint("user_id", "quiz_id", name="uq_user_quiz"),
        )

    # ── Seed user_quizzes from existing quizzes → project owners ──────────────
    conn = op.get_bind()
    existing = conn.execute(
        text(
            "SELECT COUNT(*) FROM user_quizzes"
        )
    ).scalar()

    if existing == 0:
        conn.execute(
            text(
                """
                INSERT INTO user_quizzes (id, user_id, quiz_id, is_owner, created_at, updated_at)
                SELECT
                    UUID(),
                    p.user_id,
                    q.id,
                    TRUE,
                    q.created_at,
                    q.updated_at
                FROM quizzes q
                JOIN projects p ON q.project_id = p.id
                WHERE q.deleted_at IS NULL
                  AND p.deleted_at IS NULL
                  AND p.user_id IS NOT NULL
                """
            )
        )


def downgrade() -> None:
    if _table_exists("user_quizzes"):
        op.drop_table("user_quizzes")
