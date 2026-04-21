from pydantic import BaseModel

class ServicioBase(BaseModel):
    nombre: str
    duracion_minutos: int
    precio_centimos: int

class ServicioCreate(ServicioBase):
    pass

class ServicioResponse(ServicioBase):
    id: str

    class Config:
        from_attributes = True
