"""merge heads

Revision ID: 42d81dd5a112
Revises: a1b2c3d4e5f6, e3f1a2b4c5d6
Create Date: 2026-05-16 23:18:03.563793

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '42d81dd5a112'
down_revision: Union[str, Sequence[str], None] = ('a1b2c3d4e5f6', 'e3f1a2b4c5d6')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
