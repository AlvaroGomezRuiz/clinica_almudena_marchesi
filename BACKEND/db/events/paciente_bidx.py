from __future__ import annotations

import hashlib
import hmac
from typing import Optional

from sqlalchemy import event

from models.base import Paciente
from utils.config import settings


def _bidx(value: Optional[str], context: str) -> Optional[str]:
    if value is None:
        return None
    v = value.strip()
    if not v:
        return None
    msg = f"{context}:{v}".encode("utf-8")
    return hmac.new(settings.SECRET_KEY.encode("utf-8"), msg, hashlib.sha256).hexdigest()


@event.listens_for(Paciente, "before_insert")
@event.listens_for(Paciente, "before_update")
def _paciente_set_blind_indexes(mapper, connection, target: Paciente) -> None:
    # Nota: los campos pueden estar cifrados en DB; aquí trabajamos con el plaintext
    # en memoria (antes de persistencia).
    target.dni_nie_bidx = _bidx(getattr(target, "dni_nie", None), "dni")  # type: ignore[assignment]
    target.nombre_completo_bidx = _bidx(  # type: ignore[assignment]
        getattr(target, "nombre_completo", None), "nombre"
    )
    target.telefono_bidx = _bidx(getattr(target, "telefono", None), "telefono")  # type: ignore[assignment]

