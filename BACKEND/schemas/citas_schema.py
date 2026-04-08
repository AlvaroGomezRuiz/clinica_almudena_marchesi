from pydantic import BaseModel, ConfigDict, model_validator
from datetime import datetime
from typing import Optional

class CitaBase(BaseModel):
    # Bloqueo de Mass Assignment
    model_config = ConfigDict(extra="forbid")

    paciente_id: str
    servicio_id: str
    inicio_iso: datetime
    fin_iso: datetime

class CitaCreate(CitaBase):
    @model_validator(mode='after')
    def validar_tiempo(self):
        if self.fin_iso <= self.inicio_iso:
            raise ValueError('La fecha de fin debe ser posterior a la fecha de inicio')
        return self

class CitaResponse(CitaBase):
    id: str
    estado: str

    # Permitir lectura desde objetos de base de datos
    model_config = ConfigDict(from_attributes=True)
