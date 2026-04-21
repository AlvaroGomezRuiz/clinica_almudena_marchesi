from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class AdminAgendaItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    cita_id: str
    inicio_iso: datetime
    fin_iso: datetime
    estado: str

    paciente_id: str
    paciente_nombre: str

    servicio_id: str
    servicio_nombre: str


class AdminBonoAlertaItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    bono_id: str
    paciente_id: str
    paciente_nombre: str

    servicio_id: str
    servicio_nombre: str

    sesiones_totales: int = Field(..., ge=0)
    sesiones_consumidas: int = Field(..., ge=0)
    sesiones_restantes: int = Field(..., ge=0)

    estado: str


class AdminStatsResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    week_start: date
    week_end: date

    citas_semana_total: int = Field(..., ge=0)
    pacientes_activos_total: int = Field(..., ge=0)
    pacientes_nuevos_semana: int = Field(..., ge=0)
    ingresos_semana_centimos: int = Field(..., ge=0)

    agenda_hoy: list[AdminAgendaItem]
    alertas_bonos: list[AdminBonoAlertaItem]


class AdminWeekCitasResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    week_start: date
    week_end: date
    citas: list[AdminAgendaItem]


class FacturaItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str

    paciente_id: str
    paciente_nombre: str

    cita_id: Optional[str] = None
    bono_id: Optional[str] = None

    referencia_redsys: Optional[str] = None
    stripe_event_id: Optional[str] = None

    importe_centimos: int = Field(..., ge=0)
    estado_transaccion: str
    fecha_pago: datetime

    activo: bool


class FacturasResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    total: int = Field(..., ge=0)
    skip: int = Field(..., ge=0)
    limit: int = Field(..., ge=1)
    items: list[FacturaItem]


class FacturacionDetalleResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    from_date: Optional[date] = None
    to_date: Optional[date] = None

    sesiones_total: int = Field(..., ge=0)
    clientes_total: int = Field(..., ge=0)
    pagos_total: int = Field(..., ge=0)
    importe_total_centimos: int = Field(..., ge=0)

    # IVA no se calcula si no existe una fuente fiable/configurada.
    iva_percent: Optional[int] = Field(default=None, ge=0, le=100)
    iva_total_centimos: Optional[int] = Field(default=None, ge=0)


class FacturacionNotaAdministrativaResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nota: str
    updated_at: Optional[datetime] = None


class FacturacionNotaAdministrativaUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nota: str


class AdminConfiguracionResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nombre: Optional[str] = None
    colegiada: Optional[str] = None
    email: Optional[str] = None

    mfa_enabled: bool
    intrusion_alerts_enabled: bool


class AdminConfiguracionPerfilUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nombre: Optional[str] = None
    colegiada: Optional[str] = None
    email: Optional[str] = None


class AdminConfiguracionSeguridadUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    mfa_enabled: Optional[bool] = None
    intrusion_alerts_enabled: Optional[bool] = None
