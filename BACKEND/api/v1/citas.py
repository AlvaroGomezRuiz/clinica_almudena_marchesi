from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional, cast

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_
from sqlalchemy.orm import Session

from db.session import get_db
from models.base import AgendaBloqueo, Cita, Paciente, Servicio
from schemas.citas_schema import (
    CitaReserveRequest,
    CitaReserveResponse,
    FreeSlotItem,
    FreeSlotsResponse,
)
from utils.security import get_current_user

router = APIRouter()


def _round_up(dt: datetime, minutes: int) -> datetime:
    """Redondea hacia arriba al siguiente múltiplo de `minutes`."""

    if minutes <= 0:
        raise ValueError("minutes debe ser > 0")
    discard = timedelta(
        minutes=dt.minute % minutes,
        seconds=dt.second,
        microseconds=dt.microsecond,
    )
    if discard == timedelta(0):
        return dt.replace(second=0, microsecond=0)
    return (dt + (timedelta(minutes=minutes) - discard)).replace(second=0, microsecond=0)


def _overlaps(a_start: datetime, a_end: datetime, b_start: datetime, b_end: datetime) -> bool:
    return a_start < b_end and a_end > b_start


@router.get("/slots", response_model=FreeSlotsResponse)
def list_free_slots(
    from_iso: datetime = Query(...),
    to_iso: datetime = Query(...),
    duration_min: int = Query(..., ge=5, le=240),
    servicio_id: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
) -> FreeSlotsResponse:
    if to_iso <= from_iso:
        raise HTTPException(status_code=400, detail="Rango inválido")

    # Si se especifica servicio, validamos existencia y usamos su duración.
    if servicio_id:
        servicio = (
            db.query(Servicio)
            .filter(Servicio.id == servicio_id, Servicio.activo == True)
            .first()
        )
        if not servicio:
            raise HTTPException(status_code=404, detail="Servicio no encontrado")
        duration_min = cast(int, getattr(servicio, "duracion_minutos"))

    # Query de colisiones en el rango.
    citas = (
        db.query(Cita)
        .filter(
            Cita.activo == True,
            and_(Cita.inicio_iso < to_iso, Cita.fin_iso > from_iso),
        )
        .all()
    )
    bloqueos = (
        db.query(AgendaBloqueo)
        .filter(
            AgendaBloqueo.activo == True,
            and_(AgendaBloqueo.inicio_iso < to_iso, AgendaBloqueo.fin_iso > from_iso),
        )
        .all()
    )

    busy: list[tuple[datetime, datetime]] = []
    for c in citas:
        busy.append((cast(datetime, c.inicio_iso), cast(datetime, c.fin_iso)))
    for b in bloqueos:
        busy.append((cast(datetime, b.inicio_iso), cast(datetime, b.fin_iso)))

    # Construcción de slots:
    # - granularidad fija 15m para evitar explosión de combinaciones.
    step = 15
    cursor = _round_up(from_iso, step)
    end = to_iso

    items: list[FreeSlotItem] = []
    while cursor + timedelta(minutes=duration_min) <= end:
        slot_end = cursor + timedelta(minutes=duration_min)
        if not any(_overlaps(cursor, slot_end, s, e) for s, e in busy):
            items.append(FreeSlotItem(inicio_iso=cursor, fin_iso=slot_end))
        cursor = cursor + timedelta(minutes=step)

    return FreeSlotsResponse(items=items)


@router.post("/reservar", response_model=CitaReserveResponse)
def reserve_cita(
    payload: CitaReserveRequest,
    db: Session = Depends(get_db),
    current_username: str = Depends(get_current_user),
) -> CitaReserveResponse:
    paciente = (
        db.query(Paciente)
        .filter(Paciente.email == current_username, Paciente.activo == True)
        .first()
    )
    if not paciente:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No autorizado: paciente no encontrado",
        )

    servicio = (
        db.query(Servicio)
        .filter(Servicio.id == payload.servicio_id, Servicio.activo == True)
        .first()
    )
    if not servicio:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")

    inicio_iso = payload.inicio_iso
    fin_iso = inicio_iso + timedelta(minutes=cast(int, servicio.duracion_minutos))

    # Anti-solape transaccional
    try:
        with db.begin():
            # Bloqueos
            bloqueo = (
                db.query(AgendaBloqueo)
                .filter(
                    AgendaBloqueo.activo == True,
                    and_(inicio_iso < AgendaBloqueo.fin_iso, fin_iso > AgendaBloqueo.inicio_iso),
                )
                .with_for_update()
                .first()
            )
            if bloqueo:
                raise HTTPException(status_code=409, detail="Conflicto: horario bloqueado")

            # Citas
            colision = (
                db.query(Cita)
                .filter(
                    Cita.activo == True,
                    and_(inicio_iso < Cita.fin_iso, fin_iso > Cita.inicio_iso),
                )
                .with_for_update()
                .first()
            )
            if colision:
                raise HTTPException(status_code=409, detail="Conflicto: slot no disponible")

            nueva = Cita(
                paciente_id=cast(str, paciente.id),
                servicio_id=cast(str, servicio.id),
                inicio_iso=inicio_iso,
                fin_iso=fin_iso,
                estado="Confirmada",
                activo=True,
            )
            db.add(nueva)
            db.flush()
            db.refresh(nueva)

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Error interno al reservar cita",
        )

    return CitaReserveResponse(
        cita_id=cast(str, nueva.id),
        inicio_iso=cast(datetime, nueva.inicio_iso),
        fin_iso=cast(datetime, nueva.fin_iso),
        estado=cast(str, nueva.estado),
    )

