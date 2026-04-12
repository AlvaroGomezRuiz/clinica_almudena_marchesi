from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import func
from sqlalchemy.orm import Session

from db.session import get_db
from models.base import Conversacion, Paciente
from services.admin import require_admin_verified_session
from utils.security import decrypt_data

router = APIRouter()


class ConversacionItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    paciente_id: str
    paciente_nombre: str
    last_message_at: datetime


class ConversacionCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    paciente_id: str


def _decrypt_if_fernet(value: Optional[str]) -> str:
    if value is None or value == "":
        return ""

    if value.startswith("gAAAA"):
        decrypted = decrypt_data(value)
        if decrypted.startswith("[DATOS CORRUPTOS"):
            return value
        return decrypted

    return value


@router.get("/", response_model=list[ConversacionItem])
def listar_conversaciones(
    db: Session = Depends(get_db),
    _admin_ctx=Depends(require_admin_verified_session),
) -> list[ConversacionItem]:
    rows = (
        db.query(Conversacion, Paciente)
        .join(Paciente, Conversacion.paciente_id == Paciente.id)
        .filter(
            Conversacion.activo == True,
            Conversacion.deleted_at.is_(None),
            Conversacion.archived_at.is_(None),
            Paciente.activo == True,
        )
        .order_by(
            func.coalesce(
                Conversacion.last_message_at,
                Conversacion.updated_at,
                Conversacion.created_at,
            ).desc()
        )
        .all()
    )

    items: list[ConversacionItem] = []
    for conv, paciente in rows:
        last = (
            getattr(conv, "last_message_at", None)
            or getattr(conv, "updated_at", None)
            or getattr(conv, "created_at", None)
            or datetime.utcnow()
        )
        items.append(
            ConversacionItem(
                id=str(getattr(conv, "id", "")),
                paciente_id=str(getattr(paciente, "id", "")),
                paciente_nombre=_decrypt_if_fernet(
                    getattr(paciente, "nombre_completo", None)
                ),
                last_message_at=last,
            )
        )

    return items


@router.post(
    "/conversaciones",
    response_model=ConversacionItem,
    status_code=status.HTTP_201_CREATED,
)
def crear_conversacion(
    data: ConversacionCreateRequest,
    db: Session = Depends(get_db),
    _admin_ctx=Depends(require_admin_verified_session),
) -> ConversacionItem:
    paciente = (
        db.query(Paciente)
        .filter(Paciente.id == data.paciente_id, Paciente.activo == True)
        .first()
    )
    if not paciente:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")

    existing = (
        db.query(Conversacion)
        .filter(Conversacion.paciente_id == data.paciente_id)
        .order_by(Conversacion.created_at.desc())
        .first()
    )

    now = datetime.utcnow()

    if existing:
        if getattr(existing, "deleted_at", None) is not None or not bool(
            getattr(existing, "activo", True)
        ):
            setattr(existing, "deleted_at", None)
            setattr(existing, "activo", True)

        if getattr(existing, "archived_at", None) is not None:
            setattr(existing, "archived_at", None)

        setattr(existing, "updated_at", now)
        db.commit()

        last = (
            getattr(existing, "last_message_at", None)
            or getattr(existing, "updated_at", None)
            or getattr(existing, "created_at", None)
            or now
        )
        return ConversacionItem(
            id=str(getattr(existing, "id", "")),
            paciente_id=str(getattr(paciente, "id", "")),
            paciente_nombre=_decrypt_if_fernet(
                getattr(paciente, "nombre_completo", None)
            ),
            last_message_at=last,
        )

    conv = Conversacion(
        paciente_id=data.paciente_id,
        created_at=now,
        updated_at=now,
        last_message_at=None,
        archived_at=None,
        deleted_at=None,
        activo=True,
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)

    return ConversacionItem(
        id=str(getattr(conv, "id", "")),
        paciente_id=str(getattr(paciente, "id", "")),
        paciente_nombre=_decrypt_if_fernet(getattr(paciente, "nombre_completo", None)),
        last_message_at=now,
    )


@router.post("/{conversation_id}/archivar")
def archivar_conversacion(
    conversation_id: str,
    db: Session = Depends(get_db),
    _admin_ctx=Depends(require_admin_verified_session),
):
    conv = (
        db.query(Conversacion)
        .filter(Conversacion.id == conversation_id, Conversacion.activo == True)
        .first()
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversación no encontrada")

    now = datetime.utcnow()
    setattr(conv, "archived_at", now)
    setattr(conv, "updated_at", now)
    db.commit()
    return {"status": "ok"}


@router.post("/{conversation_id}/eliminar")
def eliminar_conversacion(
    conversation_id: str,
    db: Session = Depends(get_db),
    _admin_ctx=Depends(require_admin_verified_session),
):
    conv = (
        db.query(Conversacion)
        .filter(Conversacion.id == conversation_id, Conversacion.activo == True)
        .first()
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversación no encontrada")

    now = datetime.utcnow()
    setattr(conv, "deleted_at", now)
    setattr(conv, "updated_at", now)
    setattr(conv, "activo", False)
    db.commit()
    return {"status": "ok"}
