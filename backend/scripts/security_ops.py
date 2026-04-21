from __future__ import annotations

import sys
from pathlib import Path

from cryptography.fernet import Fernet
from sqlalchemy import select
from sqlalchemy.orm import Session

# Permitir ejecución directa como script desde backend/scripts
_root_path = Path(__file__).resolve().parents[1]
if str(_root_path) not in sys.path:
    sys.path.insert(0, str(_root_path))

from models.base import Mensajes, Pago


def sync_pending_stripe_payments(db: Session) -> None:
    try:
        pending_payments = db.scalars(
            select(Pago).where(Pago.estado_transaccion == "Pendiente")
        ).all()

        for pago in pending_payments:
            # Simulación: aquí iría la llamada real a Stripe para consultar el PaymentIntent/Session.
            last_char = (pago.id or "")[-1:].lower()
            simulated_status = "Completado" if last_char in "02468ace" else "Fallido"

            pago.estado_transaccion = simulated_status  # type: ignore

        db.commit()
    except Exception:
        db.rollback()
        raise


def rotate_chat_keys(
    db: Session,
    old_key: bytes,
    new_key: bytes,
    old_version: str,
    new_version: str,
) -> None:
    old_fernet = Fernet(old_key)
    new_fernet = Fernet(new_key)

    batch_size = 100

    try:
        while True:
            batch = db.scalars(
                select(Mensajes)
                .where(Mensajes.encryption_version == old_version)
                .order_by(Mensajes.created_at.asc(), Mensajes.id.asc())
                .limit(batch_size)
            ).all()

            if not batch:
                break

            for message in batch:
                plaintext = old_fernet.decrypt(message.body_ciphertext.encode()).decode(
                    "utf-8"
                )
                message.body_ciphertext = new_fernet.encrypt(
                    plaintext.encode("utf-8")
                ).decode("utf-8")
                message.encryption_version = new_version

            db.commit()

    except Exception:
        db.rollback()
        raise
