"""bunker_configuracion_perfil_y_alertas

Revision ID: 3a9d8c7b6e5f
Revises: c4d2a1b0e9f8
Create Date: 2026-04-11

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "3a9d8c7b6e5f"
down_revision: Union[str, Sequence[str], None] = "c4d2a1b0e9f8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "usuarios",
        sa.Column("perfil_nombre", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "usuarios",
        sa.Column("perfil_numero_colegiada", sa.String(length=64), nullable=True),
    )
    op.add_column(
        "usuarios",
        sa.Column("perfil_email", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "usuarios",
        sa.Column(
            "intrusion_alerts_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("1"),
        ),
    )


def downgrade() -> None:
    op.drop_column("usuarios", "intrusion_alerts_enabled")
    op.drop_column("usuarios", "perfil_email")
    op.drop_column("usuarios", "perfil_numero_colegiada")
    op.drop_column("usuarios", "perfil_nombre")
