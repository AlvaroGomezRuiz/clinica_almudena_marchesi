from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_
from db.session import get_db
from models.base import Cita, Paciente, Servicio
from schemas.citas_schema import CitaCreate, CitaResponse

router = APIRouter()


@router.post("/", response_model=CitaResponse)
def agendar_cita(cita: CitaCreate, db: Session = Depends(get_db)):
    # 1. Verificación de existencia
    if not db.query(Paciente).filter(Paciente.id == cita.paciente_id).first():
        raise HTTPException(status_code=404, detail="Error: Paciente no existe.")

    if not db.query(Servicio).filter(Servicio.id == cita.servicio_id).first():
        raise HTTPException(status_code=404, detail="Error: Servicio no existe.")

    # 2. MOTOR DE COLISIONES (Lógica de solapamiento)
    # Una cita solapa si: (Nueva_Inicio < Existente_Fin) Y (Nueva_Fin > Existente_Inicio)
    colision = (
        db.query(Cita)
        .filter(and_(cita.inicio_iso < Cita.fin_iso, cita.fin_iso > Cita.inicio_iso))
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
