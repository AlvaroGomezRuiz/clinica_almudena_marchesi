from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.session import get_db
from models.base import Servicio
from schemas.servicio_schema import ServicioCreate, ServicioResponse

router = APIRouter()


@router.post("/", response_model=ServicioResponse)
def crear_servicio(servicio: ServicioCreate, db: Session = Depends(get_db)):
    nuevo_servicio = Servicio(
        nombre=servicio.nombre,
        duracion_minutos=servicio.duracion_minutos,
        precio_centimos=servicio.precio_centimos,
    )
    db.add(nuevo_servicio)
    db.commit()
    db.refresh(nuevo_servicio)
    return nuevo_servicio


@router.get("/", response_model=list[ServicioResponse])
def listar_servicios(db: Session = Depends(get_db)):
    return db.query(Servicio).all()
