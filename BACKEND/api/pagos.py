from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.session import get_db
from models.base import Pago, Cita
from schemas.pago_schema import PagoWebhook

router = APIRouter()


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
