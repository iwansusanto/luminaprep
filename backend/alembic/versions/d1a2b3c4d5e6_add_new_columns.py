"""add topic, custom_request to quizzes; add chat tables; add file_size to materials; add participant_name to quiz_sessions

Revision ID: d1a2b3c4d5e6
Revises: cf7a4b82d9e1
Create Date: 2026-05-14 20:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'd1a2b3c4d5e6'
down_revision: Union[str, Sequence[str], None] = 'cf7a4b82d9e1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_exists(table: str, column: str) -> bool:
    """Check if a column already exists (safe for re-runs)."""
    from sqlalchemy import inspect, text
    conn = op.get_bind()
    result = conn.execute(
        text(
            "SELECT COUNT(*) FROM information_schema.columns "
            "WHERE table_schema = DATABASE() "
            "AND table_name = :t AND column_name = :c"
        ),
        {"t": table, "c": column},
    )
    return result.scalar() > 0


def _table_exists(table: str) -> bool:
    conn = op.get_bind()
    from sqlalchemy import text
    result = conn.execute(
        text(
            "SELECT COUNT(*) FROM information_schema.tables "
            "WHERE table_schema = DATABASE() AND table_name = :t"
        ),
        {"t": table},
    )
    return result.scalar() > 0


def upgrade() -> None:
    # ── quizzes: add topic + custom_request ──────────────────────────────────
    if not _column_exists("quizzes", "topic"):
        op.add_column("quizzes", sa.Column("topic", sa.String(255), nullable=True))

    if not _column_exists("quizzes", "custom_request"):
        op.add_column("quizzes", sa.Column("custom_request", sa.String(1000), nullable=True))

    # ── materials: add file_size ──────────────────────────────────────────────
    if not _column_exists("materials", "file_size"):
        op.add_column("materials", sa.Column("file_size", sa.Integer(), nullable=True))

    # ── quiz_sessions: add participant_name (for public/anonymous sessions) ──
    if not _column_exists("quiz_sessions", "participant_name"):
        op.add_column("quiz_sessions", sa.Column("participant_name", sa.String(255), nullable=True))

    # Make user_id nullable in quiz_sessions (anonymous participants have no user)
    if _column_exists("quiz_sessions", "user_id"):
        op.alter_column("quiz_sessions", "user_id", existing_type=sa.String(36), nullable=True)

    # Make user_id nullable in user_attempts (anonymous attempts)
    if _column_exists("user_attempts", "user_id"):
        op.alter_column("user_attempts", "user_id", existing_type=sa.String(36), nullable=True)

    # ── chat_sessions table ───────────────────────────────────────────────────
    if not _table_exists("chat_sessions"):
        op.create_table(
            "chat_sessions",
            sa.Column("id", sa.String(255), primary_key=True),
            sa.Column("user_id", sa.String(255), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("project_id", sa.String(255), nullable=True),
            sa.Column("material_id", sa.String(255), nullable=True),
            sa.Column("quiz_id", sa.String(255), nullable=True),
            sa.Column("title", sa.String(255), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.Column("deleted_at", sa.DateTime(), nullable=True),
        )

    # ── chat_messages table ───────────────────────────────────────────────────
    if not _table_exists("chat_messages"):
        op.create_table(
            "chat_messages",
            sa.Column("id", sa.String(255), primary_key=True),
            sa.Column("session_id", sa.String(255), sa.ForeignKey("chat_sessions.id"), nullable=False),
            sa.Column("role", sa.String(20), nullable=False),
            sa.Column("content", sa.Text(), nullable=False),
            sa.Column("tool_name", sa.String(100), nullable=True),
            sa.Column("tool_result", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
        )


def downgrade() -> None:
    # Drop chat tables
    if _table_exists("chat_messages"):
        op.drop_table("chat_messages")
    if _table_exists("chat_sessions"):
        op.drop_table("chat_sessions")

    # Remove added columns
    if _column_exists("quiz_sessions", "participant_name"):
        op.drop_column("quiz_sessions", "participant_name")
    if _column_exists("materials", "file_size"):
        op.drop_column("materials", "file_size")
    if _column_exists("quizzes", "custom_request"):
        op.drop_column("quizzes", "custom_request")
    if _column_exists("quizzes", "topic"):
        op.drop_column("quizzes", "topic")
