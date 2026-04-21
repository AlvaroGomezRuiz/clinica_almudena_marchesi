from __future__ import annotations

import os
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Request,
    UploadFile,
    status,
)
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from db.session import get_db
from models.base import Paciente, Recurso, RecursoAsignacion
from services.admin import require_admin_verified_session

router = APIRouter()


class RecursoItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    titulo: str
    tipo: str
    categoria: str
    url: str


class RecursoAsignarRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    recurso_id: str
    paciente_id: str


def _derive_tipo(filename: str, content_type: str | None) -> str:
    suffix = (Path(filename).suffix or "").lower()
    ct = (content_type or "").lower()

    if suffix == ".pdf" or "pdf" in ct:
        return "PDF"
    if ct.startswith("audio/"):
        return "Audio"
    if ct.startswith("video/"):
        return "Video"
    if ct.startswith("image/"):
        return "Imagen"
    if suffix:
        return suffix.lstrip(".").upper()
    return "Archivo"


@router.get("/", response_model=list[RecursoItem])
def listar_recursos(
    request: Request,
    db: Session = Depends(get_db),
    _admin_ctx=Depends(require_admin_verified_session),
    categoria: str | None = None,
) -> list[RecursoItem]:
    query = db.query(Recurso).filter(Recurso.activo == True)
    if categoria:
        query = query.filter(Recurso.categoria == categoria)

    rows = query.order_by(Recurso.created_at.desc()).all()
    items: list[RecursoItem] = []

    for r in rows:
        rid = str(getattr(r, "id", ""))
        url = str(request.url_for("descargar_recurso", recurso_id=rid))
        items.append(
            RecursoItem(
                id=rid,
                titulo=str(getattr(r, "titulo", "") or ""),
                tipo=str(getattr(r, "tipo", "") or ""),
                categoria=str(getattr(r, "categoria", "") or "recurso"),
                url=url,
            )
        )

    return items


@router.post("/upload", response_model=RecursoItem, status_code=status.HTTP_201_CREATED)
async def subir_recurso(
    request: Request,
    db: Session = Depends(get_db),
    admin_ctx=Depends(require_admin_verified_session),
    titulo: str = Form(...),
    categoria: str = Form("recurso"),
    file: UploadFile = File(...),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Archivo inválido")

    recurso_id = str(uuid.uuid4())
    safe_suffix = (Path(file.filename).suffix or "")[:12]
    if safe_suffix and not safe_suffix.replace(".", "").isalnum():
        safe_suffix = ""

    folder = "uploads/recursos"
    os.makedirs(folder, exist_ok=True)

    stored_name = f"recurso_{recurso_id}{safe_suffix}"
    storage_path = os.path.join(folder, stored_name)

    try:
        data = await file.read()
        with open(storage_path, "wb") as f:
            f.write(data)

        tipo = _derive_tipo(file.filename, file.content_type)

        recurso = Recurso(
            id=recurso_id,
            titulo=titulo.strip(),
            tipo=tipo,
            categoria=(categoria or "recurso").strip() or "recurso",
            original_filename=file.filename,
            storage_path=storage_path,
            mime_type=file.content_type,
            size_bytes=len(data),
            created_at=datetime.utcnow(),
            activo=True,
        )
        db.add(recurso)
        db.commit()

        url = str(request.url_for("descargar_recurso", recurso_id=recurso_id))
        return RecursoItem(
            id=recurso_id,
            titulo=recurso.titulo,  # type: ignore
            tipo=recurso.tipo,  # type: ignore
            categoria=recurso.categoria,  # type: ignore
            url=url,
        )
    except HTTPException:
        raise
    except Exception:
        db.rollback()
        try:
            if os.path.exists(storage_path):
                os.remove(storage_path)
        except Exception:
            pass
        raise HTTPException(
            status_code=500,
            detail="No se pudo subir el recurso",
        )


@router.get("/{recurso_id}/download", name="descargar_recurso")
def descargar_recurso(
    recurso_id: str,
    db: Session = Depends(get_db),
    _admin_ctx=Depends(require_admin_verified_session),
):
    recurso = (
        db.query(Recurso)
        .filter(Recurso.id == recurso_id, Recurso.activo == True)
        .first()
    )
    if not recurso:
        raise HTTPException(status_code=404, detail="Recurso no encontrado")

    storage_path = str(getattr(recurso, "storage_path", "") or "")
    if not storage_path or not os.path.exists(storage_path):
        raise HTTPException(status_code=404, detail="Archivo no disponible")

    from fastapi.responses import FileResponse

    filename = str(getattr(recurso, "original_filename", "") or "recurso")
    media_type = str(getattr(recurso, "mime_type", "") or "application/octet-stream")
    return FileResponse(path=storage_path, media_type=media_type, filename=filename)


@router.post("/asignar")
def asignar_recurso_a_paciente(
    data: RecursoAsignarRequest,
    db: Session = Depends(get_db),
    admin_ctx=Depends(require_admin_verified_session),
):
    admin_user = admin_ctx[0]

    recurso = (
        db.query(Recurso)
        .filter(Recurso.id == data.recurso_id, Recurso.activo == True)
        .first()
    )
    if not recurso:
        raise HTTPException(status_code=404, detail="Recurso no encontrado")

    paciente = (
        db.query(Paciente)
        .filter(Paciente.id == data.paciente_id, Paciente.activo == True)
        .first()
    )
    if not paciente:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")

    existing = (
        db.query(RecursoAsignacion)
        .filter(
            RecursoAsignacion.recurso_id == data.recurso_id,
            RecursoAsignacion.paciente_id == data.paciente_id,
        )
        .first()
    )

    now = datetime.utcnow()

    if existing:
        setattr(existing, "activo", True)
        setattr(existing, "assigned_at", now)
        setattr(existing, "assigned_by_user_id", getattr(admin_user, "id", None))
        db.commit()
        return {"status": "ok"}

    asignacion = RecursoAsignacion(
        recurso_id=data.recurso_id,
        paciente_id=data.paciente_id,
        assigned_by_user_id=getattr(admin_user, "id", None),
        assigned_at=now,
        activo=True,
    )
    db.add(asignacion)
    db.commit()
    return {"status": "ok"}
