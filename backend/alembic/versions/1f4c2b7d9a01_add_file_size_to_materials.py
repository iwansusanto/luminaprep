"""Add file_size to materials

Revision ID: 1f4c2b7d9a01
Revises: cf7a4b82d9e1
Create Date: 2026-05-14 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "1f4c2b7d9a01"
down_revision: Union[str, Sequence[str], None] = "cf7a4b82d9e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    connection = op.get_bind()
    inspector = sa.inspect(connection)

    if inspector.has_table("materials"):
        columns = [column["name"] for column in inspector.get_columns("materials")]
        if "file_size" not in columns:
            op.add_column("materials", sa.Column("file_size", sa.Integer(), nullable=True))


def downgrade() -> None:
    connection = op.get_bind()
    inspector = sa.inspect(connection)

    if inspector.has_table("materials"):
        columns = [column["name"] for column in inspector.get_columns("materials")]
        if "file_size" in columns:
            op.drop_column("materials", "file_size")
