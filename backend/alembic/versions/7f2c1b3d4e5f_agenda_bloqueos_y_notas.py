"""agenda_bloqueos_y_notas

Revision ID: 7f2c1b3d4e5f
Revises: 301626726a8f
Create Date: 2026-04-11

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "7f2c1b3d4e5f"
down_revision: Union[str, Sequence[str], None] = "301626726a8f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "agenda_bloqueos",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("inicio_iso", sa.DateTime(), nullable=False),
        sa.Column("fin_iso", sa.DateTime(), nullable=False),
        sa.Column("motivo", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("activo", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_agenda_bloqueos_inicio_iso"),
        "agenda_bloqueos",
        ["inicio_iso"],
        unique=False,
    )
    op.create_index(
        op.f("ix_agenda_bloqueos_fin_iso"),
        "agenda_bloqueos",
        ["fin_iso"],
        unique=False,
    )
    op.create_index(
        op.f("ix_agenda_bloqueos_activo"),
        "agenda_bloqueos",
        ["activo"],
        unique=False,
    )

    op.create_table(
        "agenda_notas_dia",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("dia", sa.Date(), nullable=False),
        sa.Column("nota_ciphertext", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_agenda_notas_dia_dia"),
        "agenda_notas_dia",
        ["dia"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_agenda_notas_dia_dia"), table_name="agenda_notas_dia")
    op.drop_table("agenda_notas_dia")

    op.drop_index(op.f("ix_agenda_bloqueos_activo"), table_name="agenda_bloqueos")
    op.drop_index(op.f("ix_agenda_bloqueos_fin_iso"), table_name="agenda_bloqueos")
    op.drop_index(op.f("ix_agenda_bloqueos_inicio_iso"), table_name="agenda_bloqueos")
    op.drop_table("agenda_bloqueos")
