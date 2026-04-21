"""facturacion_nota_administrativa

Revision ID: d5b7a9c1e3f4
Revises: c4d2a1b0e9f8
Create Date: 2026-04-11

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d5b7a9c1e3f4"
down_revision: Union[str, Sequence[str], None] = "c4d2a1b0e9f8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "facturacion_notas",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("nota", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("updated_by_user_id", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["updated_by_user_id"], ["usuarios.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("facturacion_notas")
