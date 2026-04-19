from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

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


class FreeSlotsQuery(BaseModel):
    model_config = ConfigDict(extra="forbid")

    from_iso: datetime = Field(..., description="Inicio del rango a consultar (inclusive).")
    to_iso: datetime = Field(..., description="Fin del rango a consultar (exclusive).")
    duration_min: int = Field(..., ge=5, le=240)
    servicio_id: Optional[str] = None

    @model_validator(mode="after")
    def _validate_range(self) -> "FreeSlotsQuery":
        if self.to_iso <= self.from_iso:
            raise ValueError("to_iso debe ser posterior a from_iso")
        return self


class FreeSlotItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    inicio_iso: datetime
    fin_iso: datetime


class FreeSlotsResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[FreeSlotItem]


class CitaReserveRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    servicio_id: str
    inicio_iso: datetime


class CitaReserveResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    cita_id: str
    inicio_iso: datetime
    fin_iso: datetime
    estado: str
