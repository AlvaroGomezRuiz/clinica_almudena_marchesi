from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

from schemas.admin_schema import AdminAgendaItem


class AgendaBloqueoItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    inicio_iso: datetime
    fin_iso: datetime
    motivo: Optional[str] = None


class AgendaBloqueoCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    inicio_iso: datetime
    fin_iso: datetime
    motivo: Optional[str] = None

    @model_validator(mode="after")
    def validar_rango(self):
        if self.fin_iso <= self.inicio_iso:
            raise ValueError("La fecha de fin debe ser posterior a la fecha de inicio")
        return self


class AgendaNotaDiaUpsert(BaseModel):
    model_config = ConfigDict(extra="forbid")

    dia: date
    nota: str = Field(default="", max_length=5000)


class AgendaNotaDiaResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    dia: date
    nota: str
    updated_at: datetime


class AdminMonthAgendaResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    month_start: date
    month_end: date
    citas: list[AdminAgendaItem]
    bloqueos: list[AgendaBloqueoItem]


class AdminDayAgendaResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    dia: date
    citas: list[AdminAgendaItem]
    bloqueos: list[AgendaBloqueoItem]
    nota: str


class AdminWeekAgendaResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    week_start: date
    week_end: date
    citas: list[AdminAgendaItem]
    bloqueos: list[AgendaBloqueoItem]


class AdminManualCitaCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    paciente_id: str
    inicio_iso: datetime
    servicio_id: Optional[str] = None
