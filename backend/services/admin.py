from __future__ import annotations

from datetime import date, datetime, time, timedelta
from typing import Optional, cast

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from db.session import get_db
from models.base import (
    BonoPaciente,
    Cita,
    Paciente,
    Pago,
    Servicio,
    UserSession,
    Usuario,
)
from schemas.admin_schema import (
    AdminAgendaItem,
    AdminBonoAlertaItem,
    AdminStatsResponse,
)
from services.auth import _get_user_role, _load_session_from_request
from utils.security import decrypt_data

router = APIRouter()


def _decrypt_if_fernet(value: Optional[str]) -> str:
    if value is None or value == "":
        return ""

    if value.startswith("gAAAA"):
        decrypted = decrypt_data(value)
        if decrypted.startswith("[DATOS CORRUPTOS"):
            return value
        return decrypted

    return value


def require_admin_verified_session(
    request: Request, db: Session = Depends(get_db)
) -> tuple[Usuario, UserSession]:
    _payload, usuario, sesion = _load_session_from_request(request, db)
    role = _get_user_role(usuario)

    if role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado"
        )

    now = datetime.utcnow()
    verified_at = getattr(sesion, "mfa_verified_at", None)
    if not verified_at or (now - verified_at) > timedelta(hours=24):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="MFA requerido",
        )

    return usuario, sesion


def _get_week_range(reference: date) -> tuple[date, date]:
    week_start = reference - timedelta(days=reference.weekday())
    week_end = week_start + timedelta(days=6)
    return week_start, week_end


@router.get("/stats", response_model=AdminStatsResponse)
def get_admin_stats(
    request: Request,
    db: Session = Depends(get_db),
    _admin_ctx: tuple[Usuario, UserSession] = Depends(require_admin_verified_session),
    reference_date: Optional[date] = Query(default=None),
):
    ref = reference_date or datetime.utcnow().date()
    week_start, week_end = _get_week_range(ref)

    week_start_dt = datetime.combine(week_start, time.min)
    week_end_exclusive_dt = datetime.combine(week_end + timedelta(days=1), time.min)

    pacientes_activos_total = cast(
        int,
        (
            db.query(func.count(Paciente.id)).filter(Paciente.activo == True).scalar()
            or 0
        ),
    )

    citas_semana_total = cast(
        int,
        (
            db.query(func.count(Cita.id))
            .filter(
                Cita.activo == True,
                Cita.inicio_iso >= week_start_dt,
                Cita.inicio_iso < week_end_exclusive_dt,
            )
            .scalar()
            or 0
        ),
    )

    pacientes_nuevos_semana = cast(
        int,
        (
            db.query(func.count(Paciente.id))
            .filter(
                Paciente.activo == True,
                Paciente.fecha_alta >= week_start,
                Paciente.fecha_alta <= week_end,
            )
            .scalar()
            or 0
        ),
    )

    ingresos_semana_centimos = cast(
        int,
        (
            db.query(func.coalesce(func.sum(Pago.importe_centimos), 0))
            .filter(
                Pago.activo == True,
                Pago.estado_transaccion == "Completado",
                Pago.fecha_pago >= week_start_dt,
                Pago.fecha_pago < week_end_exclusive_dt,
            )
            .scalar()
            or 0
        ),
    )

    today = datetime.utcnow().date()
    today_start = datetime.combine(today, time.min)
    today_end = today_start + timedelta(days=1)

    agenda_rows = (
        db.query(Cita, Paciente, Servicio)
        .join(Paciente, Cita.paciente_id == Paciente.id)
        .join(Servicio, Cita.servicio_id == Servicio.id)
        .filter(
            Cita.activo == True,
            Cita.inicio_iso >= today_start,
            Cita.inicio_iso < today_end,
        )
        .order_by(Cita.inicio_iso.asc())
        .all()
    )

    agenda_hoy: list[AdminAgendaItem] = []
    for cita, paciente, servicio in agenda_rows:
        agenda_hoy.append(
            AdminAgendaItem(
                cita_id=cita.id,
                inicio_iso=cita.inicio_iso,
                fin_iso=cita.fin_iso,
                estado=cita.estado,
                paciente_id=paciente.id,
                paciente_nombre=_decrypt_if_fernet(
                    getattr(paciente, "nombre_completo", None)
                ),
                servicio_id=servicio.id,
                servicio_nombre=cast(str, getattr(servicio, "nombre", "")) or "",
            )
        )

    remaining_expr = BonoPaciente.sesiones_totales - BonoPaciente.sesiones_consumidas
    bonos_rows = (
        db.query(BonoPaciente, Paciente, Servicio)
        .join(Paciente, BonoPaciente.paciente_id == Paciente.id)
        .join(Servicio, BonoPaciente.servicio_id == Servicio.id)
        .filter(
            BonoPaciente.activo == True,
            remaining_expr <= 2,
        )
        .order_by(remaining_expr.asc())
        .limit(10)
        .all()
    )

    alertas_bonos: list[AdminBonoAlertaItem] = []
    for bono, paciente, servicio in bonos_rows:
        restantes = max(
            0,
            cast(int, getattr(bono, "sesiones_totales", 0))
            - cast(int, getattr(bono, "sesiones_consumidas", 0)),
        )
        alertas_bonos.append(
            AdminBonoAlertaItem(
                bono_id=bono.id,
                paciente_id=paciente.id,
                paciente_nombre=_decrypt_if_fernet(
                    getattr(paciente, "nombre_completo", None)
                ),
                servicio_id=servicio.id,
                servicio_nombre=cast(str, getattr(servicio, "nombre", "")) or "",
                sesiones_totales=cast(int, getattr(bono, "sesiones_totales", 0)),
                sesiones_consumidas=cast(int, getattr(bono, "sesiones_consumidas", 0)),
                sesiones_restantes=restantes,
                estado=cast(str, getattr(bono, "estado", "")) or "",
            )
        )

    return AdminStatsResponse(
        week_start=week_start,
        week_end=week_end,
        citas_semana_total=citas_semana_total,
        pacientes_activos_total=pacientes_activos_total,
        pacientes_nuevos_semana=pacientes_nuevos_semana,
        ingresos_semana_centimos=ingresos_semana_centimos,
        agenda_hoy=agenda_hoy,
        alertas_bonos=alertas_bonos,
    )
