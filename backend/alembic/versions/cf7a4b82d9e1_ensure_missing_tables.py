"""ensure missing tables exist

Revision ID: cf7a4b82d9e1
Revises: bf6e3d23f4a1
Create Date: 2026-05-13 11:57:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cf7a4b82d9e1'
down_revision: Union[str, Sequence[str], None] = 'bf6e3d23f4a1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    # Create user_attempts if missing
    if 'user_attempts' not in tables:
        op.create_table('user_attempts',
            sa.Column('user_answer', sa.String(length=1000), nullable=True, comment='User answer'),
            sa.Column('is_correct', sa.Boolean(), nullable=True, comment='Is answer correct'),
            sa.Column('score_earned', sa.Float(), nullable=True, comment='Score earned'),
            sa.Column('feedback_text', sa.Text(), nullable=True, comment='Feedback text'),
            sa.Column('id', sa.String(length=36), nullable=False, comment='User attempt ID'),
            sa.Column('user_id', sa.String(length=36), nullable=False, comment='User ID'),
            sa.Column('quiz_id', sa.String(length=36), nullable=False, comment='Quiz ID'),
            sa.Column('question_id', sa.String(length=36), nullable=False, comment='Question ID'),
            sa.Column('quiz_session_id', sa.String(length=36), nullable=True, comment='Quiz session ID'),
            sa.Column('created_at', sa.DateTime(), nullable=False, comment='User attempt created at'),
            sa.Column('updated_at', sa.DateTime(), nullable=False, comment='User attempt updated at'),
            sa.Column('deleted_at', sa.DateTime(), nullable=True, comment='Soft delete timestamp'),
            sa.ForeignKeyConstraint(['question_id'], ['questions.id'], ),
            sa.ForeignKeyConstraint(['quiz_id'], ['quizzes.id'], ),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
            sa.PrimaryKeyConstraint('id')
        )
        # Handle quiz_session_id separately if quiz_sessions table exists
        if 'quiz_sessions' in tables:
             op.create_foreign_key('user_attempts_ibfk_4', 'user_attempts', 'quiz_sessions', ['quiz_session_id'], ['id'])

    # Create agent_metrics if missing
    if 'agent_metrics' not in tables:
        op.create_table('agent_metrics',
            sa.Column('trace_id', sa.String(length=255), nullable=True, comment='Agent trace ID'),
            sa.Column('event_type', sa.String(length=255), nullable=False, comment='Agent event type'),
            sa.Column('latency_ms', sa.Float(), nullable=True, comment='Agent latency in ms'),
            sa.Column('cost_usd', sa.Float(), nullable=True, comment='Agent cost in USD'),
            sa.Column('accuracy_score', sa.Float(), nullable=True, comment='Agent accuracy score'),
            sa.Column('hallucination_detected', sa.Boolean(), nullable=True, comment='Hallucination detected'),
            sa.Column('id', sa.String(length=36), nullable=False, comment='Agent metric ID'),
            sa.Column('project_id', sa.String(length=36), nullable=False, comment='Project ID'),
            sa.Column('token_usage', sa.JSON(), nullable=True, comment='Token usage'),
            sa.Column('created_at', sa.DateTime(), nullable=False, comment='Agent metric created at'),
            sa.Column('deleted_at', sa.DateTime(), nullable=True, comment='Soft delete timestamp'),
            sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ),
            sa.PrimaryKeyConstraint('id')
        )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('agent_metrics')
    op.drop_table('user_attempts')
