"""Change chat message content to TEXT

Revision ID: 821a3c713241
Revises: d60bdfad8623
Create Date: 2026-05-15 21:45:11.578848

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision: str = '821a3c713241'
down_revision: Union[str, Sequence[str], None] = 'd60bdfad8623'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column('chat_messages', 'content',
               existing_type=mysql.VARCHAR(length=255),
               type_=sa.TEXT(),
               existing_nullable=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column('chat_messages', 'content',
               existing_type=sa.TEXT(),
               type_=mysql.VARCHAR(length=255),
               existing_nullable=False)
