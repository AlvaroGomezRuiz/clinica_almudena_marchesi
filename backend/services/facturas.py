from __future__ import annotations

from datetime import date, datetime, time, timedelta
from typing import Optional, cast

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from db.session import get_db
from models.base import (
    BonoPaciente,
    FacturacionNota,
    Paciente,
    Pago,
    UserSession,
    Usuario,
)
from schemas.admin_schema import (
    FacturaItem,
    FacturacionDetalleResponse,
    FacturacionNotaAdministrativaResponse,
    FacturacionNotaAdministrativaUpdateRequest,
    FacturasResponse,
)
from services.admin import require_admin_verified_session
from utils.audit import registrar_accion
from utils.security import decrypt_data

router = APIRouter()


def _clean_nota(value: str) -> str:
    return (value or "").strip()


def _decrypt_if_fernet(value: Optional[str]) -> str:
    if value is None or value == "":
        return ""

    if value.startswith("gAAAA"):
        decrypted = decrypt_data(value)
        if decrypted.startswith("[DATOS CORRUPTOS"):
            return value
        return decrypted

    return value


@router.get("/", response_model=FacturasResponse)
def listar_facturas(
    db: Session = Depends(get_db),
    _admin_ctx=Depends(require_admin_verified_session),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=200),
    estado: Optional[str] = Query(default=None),
    from_date: Optional[date] = Query(default=None),
    to_date: Optional[date] = Query(default=None),
):
    query = (
        db.query(Pago, Paciente)
        .join(Paciente, Pago.paciente_id == Paciente.id)
        .filter(Pago.activo == True)
    )

    if estado:
        query = query.filter(Pago.estado_transaccion == estado)

    if from_date:
        start_dt = datetime.combine(from_date, time.min)
        query = query.filter(Pago.fecha_pago >= start_dt)

    if to_date:
        end_exclusive = datetime.combine(to_date + timedelta(days=1), time.min)
        query = query.filter(Pago.fecha_pago < end_exclusive)

    total = cast(int, query.with_entities(func.count(Pago.id)).scalar() or 0)

    rows = query.order_by(Pago.fecha_pago.desc()).offset(skip).limit(limit).all()

    items: list[FacturaItem] = []
    for pago, paciente in rows:
        items.append(
            FacturaItem(
                id=pago.id,
                paciente_id=paciente.id,
                paciente_nombre=_decrypt_if_fernet(
                    getattr(paciente, "nombre_completo", None)
                ),
                cita_id=getattr(pago, "cita_id", None),
                bono_id=getattr(pago, "bono_id", None),
                referencia_redsys=getattr(pago, "referencia_redsys", None),
                stripe_event_id=getattr(pago, "stripe_event_id", None),
                importe_centimos=cast(int, getattr(pago, "importe_centimos", 0) or 0),
                estado_transaccion=cast(str, getattr(pago, "estado_transaccion", ""))
                or "",
                fecha_pago=cast(datetime, getattr(pago, "fecha_pago")),
                activo=bool(getattr(pago, "activo", True)),
            )
        )

    return FacturasResponse(total=total, skip=skip, limit=limit, items=items)


@router.get("/detalle", response_model=FacturacionDetalleResponse)
def detalle_facturacion(
    db: Session = Depends(get_db),
    _admin_ctx=Depends(require_admin_verified_session),
    from_date: Optional[date] = Query(default=None),
    to_date: Optional[date] = Query(default=None),
):
    query = db.query(Pago).filter(
        Pago.activo == True,
        Pago.estado_transaccion == "Completado",
    )

    if from_date:
        start_dt = datetime.combine(from_date, time.min)
        query = query.filter(Pago.fecha_pago >= start_dt)

    if to_date:
        end_exclusive = datetime.combine(to_date + timedelta(days=1), time.min)
        query = query.filter(Pago.fecha_pago < end_exclusive)

    pagos_total = cast(int, query.with_entities(func.count(Pago.id)).scalar() or 0)
    clientes_total = cast(
        int,
        query.with_entities(func.count(func.distinct(Pago.paciente_id))).scalar() or 0,
    )
    importe_total_centimos = cast(
        int,
        query.with_entities(func.coalesce(func.sum(Pago.importe_centimos), 0)).scalar()
        or 0,
    )

    sesiones_citas = cast(
        int,
        query.filter(Pago.cita_id.isnot(None))
        .with_entities(func.count(Pago.id))
        .scalar()
        or 0,
    )

    bonos_rows = (
        query.filter(Pago.bono_id.isnot(None))
        .join(BonoPaciente, Pago.bono_id == BonoPaciente.id)
        .with_entities(BonoPaciente.sesiones_totales)
        .all()
    )
    sesiones_bonos = sum(int(row[0] or 0) for row in bonos_rows)

    sesiones_total = max(0, sesiones_citas + sesiones_bonos)

    return FacturacionDetalleResponse(
        from_date=from_date,
        to_date=to_date,
        sesiones_total=sesiones_total,
        clientes_total=clientes_total,
        pagos_total=pagos_total,
        importe_total_centimos=importe_total_centimos,
        iva_percent=None,
        iva_total_centimos=None,
    )


@router.get(
    "/nota-administrativa", response_model=FacturacionNotaAdministrativaResponse
)
def get_nota_administrativa(
    db: Session = Depends(get_db),
    _admin_ctx: tuple[Usuario, UserSession] = Depends(require_admin_verified_session),
):
    row = db.query(FacturacionNota).filter(FacturacionNota.id == 1).first()
    if row is None:
        return FacturacionNotaAdministrativaResponse(nota="", updated_at=None)

    return FacturacionNotaAdministrativaResponse(
        nota=cast(str, getattr(row, "nota", "") or ""),
        updated_at=cast(Optional[datetime], getattr(row, "updated_at", None)),
    )


@router.put(
    "/nota-administrativa", response_model=FacturacionNotaAdministrativaResponse
)
def put_nota_administrativa(
    data: FacturacionNotaAdministrativaUpdateRequest,
    db: Session = Depends(get_db),
    admin_ctx: tuple[Usuario, UserSession] = Depends(require_admin_verified_session),
):
    usuario, _sesion = admin_ctx

    nota = _clean_nota(data.nota)

    row = db.query(FacturacionNota).filter(FacturacionNota.id == 1).first()
    if row is None:
        row = FacturacionNota(
            id=1,
            nota=nota,
            updated_at=datetime.utcnow(),
            updated_by_user_id=cast(int, usuario.id),
        )
        db.add(row)
    else:
        row.nota = nota  # type: ignore[assignment]
        row.updated_at = datetime.utcnow()  # type: ignore[assignment]
        row.updated_by_user_id = cast(int, usuario.id)  # type: ignore[assignment]

    registrar_accion(
        db,
        usuario_id=str(cast(int, usuario.id)),
        accion="FACTURACION_NOTA_ADMIN_UPDATE",
        tabla="facturacion_notas",
        registro_id="1",
        detalles="Actualización de Nota Administrativa en /admin/facturacion",
    )

    db.commit()
    db.refresh(row)

    return FacturacionNotaAdministrativaResponse(
        nota=cast(str, getattr(row, "nota", "") or ""),
        updated_at=cast(Optional[datetime], getattr(row, "updated_at", None)),
    )
