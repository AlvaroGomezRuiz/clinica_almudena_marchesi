from __future__ import annotations

import json
import os

import stripe

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from db.session import get_db
from utils.security import get_current_user
from models.base import Cita, Paciente, Pago, Servicio, Usuario
from schemas.stripe_schema import CreateCheckoutRequest

router = APIRouter()


PLAN_CATALOG: dict[str, tuple[str, int]] = {
    "sesion_50_eur": ("Sesión Individual", 5000),
    "individual": ("Terapia Individual", 6000),
    "pareja": ("Terapia de Pareja (90 min)", 9000),
    "bono5": ("Bono 5 Sesiones", 27500),
    "bono10": ("Bono 10 Sesiones", 53000),
}


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    raw_body = await request.body()

    try:
        payload = json.loads(raw_body)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="JSON inválido") from exc

    event_id = payload.get("id")
    if not isinstance(event_id, str) or not event_id.strip():
        raise HTTPException(status_code=400, detail="Evento Stripe sin id")

    try:
        existing = db.query(Pago).filter(Pago.stripe_event_id == event_id).first()
        if existing:
            return {"status": "ok"}

        # Simulación: aquí se usaría payload['type'] y payload['data']['object']
        # para localizar el pago real (por metadata) y marcarlo como Completado/Fallido.
        pago = (
            db.query(Pago)
            .filter(
                Pago.estado_transaccion == "Pendiente", Pago.stripe_event_id.is_(None)
            )
            .order_by(Pago.fecha_pago.asc())
            .first()
        )

        if pago:
            # Nota: nuestros modelos usan SQLAlchemy 1.x (Column en la clase).
            # En runtime, el atributo del instance es un str, pero Pylance lo ve como Column[str].
            setattr(pago, "stripe_event_id", event_id)

            event_type = payload.get("type")
            if isinstance(event_type, str):
                if event_type in {
                    "checkout.session.completed",
                    "payment_intent.succeeded",
                }:
                    setattr(pago, "estado_transaccion", "Completado")
                elif event_type in {
                    "payment_intent.payment_failed",
                    "checkout.session.expired",
                }:
                    setattr(pago, "estado_transaccion", "Fallido")

        db.commit()
        return {"status": "ok"}
    except Exception:
        db.rollback()
        raise


@router.post("/create-checkout-session")
def create_checkout_session(
    data: CreateCheckoutRequest,
    db: Session = Depends(get_db),
    current_username: str = Depends(get_current_user),
):
    try:
        usuario = db.query(Usuario).filter(Usuario.username == current_username).first()
        if not usuario:
            raise HTTPException(status_code=401, detail="Sesión inválida")
        if not bool(getattr(usuario, "is_active", True)):
            raise HTTPException(status_code=403, detail="Cuenta desactivada")

        cita_id: str | None = None
        servicio_id: str | None = None
        paciente_id: str | None = None

        descripcion = "Sesión (50€)"
        importe_centimos = 5000

        cita: Cita | None = None
        servicio: Servicio | None = None

        if data.cita_id:
            cita = db.query(Cita).filter(Cita.id == data.cita_id).first()
            if not cita:
                raise HTTPException(status_code=404, detail="Cita no encontrada")

            cita_id_value = getattr(cita, "id", None)
            cita_id = str(cita_id_value) if cita_id_value else None

            paciente_id_value = getattr(cita, "paciente_id", None)
            paciente_id = str(paciente_id_value) if paciente_id_value else None

            servicio = (
                db.query(Servicio).filter(Servicio.id == cita.servicio_id).first()
            )
            if servicio:
                servicio_id_value = getattr(servicio, "id", None)
                servicio_id = str(servicio_id_value) if servicio_id_value else None

                descripcion = str(getattr(servicio, "nombre", descripcion))
                importe_centimos = int(
                    getattr(servicio, "precio_centimos", importe_centimos)
                )

            if not bool(getattr(usuario, "is_admin", False)):
                cita_paciente_id = getattr(cita, "paciente_id", None)
                paciente = (
                    db.query(Paciente).filter(Paciente.id == cita_paciente_id).first()
                )
                if not paciente:
                    raise HTTPException(status_code=403, detail="No autorizado")

                paciente_email = str(getattr(paciente, "email", ""))
                if paciente_email != current_username:
                    raise HTTPException(status_code=403, detail="No autorizado")

        elif data.servicio_id:
            servicio_id = data.servicio_id

            plan = PLAN_CATALOG.get(data.servicio_id)
            if plan:
                descripcion, importe_centimos = plan
            else:
                servicio = (
                    db.query(Servicio).filter(Servicio.id == data.servicio_id).first()
                )
                if not servicio:
                    raise HTTPException(
                        status_code=404, detail="Servicio no encontrado"
                    )
                descripcion = str(getattr(servicio, "nombre", descripcion))
                importe_centimos = int(
                    getattr(servicio, "precio_centimos", importe_centimos)
                )

            paciente = (
                db.query(Paciente).filter(Paciente.email == current_username).first()
            )
            if not paciente:
                raise HTTPException(status_code=404, detail="Paciente no encontrado")
            paciente_id_value = getattr(paciente, "id", None)
            paciente_id = str(paciente_id_value) if paciente_id_value else None

        else:
            paciente = (
                db.query(Paciente).filter(Paciente.email == current_username).first()
            )
            if not paciente:
                raise HTTPException(status_code=404, detail="Paciente no encontrado")
            paciente_id_value = getattr(paciente, "id", None)
            paciente_id = str(paciente_id_value) if paciente_id_value else None

        if not paciente_id:
            raise HTTPException(status_code=400, detail="Paciente inválido")

        pago = Pago(
            paciente_id=paciente_id,
            cita_id=cita_id,
            bono_id=None,
            referencia_redsys=None,
            importe_centimos=importe_centimos,
            estado_transaccion="Pendiente",
            activo=True,
        )
        db.add(pago)
        db.flush()

        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        stripe_secret_key = os.getenv("STRIPE_SECRET_KEY", "").strip()

        if stripe_secret_key:
            stripe.api_key = stripe_secret_key
            session = stripe.checkout.Session.create(
                mode="payment",
                line_items=[
                    {
                        "price_data": {
                            "currency": "eur",
                            "product_data": {"name": descripcion},
                            "unit_amount": importe_centimos,
                        },
                        "quantity": 1,
                    }
                ],
                metadata={
                    "pago_id": str(pago.id),
                    "paciente_id": str(paciente_id),
                    "cita_id": str(cita_id) if cita_id else "",
                    "servicio_id": str(servicio_id) if servicio_id else "",
                },
                success_url=f"{frontend_url}/portal/citas?stripe=success",
                cancel_url=f"{frontend_url}/portal/citas?stripe=cancel",
            )
            checkout_url = getattr(session, "url", None)
            if not isinstance(checkout_url, str) or not checkout_url.strip():
                raise HTTPException(
                    status_code=500, detail="Stripe no devolvió checkout_url"
                )
        else:
            checkout_url = (
                f"{frontend_url}/portal/citas?stripe=simulated&pago_id={pago.id}"
            )

        db.commit()
        return {"checkout_url": checkout_url}
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise
