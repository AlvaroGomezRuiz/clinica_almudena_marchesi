from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from datetime import date, datetime
from typing import Optional


class PacienteBase(BaseModel):
    model_config = ConfigDict(extra="forbid")

    dni_nie: str = Field(..., description="DNI o NIE con letra")
    nombre_completo: str = Field(..., min_length=2, max_length=100)
    telefono: Optional[str] = Field(None, pattern=r"^\+?[0-9]{9,15}$")
    email: EmailStr
    fecha_nacimiento: Optional[date] = None
    motivo_consulta_inicial: Optional[str] = Field(None, max_length=2000)
    experiencia_terapia: Optional[str] = Field(None, max_length=64)
    motivo_consulta: Optional[str] = Field(None, max_length=2000)
    consentimiento_rgpd: bool = Field(default=False)

    @field_validator("dni_nie")
    @classmethod
    def validar_dni_nie_real(cls, v: str):
        v = v.upper().replace("-", "").replace(" ", "")
        letras = "TRWAGMYFPDXBNJZSQVHLCKE"

        # Lógica para NIE (X, Y, Z)
        nie_prefix = {"X": "0", "Y": "1", "Z": "2"}
        temp_v = v
        if temp_v[0] in nie_prefix:
            temp_v = nie_prefix[temp_v[0]] + temp_v[1:]

        try:
            # Verificar si son 8 números + 1 letra
            if len(v) != 9 or not temp_v[:8].isdigit():
                raise ValueError("Formato de DNI/NIE inválido")

            numero = int(temp_v[:8])
            if letras[numero % 23] != v[8]:
                raise ValueError("La letra del DNI/NIE no es correcta")
        except Exception:
            raise ValueError("Identificación fiscal no válida")

        return v


class PacienteCreate(PacienteBase):
    pass


class PacienteResponse(PacienteBase):
    id: str
    fecha_alta: date
    activo: bool

    model_config = ConfigDict(from_attributes=True)


class PacienteSesionItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    cita_id: str
    inicio_iso: datetime
    fin_iso: datetime
    servicio_nombre: str
    estado_cita: str
    notas_clinicas: str = ""
    tareas_asignadas: str = ""
    estado_emocional: str = ""
    fecha_registro: datetime
    session_number: int = Field(..., ge=1)


class PacienteHistorialResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    total: int
    items: list[PacienteSesionItem]
