from __future__ import annotations

import json
import secrets
from datetime import datetime
from typing import Optional, cast

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from db.session import get_db
from models.base import Auditoria, UserSession, Usuario
from schemas.admin_schema import (
    AdminConfiguracionPerfilUpdateRequest,
    AdminConfiguracionResponse,
    AdminConfiguracionSeguridadUpdateRequest,
)
from services.admin import require_admin_verified_session
from utils.audit import registrar_accion

router = APIRouter()


def _clean_optional_str(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned if cleaned else None


def _get_intrusion_alerts_enabled(usuario: Usuario) -> bool:
    raw = getattr(usuario, "intrusion_alerts_enabled", None)
    # Seguridad por defecto: si por algún motivo el campo es NULL, tratamos como activado.
    if raw is None:
        return True
    return bool(raw)


def _serialize_config(usuario: Usuario) -> AdminConfiguracionResponse:
    return AdminConfiguracionResponse(
        nombre=cast(Optional[str], getattr(usuario, "perfil_nombre", None)) or None,
        colegiada=(
            cast(Optional[str], getattr(usuario, "perfil_numero_colegiada", None))
            or None
        ),
        email=cast(Optional[str], getattr(usuario, "perfil_email", None)) or None,
        mfa_enabled=bool(getattr(usuario, "mfa_enabled", False)),
        intrusion_alerts_enabled=_get_intrusion_alerts_enabled(usuario),
    )


@router.get("/configuracion", response_model=AdminConfiguracionResponse)
def get_admin_configuracion(
    db: Session = Depends(get_db),
    admin_ctx: tuple[Usuario, UserSession] = Depends(require_admin_verified_session),
):
    usuario, _sesion = admin_ctx
    return _serialize_config(usuario)


@router.get("/config", response_model=AdminConfiguracionResponse)
def get_admin_config(
    db: Session = Depends(get_db),
    admin_ctx: tuple[Usuario, UserSession] = Depends(require_admin_verified_session),
):
    usuario, _sesion = admin_ctx
    return _serialize_config(usuario)


@router.put("/configuracion/perfil", response_model=AdminConfiguracionResponse)
def update_admin_configuracion_perfil(
    data: AdminConfiguracionPerfilUpdateRequest,
    db: Session = Depends(get_db),
    admin_ctx: tuple[Usuario, UserSession] = Depends(require_admin_verified_session),
):
    usuario, _sesion = admin_ctx

    provided = set(getattr(data, "model_fields_set", set()))

    if "nombre" in provided:
        usuario.perfil_nombre = _clean_optional_str(data.nombre)  # type: ignore[assignment]

    if "colegiada" in provided:
        usuario.perfil_numero_colegiada = _clean_optional_str(  # type: ignore[assignment]
            data.colegiada
        )

    if "email" in provided:
        email = _clean_optional_str(data.email)
        usuario.perfil_email = email.lower() if email else None  # type: ignore[assignment]

    registrar_accion(
        db,
        usuario_id=str(cast(int, usuario.id)),
        accion="ADMIN_CONFIG_PERFIL_UPDATE",
        tabla="usuarios",
        registro_id=str(cast(int, usuario.id)),
        detalles="Actualización de perfil profesional en /admin/configuracion",
    )

    db.commit()
    db.refresh(usuario)
    return _serialize_config(usuario)


@router.put("/config", response_model=AdminConfiguracionResponse)
def update_admin_config(
    data: AdminConfiguracionPerfilUpdateRequest,
    db: Session = Depends(get_db),
    admin_ctx: tuple[Usuario, UserSession] = Depends(require_admin_verified_session),
):
    usuario, _sesion = admin_ctx

    provided = set(getattr(data, "model_fields_set", set()))

    if "nombre" in provided:
        usuario.perfil_nombre = _clean_optional_str(data.nombre)  # type: ignore[assignment]

    if "colegiada" in provided:
        usuario.perfil_numero_colegiada = _clean_optional_str(  # type: ignore[assignment]
            data.colegiada
        )

    if "email" in provided:
        email = _clean_optional_str(data.email)
        usuario.perfil_email = email.lower() if email else None  # type: ignore[assignment]

    registrar_accion(
        db,
        usuario_id=str(cast(int, usuario.id)),
        accion="ADMIN_CONFIG_UPDATE",
        tabla="usuarios",
        registro_id=str(cast(int, usuario.id)),
        detalles="Actualización de perfil profesional en /admin/config",
    )

    db.commit()
    db.refresh(usuario)
    return _serialize_config(usuario)


@router.get("/config/backup-keys")
def download_admin_config_backup_keys(
    db: Session = Depends(get_db),
    admin_ctx: tuple[Usuario, UserSession] = Depends(require_admin_verified_session),
):
    usuario, _sesion = admin_ctx

    audit_tail = (
        db.query(Auditoria)
        .filter(
            Auditoria.usuario_id == cast(int, usuario.id),
            Auditoria.accion.like("ADMIN_CONFIG%"),
        )
        .order_by(Auditoria.timestamp.desc())
        .limit(50)
        .all()
    )

    payload = {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "admin_user": {
            "id": cast(int, usuario.id),
            "username": cast(str, getattr(usuario, "username", "")) or "",
        },
        "keys_dummy": {
            "master_key": secrets.token_urlsafe(32),
            "recovery_key": secrets.token_urlsafe(32),
            "rotation_token": secrets.token_urlsafe(24),
        },
        "audit_tail": [
            {
                "timestamp": (
                    (row.timestamp.isoformat() + "Z")
                    if getattr(row, "timestamp", None)
                    else None
                ),
                "accion": row.accion,
                "tabla": row.tabla_afectada,
                "registro_id": row.registro_id,
                "detalles": row.detalles,
            }
            for row in audit_tail
        ],
    }

    registrar_accion(
        db,
        usuario_id=str(cast(int, usuario.id)),
        accion="ADMIN_CONFIG_BACKUP_KEYS_DOWNLOAD",
        tabla="auditoria",
        registro_id=None,
        detalles="Descarga de copia de seguridad (dummy keys + audit tail)",
    )
    db.commit()

    filename = f"bunker_keys_backup_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
    body = json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")

    return Response(
        content=body,
        media_type="application/json",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-store",
        },
    )


@router.put("/configuracion/seguridad", response_model=AdminConfiguracionResponse)
def update_admin_configuracion_seguridad(
    data: AdminConfiguracionSeguridadUpdateRequest,
    db: Session = Depends(get_db),
    admin_ctx: tuple[Usuario, UserSession] = Depends(require_admin_verified_session),
):
    usuario, _sesion = admin_ctx

    provided = set(getattr(data, "model_fields_set", set()))
    if not provided:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sin cambios",
        )

    if "mfa_enabled" in provided and data.mfa_enabled is not None:
        usuario.mfa_enabled = bool(data.mfa_enabled)  # type: ignore[assignment]

    if (
        "intrusion_alerts_enabled" in provided
        and data.intrusion_alerts_enabled is not None
    ):
        usuario.intrusion_alerts_enabled = bool(  # type: ignore[assignment]
            data.intrusion_alerts_enabled
        )

    registrar_accion(
        db,
        usuario_id=str(cast(int, usuario.id)),
        accion="ADMIN_CONFIG_SEGURIDAD_UPDATE",
        tabla="usuarios",
        registro_id=str(cast(int, usuario.id)),
        detalles="Actualización de seguridad (MFA/alertas) en /admin/configuracion",
    )

    db.commit()
    db.refresh(usuario)
    return _serialize_config(usuario)
