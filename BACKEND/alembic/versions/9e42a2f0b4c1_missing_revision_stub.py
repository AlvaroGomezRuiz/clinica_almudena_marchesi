"""missing revision stub

Revision ID: 9e42a2f0b4c1
Revises: c4a8d2f9e0ab
Create Date: 2026-04-11

"""

from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = "9e42a2f0b4c1"
down_revision: Union[str, Sequence[str], None] = "c4a8d2f9e0ab"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema.

    Esta migración es un stub para reconciliar una revisión referenciada por la base
    de datos (`alembic_version`) que no existía en el árbol de migraciones.

    No aplica cambios de esquema.
    """


def downgrade() -> None:
    """Downgrade schema.

    No aplica cambios de esquema.
    """
