"""Unir todas las tablas nuevas

Revision ID: 1bfa14c8112a
Revises: 3a9d8c7b6e5f, d5b7a9c1e3f4
Create Date: 2026-04-11 21:34:37.854039

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1bfa14c8112a'
down_revision: Union[str, Sequence[str], None] = ('3a9d8c7b6e5f', 'd5b7a9c1e3f4')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
