"""sesiones y throttle

Revision ID: 9f3b1c7a2d8e
Revises: 4b0730df719f
Create Date: 2026-04-10

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "9f3b1c7a2d8e"
down_revision: Union[str, Sequence[str], None] = "4b0730df719f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "user_sessions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("jti", sa.String(length=128), nullable=False),
        sa.Column("trusted", sa.Boolean(), nullable=False),
        sa.Column("device_fingerprint_hash", sa.String(length=64), nullable=True),
        sa.Column("user_agent_hash", sa.String(length=64), nullable=False),
        sa.Column("ip_first", sa.String(length=45), nullable=False),
        sa.Column("ip_last", sa.String(length=45), nullable=False),
        sa.Column("ip_network", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("revoked_at", sa.DateTime(), nullable=True),
        sa.Column("admin_ip_lock", sa.String(length=45), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["usuarios.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_user_sessions_user_id"), "user_sessions", ["user_id"], unique=False
    )
    op.create_index(op.f("ix_user_sessions_jti"), "user_sessions", ["jti"], unique=True)
    op.create_index(
        op.f("ix_user_sessions_device_fingerprint_hash"),
        "user_sessions",
        ["device_fingerprint_hash"],
        unique=False,
    )
    op.create_index(
        op.f("ix_user_sessions_expires_at"),
        "user_sessions",
        ["expires_at"],
        unique=False,
    )
    op.create_index(
        op.f("ix_user_sessions_revoked_at"),
        "user_sessions",
        ["revoked_at"],
        unique=False,
    )

    op.create_table(
        "auth_ip_throttle",
        sa.Column("ip", sa.String(length=45), nullable=False),
        sa.Column("failures", sa.Integer(), nullable=False),
        sa.Column("first_failure_at", sa.DateTime(), nullable=True),
        sa.Column("last_failure_at", sa.DateTime(), nullable=True),
        sa.Column("blocked_until", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("ip"),
    )
    op.create_index(
        op.f("ix_auth_ip_throttle_blocked_until"),
        "auth_ip_throttle",
        ["blocked_until"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(
        op.f("ix_auth_ip_throttle_blocked_until"), table_name="auth_ip_throttle"
    )
    op.drop_table("auth_ip_throttle")

    op.drop_index(op.f("ix_user_sessions_revoked_at"), table_name="user_sessions")
    op.drop_index(op.f("ix_user_sessions_expires_at"), table_name="user_sessions")
    op.drop_index(
        op.f("ix_user_sessions_device_fingerprint_hash"), table_name="user_sessions"
    )
    op.drop_index(op.f("ix_user_sessions_jti"), table_name="user_sessions")
    op.drop_index(op.f("ix_user_sessions_user_id"), table_name="user_sessions")
    op.drop_table("user_sessions")
