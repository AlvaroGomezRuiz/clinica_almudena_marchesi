"""cifrar pacientes + blind index

Revision ID: c4a8d2f9e0ab
Revises: 9f3b1c7a2d8e
Create Date: 2026-04-10

"""

from __future__ import annotations

import hashlib
import hmac
import os
import re
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from cryptography.fernet import Fernet


# revision identifiers, used by Alembic.
revision: str = "c4a8d2f9e0ab"
down_revision: Union[str, Sequence[str], None] = "9f3b1c7a2d8e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _blind_index(secret_key: str, value: str, context: str) -> str:
    msg = f"bidx:{context}:{value}".encode("utf-8")
    return hmac.new(secret_key.encode("utf-8"), msg, hashlib.sha256).hexdigest()


def _decrypt_if_fernet(fernet: Fernet, value: str | None) -> str | None:
    if value is None or value == "":
        return value
    if value.startswith("gAAAA"):
        try:
            return fernet.decrypt(value.encode("utf-8")).decode("utf-8")
        except Exception:
            return None
    return value


def _encrypt_if_plain(fernet: Fernet, value: str | None) -> str | None:
    if value is None:
        return None
    if value == "":
        return ""
    if value.startswith("gAAAA"):
        return value
    return fernet.encrypt(value.encode("utf-8")).decode("utf-8")


def upgrade() -> None:
    """Upgrade schema."""
    # 1) Esquema: columnas nuevas + ampliar longitudes para almacenar Fernet.
    op.add_column(
        "pacientes", sa.Column("dni_nie_bidx", sa.String(length=64), nullable=True)
    )
    op.add_column(
        "pacientes",
        sa.Column("nombre_completo_bidx", sa.String(length=64), nullable=True),
    )
    op.add_column(
        "pacientes", sa.Column("telefono_bidx", sa.String(length=64), nullable=True)
    )

    op.alter_column(
        "pacientes",
        "dni_nie",
        existing_type=sa.String(length=20),
        type_=sa.String(length=255),
        existing_nullable=False,
    )
    op.alter_column(
        "pacientes",
        "nombre_completo",
        existing_type=sa.String(length=100),
        type_=sa.String(length=255),
        existing_nullable=False,
    )
    op.alter_column(
        "pacientes",
        "telefono",
        existing_type=sa.String(length=20),
        type_=sa.String(length=255),
        existing_nullable=True,
    )

    # 2) Backfill: cifrar valores existentes y calcular blind indexes.
    secret_key = os.getenv("SECRET_KEY", "")
    enc_key = os.getenv("ENCRYPTION_KEY", "")
    if not secret_key or not enc_key:
        raise RuntimeError(
            "Faltan SECRET_KEY/ENCRYPTION_KEY en entorno para migrar pacientes."
        )

    fernet = Fernet(enc_key.encode("utf-8"))
    bind = op.get_bind()

    rows = bind.execute(
        sa.text("SELECT id, dni_nie, nombre_completo, telefono FROM pacientes")
    ).fetchall()

    for row in rows:
        paciente_id = row[0]
        dni_raw = row[1]
        nombre_raw = row[2]
        telefono_raw = row[3]

        dni_plain = _decrypt_if_fernet(fernet, dni_raw) or ""
        dni_norm = dni_plain.strip().upper().replace("-", "").replace(" ", "")

        nombre_plain = _decrypt_if_fernet(fernet, nombre_raw) or ""
        nombre_title = nombre_plain.strip().title()
        nombre_norm = re.sub(r"\s+", " ", nombre_title.strip()).lower()

        telefono_plain = _decrypt_if_fernet(fernet, telefono_raw)
        telefono_clean = telefono_plain.strip() if telefono_plain else None
        telefono_digits = re.sub(r"\D", "", telefono_clean or "")

        dni_enc = _encrypt_if_plain(fernet, dni_norm)
        nombre_enc = _encrypt_if_plain(fernet, nombre_title)
        telefono_enc = (
            _encrypt_if_plain(fernet, telefono_clean) if telefono_clean else None
        )

        dni_bidx = _blind_index(secret_key, dni_norm, "dni") if dni_norm else None
        nombre_bidx = (
            _blind_index(secret_key, nombre_norm, "name") if nombre_norm else None
        )
        telefono_bidx = (
            _blind_index(secret_key, telefono_digits, "phone")
            if telefono_digits
            else None
        )

        bind.execute(
            sa.text(
                """
                UPDATE pacientes
                SET
                    dni_nie = :dni_nie,
                    dni_nie_bidx = :dni_bidx,
                    nombre_completo = :nombre,
                    nombre_completo_bidx = :nombre_bidx,
                    telefono = :telefono,
                    telefono_bidx = :telefono_bidx
                WHERE id = :id
                """
            ),
            {
                "id": paciente_id,
                "dni_nie": dni_enc,
                "dni_bidx": dni_bidx,
                "nombre": nombre_enc,
                "nombre_bidx": nombre_bidx,
                "telefono": telefono_enc,
                "telefono_bidx": telefono_bidx,
            },
        )

    # 3) Índices: sustituimos el unique index del DNI en claro por el blind index.
    op.drop_index(op.f("ix_pacientes_dni_nie"), table_name="pacientes")

    op.create_index(
        op.f("ix_pacientes_dni_nie_bidx"),
        "pacientes",
        ["dni_nie_bidx"],
        unique=True,
    )
    op.create_index(
        op.f("ix_pacientes_nombre_completo_bidx"),
        "pacientes",
        ["nombre_completo_bidx"],
        unique=False,
    )
    op.create_index(
        op.f("ix_pacientes_telefono_bidx"),
        "pacientes",
        ["telefono_bidx"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    secret_key = os.getenv("SECRET_KEY", "")
    enc_key = os.getenv("ENCRYPTION_KEY", "")
    if not secret_key or not enc_key:
        raise RuntimeError(
            "Faltan SECRET_KEY/ENCRYPTION_KEY en entorno para downgradear pacientes."
        )

    fernet = Fernet(enc_key.encode("utf-8"))
    bind = op.get_bind()

    rows = bind.execute(
        sa.text("SELECT id, dni_nie, nombre_completo, telefono FROM pacientes")
    ).fetchall()

    for row in rows:
        paciente_id = row[0]
        dni_raw = row[1]
        nombre_raw = row[2]
        telefono_raw = row[3]

        dni_plain = _decrypt_if_fernet(fernet, dni_raw) or ""
        dni_norm = dni_plain.strip().upper().replace("-", "").replace(" ", "")[:20]

        nombre_plain = _decrypt_if_fernet(fernet, nombre_raw) or ""
        nombre_title = nombre_plain.strip().title()[:100]

        telefono_plain = _decrypt_if_fernet(fernet, telefono_raw)
        telefono_clean = telefono_plain.strip() if telefono_plain else None
        telefono_clean = telefono_clean[:20] if telefono_clean else None

        bind.execute(
            sa.text(
                """
                UPDATE pacientes
                SET
                    dni_nie = :dni,
                    nombre_completo = :nombre,
                    telefono = :telefono,
                    dni_nie_bidx = NULL,
                    nombre_completo_bidx = NULL,
                    telefono_bidx = NULL
                WHERE id = :id
                """
            ),
            {
                "id": paciente_id,
                "dni": dni_norm,
                "nombre": nombre_title,
                "telefono": telefono_clean,
            },
        )

    op.drop_index(op.f("ix_pacientes_telefono_bidx"), table_name="pacientes")
    op.drop_index(op.f("ix_pacientes_nombre_completo_bidx"), table_name="pacientes")
    op.drop_index(op.f("ix_pacientes_dni_nie_bidx"), table_name="pacientes")

    op.create_index(
        op.f("ix_pacientes_dni_nie"),
        "pacientes",
        ["dni_nie"],
        unique=True,
    )

    op.alter_column(
        "pacientes",
        "telefono",
        existing_type=sa.String(length=255),
        type_=sa.String(length=20),
        existing_nullable=True,
    )
    op.alter_column(
        "pacientes",
        "nombre_completo",
        existing_type=sa.String(length=255),
        type_=sa.String(length=100),
        existing_nullable=False,
    )
    op.alter_column(
        "pacientes",
        "dni_nie",
        existing_type=sa.String(length=255),
        type_=sa.String(length=20),
        existing_nullable=False,
    )

    op.drop_column("pacientes", "telefono_bidx")
    op.drop_column("pacientes", "nombre_completo_bidx")
    op.drop_column("pacientes", "dni_nie_bidx")
