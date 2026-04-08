import base64
import os
from datetime import date, datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.audit import registrar_accion
from core.security import encrypt_data, get_current_user
from db.session import get_db
from models.base import Paciente, Usuario
from schemas.paciente_schema import PacienteCreate, PacienteResponse

router = APIRouter()


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
        search_term = f"%{search.strip()}%"
        search_clean = f"%{search.strip().replace('-', '').replace(' ', '')}%"

        query = query.filter(
            (Paciente.nombre_completo.ilike(search_term))
            | (Paciente.dni_nie.ilike(search_clean))
        )

    return query.offset(skip).limit(limit).all()


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

    # 2. Defensa contra duplicados
    db_paciente = (
        db.query(Paciente)
        .filter((Paciente.dni_nie == dni_limpio) | (Paciente.email == paciente.email))
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

    nuevo_paciente = Paciente(
        dni_nie=dni_limpio,
        nombre_completo=nombre_limpio,
        telefono=paciente.telefono,
        email=paciente.email,
        fecha_nacimiento=paciente.fecha_nacimiento,
        fecha_alta=date.today(),
        motivo_consulta_inicial=motivo_encriptado,
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
    return nuevo_paciente


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
    return paciente


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
            detalles=f"Baja lógica de {paciente.nombre_completo}",
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
                detalles=f"Acceso restaurado para {paciente.nombre_completo}",
            )
        db.commit()
        db.refresh(paciente)

    return paciente


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
            detalles=f"DESTRUCCIÓN TOTAL DE DATOS de {paciente.nombre_completo}",
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
