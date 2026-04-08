from sqlalchemy.orm import Session
from models.base import Auditoria


def registrar_accion(db: Session, usuario_id: str, accion: str, tabla: str = None, registro_id: str = None, detalles: str = None):  # type: ignore
    log = Auditoria(
        usuario_id=usuario_id,
        accion=accion,
        tabla_afectada=tabla,
        registro_id=registro_id,
        detalles=detalles,
    )
    db.add(log)
    # Importante: No hacemos db.commit() aquí para que el log
    # viaje en la misma transacción que el cambio principal.
