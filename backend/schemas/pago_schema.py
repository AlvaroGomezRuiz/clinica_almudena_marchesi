from pydantic import BaseModel, ConfigDict, Field 

class PagoWebhook(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id_cita: str = Field(...)
    referencia_redsys: str = Field(...)
    importe_centimos: int = Field(..., gt=0)
    resultado: str = Field(...)
