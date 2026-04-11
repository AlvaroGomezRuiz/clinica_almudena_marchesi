from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.session import get_db
from core.security import get_current_user
from models.base import Pago, Cita, Paciente, Usuario
from schemas.pago_schema import PagoWebhook

router = APIRouter()


@router.get("/access-status")
def access_status(
    db: Session = Depends(get_db),
    current_username: str = Depends(get_current_user),
):
    usuario = db.query(Usuario).filter(Usuario.username == current_username).first()
    if not usuario or not bool(usuario.is_active):
        raise HTTPException(status_code=401, detail="Sesión inválida")

    is_admin = bool(usuario.is_admin)
    if is_admin:
        return {"has_paid": True, "is_admin": True}

    paciente = (
        db.query(Paciente)
        .filter(Paciente.email == current_username, Paciente.activo == True)
        .first()
    )

    if not paciente:
        return {"has_paid": False, "is_admin": False}

    pago_ok = (
        db.query(Pago)
        .filter(
            Pago.paciente_id == paciente.id,
            Pago.activo == True,
            Pago.estado_transaccion == "Completado",
        )
        .first()
    )

    return {"has_paid": bool(pago_ok), "is_admin": False}


@router.post("/webhook")
def recibir_pago_redsys(notificacion: PagoWebhook, db: Session = Depends(get_db)):
    # 1. Localizar la cita bloqueada temporalmente
    cita = db.query(Cita).filter(Cita.id == notificacion.id_cita).first()
    if not cita:
        raise HTTPException(
            status_code=404, detail="Cita no encontrada para este pago."
        )

    # 2. Registrar el pago en la bóveda
    nuevo_pago = Pago(
        paciente_id=cita.paciente_id,
        cita_id=cita.id,
        referencia_redsys=notificacion.referencia_redsys,
        importe_centimos=notificacion.importe_centimos,
        estado_transaccion=(
            "Completado" if notificacion.resultado == "OK" else "Fallido"
        ),
    )

    # 3. Si el pago es OK, confirmar la cita definitivamente
    if notificacion.resultado == "OK":
        cita.estado = "Confirmada_Pagada"  # type: ignore
    else:
        cita.estado = "Cancelada_Impago"  # type: ignore

    db.add(nuevo_pago)
    db.commit()
    return {"status": "Procesado", "transaccion": nuevo_pago.id}
