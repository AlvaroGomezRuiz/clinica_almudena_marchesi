"""recursos_y_conversaciones

Revision ID: c4d2a1b0e9f8
Revises: 7f2c1b3d4e5f
Create Date: 2026-04-11

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c4d2a1b0e9f8"
down_revision: Union[str, Sequence[str], None] = "7f2c1b3d4e5f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "recursos",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("titulo", sa.String(length=255), nullable=False),
        sa.Column("tipo", sa.String(length=50), nullable=False),
        sa.Column("categoria", sa.String(length=50), nullable=False),
        sa.Column("original_filename", sa.String(length=255), nullable=True),
        sa.Column("storage_path", sa.String(length=255), nullable=False),
        sa.Column("mime_type", sa.String(length=127), nullable=True),
        sa.Column("size_bytes", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("activo", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_recursos_categoria"), "recursos", ["categoria"], unique=False
    )
    op.create_index(op.f("ix_recursos_activo"), "recursos", ["activo"], unique=False)

    op.create_table(
        "recurso_asignaciones",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("recurso_id", sa.String(length=36), nullable=False),
        sa.Column("paciente_id", sa.String(length=36), nullable=False),
        sa.Column("assigned_by_user_id", sa.Integer(), nullable=True),
        sa.Column("assigned_at", sa.DateTime(), nullable=False),
        sa.Column("activo", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["assigned_by_user_id"], ["usuarios.id"]),
        sa.ForeignKeyConstraint(["paciente_id"], ["pacientes.id"]),
        sa.ForeignKeyConstraint(["recurso_id"], ["recursos.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_recurso_asignaciones_recurso_id"),
        "recurso_asignaciones",
        ["recurso_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_recurso_asignaciones_paciente_id"),
        "recurso_asignaciones",
        ["paciente_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_recurso_asignaciones_assigned_by_user_id"),
        "recurso_asignaciones",
        ["assigned_by_user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_recurso_asignaciones_activo"),
        "recurso_asignaciones",
        ["activo"],
        unique=False,
    )
    op.create_index(
        "ux_recurso_asignaciones_recurso_paciente",
        "recurso_asignaciones",
        ["recurso_id", "paciente_id"],
        unique=True,
    )

    op.create_table(
        "conversaciones",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("paciente_id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("last_message_at", sa.DateTime(), nullable=True),
        sa.Column("archived_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("activo", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["paciente_id"], ["pacientes.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_conversaciones_paciente_id"),
        "conversaciones",
        ["paciente_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_conversaciones_last_message_at"),
        "conversaciones",
        ["last_message_at"],
        unique=False,
    )
    op.create_index(
        op.f("ix_conversaciones_archived_at"),
        "conversaciones",
        ["archived_at"],
        unique=False,
    )
    op.create_index(
        op.f("ix_conversaciones_deleted_at"),
        "conversaciones",
        ["deleted_at"],
        unique=False,
    )
    op.create_index(
        op.f("ix_conversaciones_activo"), "conversaciones", ["activo"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_conversaciones_activo"), table_name="conversaciones")
    op.drop_index(op.f("ix_conversaciones_deleted_at"), table_name="conversaciones")
    op.drop_index(op.f("ix_conversaciones_archived_at"), table_name="conversaciones")
    op.drop_index(
        op.f("ix_conversaciones_last_message_at"), table_name="conversaciones"
    )
    op.drop_index(op.f("ix_conversaciones_paciente_id"), table_name="conversaciones")
    op.drop_table("conversaciones")

    op.drop_index(
        "ux_recurso_asignaciones_recurso_paciente",
        table_name="recurso_asignaciones",
    )
    op.drop_index(
        op.f("ix_recurso_asignaciones_activo"),
        table_name="recurso_asignaciones",
    )
    op.drop_index(
        op.f("ix_recurso_asignaciones_assigned_by_user_id"),
        table_name="recurso_asignaciones",
    )
    op.drop_index(
        op.f("ix_recurso_asignaciones_paciente_id"),
        table_name="recurso_asignaciones",
    )
    op.drop_index(
        op.f("ix_recurso_asignaciones_recurso_id"),
        table_name="recurso_asignaciones",
    )
    op.drop_table("recurso_asignaciones")

    op.drop_index(op.f("ix_recursos_activo"), table_name="recursos")
    op.drop_index(op.f("ix_recursos_categoria"), table_name="recursos")
    op.drop_table("recursos")
