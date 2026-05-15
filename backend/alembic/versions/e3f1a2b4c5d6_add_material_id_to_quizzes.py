"""add_material_id_to_quizzes

Revision ID: e3f1a2b4c5d6
Revises: 821a3c713241
Create Date: 2026-05-15 23:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'e3f1a2b4c5d6'
down_revision: Union[str, Sequence[str], None] = '821a3c713241'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add material_id column to quizzes table with FK to materials and an index."""
    op.add_column(
        'quizzes',
        sa.Column('material_id', sa.String(length=36), nullable=True),
    )
    op.create_index(
        op.f('ix_quizzes_material_id'),
        'quizzes',
        ['material_id'],
        unique=False,
    )
    op.create_foreign_key(
        'quizzes_material_id_fk',
        'quizzes',
        'materials',
        ['material_id'],
        ['id'],
        ondelete='SET NULL',
    )


def downgrade() -> None:
    """Remove material_id column from quizzes table."""
    op.drop_constraint('quizzes_material_id_fk', 'quizzes', type_='foreignkey')
    op.drop_index(op.f('ix_quizzes_material_id'), table_name='quizzes')
    op.drop_column('quizzes', 'material_id')
