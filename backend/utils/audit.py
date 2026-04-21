"""
Audit Logs Inmutables — Cadena de Integridad SHA-256.

Cada registro incluye un hash_integridad calculado como:
    SHA-256(ID_registro_anterior + ID_usuario + accion + timestamp)

Si se borra un registro, la cadena de hashes se rompe,
detectando la alteración de forma forense.
"""

from __future__ import annotations

import hashlib
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from models.base import Auditoria


def _compute_integrity_hash(
    prev_record_id: str,
    usuario_id: int,
    accion: str,
    timestamp: datetime,
) -> str:
    """Genera el SHA-256 de la cadena de integridad."""
    raw = f"{prev_record_id}|{usuario_id}|{accion}|{timestamp.isoformat()}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _get_last_audit_id(db: Session) -> str:
    """Obtiene el ID del último registro de auditoría (o cadena vacía si es el génesis)."""
    last: Optional[Auditoria] = (
        db.query(Auditoria)
        .order_by(Auditoria.timestamp.desc())
        .first()
    )
    if last is None:
        return ""
    return str(last.id)


def registrar_accion(
    db: Session,
    usuario_id: str,
    accion: str,
    tabla: Optional[str] = None,
    registro_id: Optional[str] = None,
    detalles: Optional[str] = None,
) -> Auditoria:
    """Registra una acción de auditoría con hash de integridad encadenado.

    El hash se calcula como SHA-256(prev_id + user_id + accion + timestamp).
    No se hace db.commit() para que el log viaje en la misma transacción
    que el cambio principal.
    """
    now = datetime.utcnow()
    prev_id = _get_last_audit_id(db)

    integrity_hash = _compute_integrity_hash(
        prev_record_id=prev_id,
        usuario_id=int(usuario_id),
        accion=accion,
        timestamp=now,
    )

    log = Auditoria(
        usuario_id=usuario_id,
        accion=accion,
        tabla_afectada=tabla,
        registro_id=registro_id,
        detalles=detalles,
        timestamp=now,
        hash_integridad=integrity_hash,
    )
    db.add(log)
    # Importante: No hacemos db.commit() aquí para que el log
    # viaje en la misma transacción que el cambio principal.
    return log


def verificar_cadena_integridad(db: Session) -> tuple[bool, Optional[str]]:
    """Verifica la cadena completa de hashes de auditoría.

    Retorna (True, None) si la cadena es íntegra, o
    (False, id_registro_corrupto) si se detecta alteración.
    """
    registros = (
        db.query(Auditoria)
        .order_by(Auditoria.timestamp.asc())
        .all()
    )

    prev_id = ""
    for registro in registros:
        expected_hash = _compute_integrity_hash(
            prev_record_id=prev_id,
            usuario_id=int(registro.usuario_id),
            accion=str(registro.accion),
            timestamp=registro.timestamp,
        )
        if registro.hash_integridad != expected_hash:
            return False, str(registro.id)
        prev_id = str(registro.id)

    return True, None
