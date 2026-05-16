"""create public_quizzes table

Revision ID: 6bebf99bda56
Revises: 42d81dd5a112
Create Date: 2026-05-16 23:28:25.942933

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6bebf99bda56'
down_revision: Union[str, Sequence[str], None] = '42d81dd5a112'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('public_quizzes',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('material_id', sa.String(length=255), nullable=True),
        sa.Column('quiz_id', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_public_quizzes_quiz_id'), 'public_quizzes', ['quiz_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_public_quizzes_quiz_id'), table_name='public_quizzes')
    op.drop_table('public_quizzes')
