import base64
import hashlib
import hmac
import os
import re
from datetime import date, datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
import sqlalchemy as sa
from sqlalchemy.orm import Session

from core.audit import registrar_accion
from core.security import decrypt_data, encrypt_data, get_current_user
from core.config import settings
from db.session import get_db
from models.base import Paciente, Usuario
from schemas.paciente_schema import PacienteCreate, PacienteResponse

router = APIRouter()


def _decrypt_if_fernet(value: Optional[str]) -> Optional[str]:
    if value is None or value == "":
        return value

    # Los tokens Fernet típicamente empiezan por "gAAAA".
    if value.startswith("gAAAA"):
        decrypted = decrypt_data(value)
        if decrypted.startswith("[DATOS CORRUPTOS"):
            return value
        return decrypted

    return value


def _normalize_name_for_bidx(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip()).lower()


def _blind_index(value: str, context: str) -> str:
    msg = f"bidx:{context}:{value}".encode("utf-8")
    return hmac.new(settings.SECRET_KEY.encode("utf-8"), msg, hashlib.sha256).hexdigest()


def _serialize_paciente(paciente: Paciente) -> dict:
    dni_nie = getattr(paciente, "dni_nie", None)
    nombre_completo = getattr(paciente, "nombre_completo", None)
    telefono = getattr(paciente, "telefono", None)
    email = getattr(paciente, "email", None)
    motivo_consulta_inicial = getattr(paciente, "motivo_consulta_inicial", None)
    experiencia_terapia = getattr(paciente, "experiencia_terapia", None)
    motivo_consulta = getattr(paciente, "motivo_consulta", None)

    return {
        "id": paciente.id,
        "dni_nie": _decrypt_if_fernet(dni_nie) or "",
        "nombre_completo": _decrypt_if_fernet(nombre_completo) or "",
        "telefono": _decrypt_if_fernet(telefono),
        "email": _decrypt_if_fernet(email) or "",
        "fecha_nacimiento": paciente.fecha_nacimiento,
        "motivo_consulta_inicial": _decrypt_if_fernet(motivo_consulta_inicial),
        "experiencia_terapia": _decrypt_if_fernet(experiencia_terapia),
        "motivo_consulta": _decrypt_if_fernet(motivo_consulta),
        "consentimiento_rgpd": paciente.consentimiento_rgpd,
        "fecha_alta": paciente.fecha_alta,
        "activo": paciente.activo,
    }


# --- 1. LISTAR PACIENTES (BÚSQUEDA + PAGINACIÓN + JWT) ---
@router.get("/", response_model=List[PacienteResponse])
def listar_pacientes(
    db: Session = Depends(get_db),
    usuario_actual: str = Depends(get_current_user),
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
):
    """Recupera la lista de pacientes activos con filtros inteligentes."""
    query = db.query(Paciente).filter(Paciente.activo == True)

    if search:
        term = search.strip()
        dni_candidate = term.upper().replace("-", "").replace(" ", "")
        phone_candidate = re.sub(r"\D", "", term)
        name_candidate = _normalize_name_for_bidx(term)

        dni_bidx = _blind_index(dni_candidate, "dni") if dni_candidate else None
        phone_bidx = _blind_index(phone_candidate, "phone") if phone_candidate else None
        name_bidx = _blind_index(name_candidate, "name") if name_candidate else None

        filters = []
        if dni_bidx:
            filters.append(Paciente.dni_nie_bidx == dni_bidx)
        if phone_bidx:
            filters.append(Paciente.telefono_bidx == phone_bidx)
        if name_bidx:
            filters.append(Paciente.nombre_completo_bidx == name_bidx)

        if filters:
            query = query.filter(sa.or_(*filters))

    pacientes = query.offset(skip).limit(limit).all()
    return [_serialize_paciente(p) for p in pacientes]


# --- 2. CREAR PACIENTE (NORMALIZACIÓN + AUDITORÍA) ---
@router.post("/", response_model=PacienteResponse, status_code=status.HTTP_201_CREATED)
def crear_paciente(
    paciente: PacienteCreate,
    db: Session = Depends(get_db),
    usuario_actual: str = Depends(get_current_user),
):
    # 1. Normalización de Datos
    dni_limpio = paciente.dni_nie.strip().upper().replace("-", "").replace(" ", "")
    nombre_limpio = paciente.nombre_completo.strip().title()
    telefono_limpio = paciente.telefono.strip() if paciente.telefono else None
    telefono_digits = re.sub(r"\D", "", telefono_limpio or "")

    dni_bidx = _blind_index(dni_limpio, "dni")
    nombre_bidx = _blind_index(_normalize_name_for_bidx(nombre_limpio), "name")
    telefono_bidx = _blind_index(telefono_digits, "phone") if telefono_digits else None

    # 2. Defensa contra duplicados
    db_paciente = (
        db.query(Paciente)
        .filter((Paciente.dni_nie_bidx == dni_bidx) | (Paciente.email == paciente.email))
        .first()
    )

    if db_paciente:
        raise HTTPException(
            status_code=400, detail="Conflicto: DNI o Email ya registrados."
        )

    # 3. Criptografía de datos clínicos
    motivo_encriptado = (
        encrypt_data(paciente.motivo_consulta_inicial)
        if paciente.motivo_consulta_inicial
        else ""
    )

    experiencia_encriptada = (
        encrypt_data(paciente.experiencia_terapia)
        if paciente.experiencia_terapia
        else ""
    )

    motivo_consulta_encriptado = (
        encrypt_data(paciente.motivo_consulta)
        if paciente.motivo_consulta
        else ""
    )

    dni_encriptado = encrypt_data(dni_limpio)
    nombre_encriptado = encrypt_data(nombre_limpio)
    telefono_encriptado = encrypt_data(telefono_limpio) if telefono_limpio else None

    nuevo_paciente = Paciente(
        dni_nie=dni_encriptado,
        dni_nie_bidx=dni_bidx,
        nombre_completo=nombre_encriptado,
        nombre_completo_bidx=nombre_bidx,
        telefono=telefono_encriptado,
        telefono_bidx=telefono_bidx,
        email=paciente.email,
        fecha_nacimiento=paciente.fecha_nacimiento,
        fecha_alta=date.today(),
        motivo_consulta_inicial=motivo_encriptado,
        experiencia_terapia=experiencia_encriptada,
        motivo_consulta=motivo_consulta_encriptado,
        consentimiento_rgpd=paciente.consentimiento_rgpd,
        activo=True,
    )

    db.add(nuevo_paciente)

    # 4. Rastro de Auditoría
    user = db.query(Usuario).filter(Usuario.username == usuario_actual).first()
    if user:
        registrar_accion(
            db,
            usuario_id=user.id,  # type: ignore
            accion="ALTA_PACIENTE",
            tabla="pacientes",
            detalles=f"Alta de {nombre_limpio} ({dni_limpio})",
        )

    db.commit()
    db.refresh(nuevo_paciente)
    return _serialize_paciente(nuevo_paciente)


# --- 3. OBTENER UN PACIENTE ---
@router.get("/{paciente_id}", response_model=PacienteResponse)
def obtener_paciente(
    paciente_id: str,
    db: Session = Depends(get_db),
    usuario_actual: str = Depends(get_current_user),
):
    paciente = (
        db.query(Paciente)
        .filter(Paciente.id == paciente_id, Paciente.activo == True)
        .first()
    )

    if not paciente:
        raise HTTPException(status_code=404, detail="Paciente no encontrado.")
    return _serialize_paciente(paciente)


# --- 4. BORRADO LÓGICO (SOFT DELETE) ---
@router.delete("/{paciente_id}")
def eliminar_paciente_logico(
    paciente_id: str,
    db: Session = Depends(get_db),
    usuario_actual: str = Depends(get_current_user),
):
    paciente = db.query(Paciente).filter(Paciente.id == paciente_id).first()
    if not paciente:
        raise HTTPException(status_code=404, detail="Registro inexistente.")

    paciente.activo = False  # type: ignore

    user = db.query(Usuario).filter(Usuario.username == usuario_actual).first()
    if user:
        registrar_accion(
            db,
            usuario_id=user.id,  # type: ignore
            accion="SOFT_DELETE",
            tabla="pacientes",
            registro_id=paciente_id,
            detalles=f"Baja lógica de {_decrypt_if_fernet(getattr(paciente, 'nombre_completo', None)) or ''}",
        )

    db.commit()
    return {"status": "Registro desactivado correctamente."}


# --- 5. RESTAURAR PACIENTE ---
@router.patch("/{paciente_id}/restaurar", response_model=PacienteResponse)
def restaurar_paciente(
    paciente_id: str,
    db: Session = Depends(get_db),
    usuario_actual: str = Depends(get_current_user),
):
    paciente = db.query(Paciente).filter(Paciente.id == paciente_id).first()
    if not paciente:
        raise HTTPException(status_code=404, detail="Paciente no encontrado.")

    if not paciente.activo:  # type: ignore
        paciente.activo = True  # type: ignore
        user = db.query(Usuario).filter(Usuario.username == usuario_actual).first()
        if user:
            registrar_accion(
                db,
                usuario_id=user.id,  # type: ignore
                accion="RESTAURACION",
                tabla="pacientes",
                registro_id=paciente_id,
                    detalles=f"Acceso restaurado para {_decrypt_if_fernet(getattr(paciente, 'nombre_completo', None)) or ''}",
            )
        db.commit()
        db.refresh(paciente)

    return _serialize_paciente(paciente)


# --- 6. ELIMINACIÓN PERMANENTE (RGPD - EL BOTÓN ROJO) ---
@router.delete("/{paciente_id}/permanente", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_paciente_definitivo(
    paciente_id: str,
    db: Session = Depends(get_db),
    usuario_actual: str = Depends(get_current_user),
):
    """BORRADO FÍSICO IRREVERSIBLE (Derecho al Olvido)."""
    paciente = db.query(Paciente).filter(Paciente.id == paciente_id).first()
    if not paciente:
        raise HTTPException(status_code=404, detail="Registro no encontrado.")

    user = db.query(Usuario).filter(Usuario.username == usuario_actual).first()
    if user:
        registrar_accion(
            db,
            usuario_id=user.id,  # type: ignore
            accion="BORRADO_FISICO_RGPD",
            tabla="pacientes",
            registro_id=paciente_id,
            detalles=f"DESTRUCCIÓN TOTAL DE DATOS de {_decrypt_if_fernet(getattr(paciente, 'nombre_completo', None)) or ''}",
        )

    db.delete(paciente)
    db.commit()
    return None


# --- 7. MOTOR DE FIRMA DIGITAL (CAPTURA Y LEGALIZACIÓN) ---
@router.post("/{paciente_id}/firma")
async def capturar_firma_digital(
    paciente_id: str,
    firma_base64: str,  # Recibimos el string Base64 del frontend
    db: Session = Depends(get_db),
    usuario_actual: str = Depends(get_current_user),
):
    """Convierte la firma del frontend en un archivo físico y legaliza el RGPD."""
    paciente = db.query(Paciente).filter(Paciente.id == paciente_id).first()
    if not paciente:
        raise HTTPException(status_code=404, detail="Paciente no encontrado.")

    try:
        # 1. Procesamiento de imagen
        if "base64," in firma_base64:
            firma_base64 = firma_base64.split("base64,")[1]

        img_data = base64.b64decode(firma_base64)

        # 2. Almacenamiento Seguro
        folder = "uploads/firmas"
        if not os.path.exists(folder):
            os.makedirs(folder)

        file_name = f"firma_{paciente_id}_{int(datetime.utcnow().timestamp())}.png"
        file_path = os.path.join(folder, file_name)

        with open(file_path, "wb") as f:
            f.write(img_data)

        # 3. Actualización de estado legal
        paciente.firma_rgpd_path = file_path  # type: ignore
        paciente.consentimiento_rgpd = True  # type: ignore

        # 4. Auditoría
        user = db.query(Usuario).filter(Usuario.username == usuario_actual).first()
        if user:
            registrar_accion(
                db,
                usuario_id=user.id,  # type: ignore
                accion="FIRMA_RGPD_CAPTURADA",
                tabla="pacientes",
                registro_id=paciente_id,
                detalles=f"Firma digital almacenada en: {file_path}",
            )

        db.commit()
        return {"status": "Firma legalizada correctamente", "path": file_path}

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error en procesado de firma: {str(e)}"
        )
