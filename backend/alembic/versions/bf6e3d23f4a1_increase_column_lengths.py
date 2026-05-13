"""increase_column_lengths

Revision ID: bf6e3d23f4a1
Revises: 5acc97813619
Create Date: 2026-05-13 11:50:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bf6e3d23f4a1'
down_revision: Union[str, Sequence[str], None] = '5acc97813619'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column('materials', 'summary',
               existing_type=sa.String(length=2000),
               type_=sa.Text(),
               existing_comment='Material summary')
    op.alter_column('materials', 'citations',
               existing_type=sa.String(length=2000),
               type_=sa.Text(),
               existing_comment='Material citations')
    op.alter_column('questions', 'question_text',
               existing_type=sa.String(length=2000),
               type_=sa.Text(),
               existing_comment='Question text')
    op.alter_column('questions', 'explanation',
               existing_type=sa.String(length=2000),
               type_=sa.Text(),
               existing_comment='Question explanation')
    op.alter_column('user_attempts', 'feedback_text',
               existing_type=sa.String(length=2000),
               type_=sa.Text(),
               existing_comment='Feedback text')


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column('user_attempts', 'feedback_text',
               existing_type=sa.Text(),
               type_=sa.String(length=2000),
               existing_comment='Feedback text')
    op.alter_column('questions', 'explanation',
               existing_type=sa.Text(),
               type_=sa.String(length=2000),
               existing_comment='Question explanation')
    op.alter_column('questions', 'question_text',
               existing_type=sa.Text(),
               type_=sa.String(length=2000),
               existing_comment='Question text')
    op.alter_column('materials', 'citations',
               existing_type=sa.Text(),
               type_=sa.String(length=2000),
               existing_comment='Material citations')
    op.alter_column('materials', 'summary',
               existing_type=sa.Text(),
               type_=sa.String(length=2000),
               existing_comment='Material summary')
