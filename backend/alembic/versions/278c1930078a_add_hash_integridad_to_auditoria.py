"""add_hash_integridad_to_auditoria

Revision ID: 278c1930078a
Revises: 1bfa14c8112a
Create Date: 2026-04-19 20:11:52.154146

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '278c1930078a'
down_revision: Union[str, Sequence[str], None] = '1bfa14c8112a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add hash_integridad column to auditoria for immutable audit chain."""
    # Step 1: Add column as nullable to avoid failures on existing rows
    op.add_column('auditoria', sa.Column('hash_integridad', sa.String(length=64), nullable=True))
    # Step 2: Backfill existing rows with a genesis placeholder
    op.execute("UPDATE auditoria SET hash_integridad = 'GENESIS' WHERE hash_integridad IS NULL")
    # Step 3: Enforce NOT NULL constraint
    op.alter_column('auditoria', 'hash_integridad',
               existing_type=sa.String(length=64),
               nullable=False)
    # Step 4: Add index for integrity verification queries
    op.create_index(op.f('ix_auditoria_hash_integridad'), 'auditoria', ['hash_integridad'], unique=False)


def downgrade() -> None:
    """Remove hash_integridad column from auditoria."""
    op.drop_index(op.f('ix_auditoria_hash_integridad'), table_name='auditoria')
    op.drop_column('auditoria', 'hash_integridad')
