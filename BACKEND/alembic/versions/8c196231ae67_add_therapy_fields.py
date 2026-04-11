"""Add therapy fields

Revision ID: 8c196231ae67
Revises: 9e42a2f0b4c1
Create Date: 2026-04-11 02:28:25.130140

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '8c196231ae67'
down_revision: Union[str, Sequence[str], None] = '9e42a2f0b4c1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('pacientes', sa.Column('experiencia_terapia', sa.String(length=255), nullable=True))
    op.add_column('pacientes', sa.Column('motivo_consulta', sa.Text(), nullable=True))



def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('pacientes', 'motivo_consulta')
    op.drop_column('pacientes', 'experiencia_terapia')

