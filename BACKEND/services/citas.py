from datetime import date, datetime, time, timedelta
from typing import Optional, cast

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_
from db.session import get_db
from models.base import AgendaBloqueo, AgendaNotaDia, Cita, Paciente, Servicio
from schemas.agenda_schema import (
    AdminDayAgendaResponse,
    AdminManualCitaCreate,
    AdminMonthAgendaResponse,
    AdminWeekAgendaResponse,
    AgendaBloqueoCreate,
    AgendaBloqueoItem,
    AgendaNotaDiaResponse,
    AgendaNotaDiaUpsert,
)
from schemas.admin_schema import AdminAgendaItem, AdminWeekCitasResponse
from schemas.citas_schema import CitaCreate, CitaResponse
from services.admin import require_admin_verified_session
from utils.security import decrypt_data, encrypt_data

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


def _month_range(reference: date) -> tuple[date, date, date]:
    month_start = date(reference.year, reference.month, 1)
    if reference.month == 12:
        next_month = date(reference.year + 1, 1, 1)
    else:
        next_month = date(reference.year, reference.month + 1, 1)
    month_end = next_month - timedelta(days=1)
    return month_start, month_end, next_month


def _serialize_bloqueo_item(b: AgendaBloqueo) -> AgendaBloqueoItem:
    return AgendaBloqueoItem(
        id=cast(str, getattr(b, "id")),
        inicio_iso=cast(datetime, getattr(b, "inicio_iso")),
        fin_iso=cast(datetime, getattr(b, "fin_iso")),
        motivo=cast(Optional[str], getattr(b, "motivo", None)),
    )


@router.post("/", response_model=CitaResponse)
def agendar_cita(cita: CitaCreate, db: Session = Depends(get_db)):
    # 1. Verificación de existencia
    if not db.query(Paciente).filter(Paciente.id == cita.paciente_id).first():
        raise HTTPException(status_code=404, detail="Error: Paciente no existe.")

    if not db.query(Servicio).filter(Servicio.id == cita.servicio_id).first():
        raise HTTPException(status_code=404, detail="Error: Servicio no existe.")

    # 2. Colisión con bloqueos de agenda
    bloqueo = (
        db.query(AgendaBloqueo)
        .filter(
            AgendaBloqueo.activo == True,
            and_(
                cita.inicio_iso < AgendaBloqueo.fin_iso,
                cita.fin_iso > AgendaBloqueo.inicio_iso,
            ),
        )
        .first()
    )
    if bloqueo:
        raise HTTPException(
            status_code=400,
            detail=f"Conflicto de agenda: Horario bloqueado de {bloqueo.inicio_iso} a {bloqueo.fin_iso}",
        )

    # 3. MOTOR DE COLISIONES (Lógica de solapamiento)
    # Una cita solapa si: (Nueva_Inicio < Existente_Fin) Y (Nueva_Fin > Existente_Inicio)
    colision = (
        db.query(Cita)
        .filter(
            Cita.activo == True,
            and_(cita.inicio_iso < Cita.fin_iso, cita.fin_iso > Cita.inicio_iso),
        )
        .first()
    )

    if colision:
        raise HTTPException(
            status_code=400,
            detail=f"Conflicto de agenda: Ya existe una cita de {colision.inicio_iso} a {colision.fin_iso}",
        )

    # 4. Registro en BBDD
    nueva_cita = Cita(
        paciente_id=cita.paciente_id,
        servicio_id=cita.servicio_id,
        inicio_iso=cita.inicio_iso,
        fin_iso=cita.fin_iso,
        estado="Confirmada",
    )
    db.add(nueva_cita)
    db.commit()
    db.refresh(nueva_cita)
    return nueva_cita


@router.post("/admin", response_model=CitaResponse)
def agendar_cita_admin(
    cita: CitaCreate,
    db: Session = Depends(get_db),
    _admin_ctx=Depends(require_admin_verified_session),
):
    # 1. Verificación de existencia
    if not db.query(Paciente).filter(Paciente.id == cita.paciente_id).first():
        raise HTTPException(status_code=404, detail="Error: Paciente no existe.")

    if not db.query(Servicio).filter(Servicio.id == cita.servicio_id).first():
        raise HTTPException(status_code=404, detail="Error: Servicio no existe.")

    # 2. Colisión con bloqueos de agenda
    bloqueo = (
        db.query(AgendaBloqueo)
        .filter(
            AgendaBloqueo.activo == True,
            and_(
                cita.inicio_iso < AgendaBloqueo.fin_iso,
                cita.fin_iso > AgendaBloqueo.inicio_iso,
            ),
        )
        .first()
    )
    if bloqueo:
        raise HTTPException(
            status_code=400,
            detail=f"Conflicto de agenda: Horario bloqueado de {bloqueo.inicio_iso} a {bloqueo.fin_iso}",
        )

    # 2. MOTOR DE COLISIONES (Lógica de solapamiento)
    # Una cita solapa si: (Nueva_Inicio < Existente_Fin) Y (Nueva_Fin > Existente_Inicio)
    colision = (
        db.query(Cita)
        .filter(
            Cita.activo == True,
            and_(cita.inicio_iso < Cita.fin_iso, cita.fin_iso > Cita.inicio_iso),
        )
        .first()
    )

    if colision:
        raise HTTPException(
            status_code=400,
            detail=f"Conflicto de agenda: Ya existe una cita de {colision.inicio_iso} a {colision.fin_iso}",
        )

    # 3. Registro en BBDD
    nueva_cita = Cita(
        paciente_id=cita.paciente_id,
        servicio_id=cita.servicio_id,
        inicio_iso=cita.inicio_iso,
        fin_iso=cita.fin_iso,
        estado="Confirmada",
    )
    db.add(nueva_cita)
    db.commit()
    db.refresh(nueva_cita)
    return nueva_cita


@router.get("/", response_model=list[CitaResponse])
def listar_citas(db: Session = Depends(get_db)):
    return db.query(Cita).all()


@router.get("/admin", response_model=list[CitaResponse])
def listar_citas_admin(
    db: Session = Depends(get_db),
    _admin_ctx=Depends(require_admin_verified_session),
):
    return db.query(Cita).filter(Cita.activo == True).all()


@router.get("/semana", response_model=AdminWeekCitasResponse)
def listar_citas_semana(
    db: Session = Depends(get_db),
    _admin_ctx=Depends(require_admin_verified_session),
    reference_date: Optional[date] = Query(default=None),
):
    ref = reference_date or datetime.utcnow().date()
    week_start = ref - timedelta(days=ref.weekday())
    week_end = week_start + timedelta(days=6)

    week_start_dt = datetime.combine(week_start, time.min)
    week_end_exclusive_dt = datetime.combine(week_end + timedelta(days=1), time.min)

    rows = (
        db.query(Cita, Paciente, Servicio)
        .join(Paciente, Cita.paciente_id == Paciente.id)
        .join(Servicio, Cita.servicio_id == Servicio.id)
        .filter(
            Cita.activo == True,
            Cita.inicio_iso >= week_start_dt,
            Cita.inicio_iso < week_end_exclusive_dt,
        )
        .order_by(Cita.inicio_iso.asc())
        .all()
    )

    citas: list[AdminAgendaItem] = []
    for cita, paciente, servicio in rows:
        citas.append(
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

    return AdminWeekCitasResponse(week_start=week_start, week_end=week_end, citas=citas)


@router.get("/agenda-semana", response_model=AdminWeekAgendaResponse)
def listar_agenda_semana(
    db: Session = Depends(get_db),
    _admin_ctx=Depends(require_admin_verified_session),
    reference_date: Optional[date] = Query(default=None),
):
    ref = reference_date or datetime.utcnow().date()
    week_start = ref - timedelta(days=ref.weekday())
    week_end = week_start + timedelta(days=6)

    week_start_dt = datetime.combine(week_start, time.min)
    week_end_exclusive_dt = datetime.combine(week_end + timedelta(days=1), time.min)

    rows = (
        db.query(Cita, Paciente, Servicio)
        .join(Paciente, Cita.paciente_id == Paciente.id)
        .join(Servicio, Cita.servicio_id == Servicio.id)
        .filter(
            Cita.activo == True,
            Cita.inicio_iso >= week_start_dt,
            Cita.inicio_iso < week_end_exclusive_dt,
        )
        .order_by(Cita.inicio_iso.asc())
        .all()
    )

    citas: list[AdminAgendaItem] = []
    for cita, paciente, servicio in rows:
        citas.append(
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

    bloqueos_rows = (
        db.query(AgendaBloqueo)
        .filter(
            AgendaBloqueo.activo == True,
            and_(
                AgendaBloqueo.inicio_iso < week_end_exclusive_dt,
                AgendaBloqueo.fin_iso > week_start_dt,
            ),
        )
        .order_by(AgendaBloqueo.inicio_iso.asc())
        .all()
    )

    bloqueos: list[AgendaBloqueoItem] = []
    for b in bloqueos_rows:
        bloqueos.append(_serialize_bloqueo_item(b))

    return AdminWeekAgendaResponse(
        week_start=week_start,
        week_end=week_end,
        citas=citas,
        bloqueos=bloqueos,
    )


@router.get("/mes", response_model=AdminMonthAgendaResponse)
def listar_citas_mes(
    db: Session = Depends(get_db),
    _admin_ctx=Depends(require_admin_verified_session),
    reference_date: Optional[date] = Query(default=None),
):
    ref = reference_date or datetime.utcnow().date()
    month_start, month_end, next_month = _month_range(ref)

    month_start_dt = datetime.combine(month_start, time.min)
    month_end_exclusive_dt = datetime.combine(next_month, time.min)

    rows = (
        db.query(Cita, Paciente, Servicio)
        .join(Paciente, Cita.paciente_id == Paciente.id)
        .join(Servicio, Cita.servicio_id == Servicio.id)
        .filter(
            Cita.activo == True,
            Cita.inicio_iso >= month_start_dt,
            Cita.inicio_iso < month_end_exclusive_dt,
        )
        .order_by(Cita.inicio_iso.asc())
        .all()
    )

    citas: list[AdminAgendaItem] = []
    for cita, paciente, servicio in rows:
        citas.append(
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

    bloqueos_rows = (
        db.query(AgendaBloqueo)
        .filter(
            AgendaBloqueo.activo == True,
            and_(
                AgendaBloqueo.inicio_iso < month_end_exclusive_dt,
                AgendaBloqueo.fin_iso > month_start_dt,
            ),
        )
        .order_by(AgendaBloqueo.inicio_iso.asc())
        .all()
    )

    bloqueos: list[AgendaBloqueoItem] = []
    for b in bloqueos_rows:
        bloqueos.append(_serialize_bloqueo_item(b))

    return AdminMonthAgendaResponse(
        month_start=month_start,
        month_end=month_end,
        citas=citas,
        bloqueos=bloqueos,
    )


@router.get("/dia", response_model=AdminDayAgendaResponse)
def listar_agenda_dia(
    db: Session = Depends(get_db),
    _admin_ctx=Depends(require_admin_verified_session),
    dia: date = Query(...),
):
    day_start_dt = datetime.combine(dia, time.min)
    day_end_exclusive_dt = day_start_dt + timedelta(days=1)

    rows = (
        db.query(Cita, Paciente, Servicio)
        .join(Paciente, Cita.paciente_id == Paciente.id)
        .join(Servicio, Cita.servicio_id == Servicio.id)
        .filter(
            Cita.activo == True,
            Cita.inicio_iso >= day_start_dt,
            Cita.inicio_iso < day_end_exclusive_dt,
        )
        .order_by(Cita.inicio_iso.asc())
        .all()
    )

    citas: list[AdminAgendaItem] = []
    for cita, paciente, servicio in rows:
        citas.append(
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

    bloqueos_rows = (
        db.query(AgendaBloqueo)
        .filter(
            AgendaBloqueo.activo == True,
            and_(
                AgendaBloqueo.inicio_iso < day_end_exclusive_dt,
                AgendaBloqueo.fin_iso > day_start_dt,
            ),
        )
        .order_by(AgendaBloqueo.inicio_iso.asc())
        .all()
    )

    bloqueos: list[AgendaBloqueoItem] = []
    for b in bloqueos_rows:
        bloqueos.append(_serialize_bloqueo_item(b))

    nota_row = db.query(AgendaNotaDia).filter(AgendaNotaDia.dia == dia).first()
    nota_ciphertext = (
        cast(Optional[str], getattr(nota_row, "nota_ciphertext", None))
        if nota_row
        else None
    )
    nota = _decrypt_if_fernet(nota_ciphertext)

    return AdminDayAgendaResponse(
        dia=dia,
        citas=citas,
        bloqueos=bloqueos,
        nota=nota,
    )


@router.post("/bloqueos", response_model=AgendaBloqueoItem)
def crear_bloqueo_horario(
    payload: AgendaBloqueoCreate,
    db: Session = Depends(get_db),
    _admin_ctx=Depends(require_admin_verified_session),
):
    # Conflicto con citas existentes
    colision_cita = (
        db.query(Cita)
        .filter(
            Cita.activo == True,
            and_(payload.inicio_iso < Cita.fin_iso, payload.fin_iso > Cita.inicio_iso),
        )
        .first()
    )
    if colision_cita:
        raise HTTPException(
            status_code=400,
            detail=f"Conflicto: existe una cita de {colision_cita.inicio_iso} a {colision_cita.fin_iso}",
        )

    colision_bloqueo = (
        db.query(AgendaBloqueo)
        .filter(
            AgendaBloqueo.activo == True,
            and_(
                payload.inicio_iso < AgendaBloqueo.fin_iso,
                payload.fin_iso > AgendaBloqueo.inicio_iso,
            ),
        )
        .first()
    )
    if colision_bloqueo:
        raise HTTPException(
            status_code=400,
            detail="Conflicto: ya existe un bloqueo que solapa ese rango.",
        )

    bloqueo = AgendaBloqueo(
        inicio_iso=payload.inicio_iso,
        fin_iso=payload.fin_iso,
        motivo=(payload.motivo or "").strip() or None,
        activo=True,
    )
    db.add(bloqueo)
    db.commit()
    db.refresh(bloqueo)

    return AgendaBloqueoItem(
        id=cast(str, getattr(bloqueo, "id")),
        inicio_iso=cast(datetime, getattr(bloqueo, "inicio_iso")),
        fin_iso=cast(datetime, getattr(bloqueo, "fin_iso")),
        motivo=cast(Optional[str], getattr(bloqueo, "motivo", None)),
    )


@router.post("/notas-dia", response_model=AgendaNotaDiaResponse)
def upsert_nota_dia(
    payload: AgendaNotaDiaUpsert,
    db: Session = Depends(get_db),
    _admin_ctx=Depends(require_admin_verified_session),
):
    now = datetime.utcnow()
    nota_text = (payload.nota or "").strip()
    nota_ciphertext = encrypt_data(nota_text) if nota_text else ""

    row = db.query(AgendaNotaDia).filter(AgendaNotaDia.dia == payload.dia).first()
    if row:
        row.nota_ciphertext = nota_ciphertext  # type: ignore
        row.updated_at = now  # type: ignore
    else:
        row = AgendaNotaDia(
            dia=payload.dia,
            nota_ciphertext=nota_ciphertext,
            created_at=now,
            updated_at=now,
        )
        db.add(row)

    db.commit()

    return AgendaNotaDiaResponse(dia=payload.dia, nota=nota_text, updated_at=now)


@router.post("/manual", response_model=CitaResponse)
def crear_cita_manual_50min(
    payload: AdminManualCitaCreate,
    db: Session = Depends(get_db),
    _admin_ctx=Depends(require_admin_verified_session),
):
    paciente = (
        db.query(Paciente)
        .filter(Paciente.id == payload.paciente_id, Paciente.activo == True)
        .first()
    )
    if not paciente:
        raise HTTPException(status_code=404, detail="Error: Paciente no existe.")

    servicio: Optional[Servicio] = None
    if payload.servicio_id:
        servicio = (
            db.query(Servicio)
            .filter(
                Servicio.id == payload.servicio_id,
                Servicio.activo == True,
            )
            .first()
        )
        if not servicio:
            raise HTTPException(status_code=404, detail="Error: Servicio no existe.")
    else:
        servicio = (
            db.query(Servicio)
            .filter(Servicio.activo == True, Servicio.duracion_minutos == 50)
            .order_by(Servicio.nombre.asc())
            .first()
        )
        if not servicio:
            raise HTTPException(
                status_code=400,
                detail="No hay un servicio activo de 50 minutos. Crea/activa un servicio de 50 min.",
            )

    inicio_iso = payload.inicio_iso
    fin_iso = inicio_iso + timedelta(minutes=50)

    bloqueo = (
        db.query(AgendaBloqueo)
        .filter(
            AgendaBloqueo.activo == True,
            and_(
                inicio_iso < AgendaBloqueo.fin_iso, fin_iso > AgendaBloqueo.inicio_iso
            ),
        )
        .first()
    )
    if bloqueo:
        raise HTTPException(
            status_code=400,
            detail=f"Conflicto de agenda: Horario bloqueado de {bloqueo.inicio_iso} a {bloqueo.fin_iso}",
        )

    colision = (
        db.query(Cita)
        .filter(
            Cita.activo == True,
            and_(inicio_iso < Cita.fin_iso, fin_iso > Cita.inicio_iso),
        )
        .first()
    )
    if colision:
        raise HTTPException(
            status_code=400,
            detail=f"Conflicto de agenda: Ya existe una cita de {colision.inicio_iso} a {colision.fin_iso}",
        )

    nueva_cita = Cita(
        paciente_id=payload.paciente_id,
        servicio_id=servicio.id,
        inicio_iso=inicio_iso,
        fin_iso=fin_iso,
        estado="Confirmada",
    )
    db.add(nueva_cita)
    db.commit()
    db.refresh(nueva_cita)
    return nueva_cita


@router.delete("/{cita_id}")
def cancelar_cita_admin(
    cita_id: str,
    db: Session = Depends(get_db),
    _admin_ctx=Depends(require_admin_verified_session),
):
    cita = db.query(Cita).filter(Cita.id == cita_id).first()
    if not cita or not getattr(cita, "activo", False):
        raise HTTPException(status_code=404, detail="Error: Cita no existe.")

    cita.activo = False  # type: ignore
    cita.estado = "Cancelada"  # type: ignore
    db.commit()
    return {"ok": True}


@router.delete("/bloqueos/{bloqueo_id}")
def desactivar_bloqueo_admin(
    bloqueo_id: str,
    db: Session = Depends(get_db),
    _admin_ctx=Depends(require_admin_verified_session),
):
    bloqueo = db.query(AgendaBloqueo).filter(AgendaBloqueo.id == bloqueo_id).first()
    if not bloqueo or not getattr(bloqueo, "activo", False):
        raise HTTPException(status_code=404, detail="Error: Bloqueo no existe.")

    bloqueo.activo = False  # type: ignore
    db.commit()
    return {"ok": True}
