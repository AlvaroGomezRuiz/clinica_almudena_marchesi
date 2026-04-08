import uuid
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, Date, DateTime, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from db.session import Base

def generar_uuid():
    return str(uuid.uuid4())

# ==========================================
# 1. BÚNKER MFA (Seguridad)
# ==========================================
class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_admin = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)

    # Campos MFA
    mfa_secret = Column(String(32), nullable=True)
    mfa_enabled = Column(Boolean, default=False)

    def __repr__(self):
        return f"<Usuario {self.username}>"

# ==========================================
# 2. MODELOS CLÍNICOS
# ==========================================
class Paciente(Base):
    __tablename__ = "pacientes"
    id = Column(String(36), primary_key=True, default=generar_uuid)
    dni_nie = Column(String(20), unique=True, index=True, nullable=False)
    nombre_completo = Column(String(100), nullable=False, index=True)
    email = Column(String(100), unique=True, index=True)
    telefono = Column(String(20))
    fecha_nacimiento = Column(Date)
    fecha_alta = Column(Date)
    motivo_consulta_inicial = Column(Text)
    consentimiento_rgpd = Column(Boolean, default=False, nullable=False)
    firma_rgpd_path = Column(String(255), nullable=True)
    activo = Column(Boolean, default=True, nullable=False)

    citas = relationship("Cita", back_populates="paciente")
    bonos = relationship("BonoPaciente", back_populates="paciente")
    pagos = relationship("Pago", back_populates="paciente")
    historial = relationship("HistorialSesiones", back_populates="paciente")

class Servicio(Base):
    __tablename__ = "servicios"
    id = Column(String(36), primary_key=True, default=generar_uuid)
    nombre = Column(String(100), nullable=False)
    duracion_minutos = Column(Integer, nullable=False)
    precio_centimos = Column(Integer, nullable=False)
    activo = Column(Boolean, default=True, nullable=False)

    citas = relationship("Cita", back_populates="servicio")
    bonos = relationship("BonoPaciente", back_populates="servicio")

class Cita(Base):
    __tablename__ = "citas"
    id = Column(String(36), primary_key=True, default=generar_uuid)
    paciente_id = Column(String(36), ForeignKey("pacientes.id"), nullable=False)
    servicio_id = Column(String(36), ForeignKey("servicios.id"), nullable=False)
    inicio_iso = Column(DateTime, nullable=False)
    fin_iso = Column(DateTime, nullable=False)
    estado = Column(String(50), default="Bloqueo_Temporal")
    activo = Column(Boolean, default=True, nullable=False)

    paciente = relationship("Paciente", back_populates="citas")
    servicio = relationship("Servicio", back_populates="citas")
    pago = relationship("Pago", back_populates="cita", uselist=False)
    sesion = relationship("HistorialSesiones", back_populates="cita", uselist=False)

class HistorialSesiones(Base):
    __tablename__ = "historial_sesiones"
    id = Column(String(36), primary_key=True, default=generar_uuid)
    paciente_id = Column(String(36), ForeignKey("pacientes.id"), nullable=False)
    cita_id = Column(String(36), ForeignKey("citas.id"), unique=True, nullable=False)
    notas_clinicas = Column(Text)
    tareas_asignadas = Column(Text)
    estado_emocional = Column(String(50))
    nivel_cortisol_estimado = Column(Integer)
    fecha_registro = Column(DateTime, default=datetime.utcnow)
    activo = Column(Boolean, default=True, nullable=False)

    paciente = relationship("Paciente", back_populates="historial")
    cita = relationship("Cita", back_populates="sesion")

class BonoPaciente(Base):
    __tablename__ = "bonos_pacientes"
    id = Column(String(36), primary_key=True, default=generar_uuid)
    paciente_id = Column(String(36), ForeignKey("pacientes.id"), nullable=False)
    servicio_id = Column(String(36), ForeignKey("servicios.id"), nullable=False)
    sesiones_totales = Column(Integer, nullable=False)
    sesiones_consumidas = Column(Integer, default=0, nullable=False)
    estado = Column(String(20), default="Activo")
    activo = Column(Boolean, default=True, nullable=False)

    paciente = relationship("Paciente", back_populates="bonos")
    servicio = relationship("Servicio", back_populates="bonos")
    pagos = relationship("Pago", back_populates="bono")

class Pago(Base):
    __tablename__ = "pagos"
    id = Column(String(36), primary_key=True, default=generar_uuid)
    paciente_id = Column(String(36), ForeignKey("pacientes.id"), nullable=False)
    cita_id = Column(String(36), ForeignKey("citas.id"), nullable=True)
    bono_id = Column(String(36), ForeignKey("bonos_pacientes.id"), nullable=True)
    referencia_redsys = Column(String(100), unique=True)
    importe_centimos = Column(Integer, nullable=False)
    estado_transaccion = Column(String(50), default="Pendiente")
    activo = Column(Boolean, default=True, nullable=False)
    fecha_pago = Column(DateTime, default=datetime.utcnow)

    paciente = relationship("Paciente", back_populates="pagos")
    cita = relationship("Cita", back_populates="pago")
    bono = relationship("BonoPaciente", back_populates="pagos")

class Auditoria(Base):
    __tablename__ = "auditoria"
    id = Column(String(36), primary_key=True, default=generar_uuid)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False) # Conectado a tabla segura
    accion = Column(String(100), nullable=False)
    tabla_afectada = Column(String(50))
    registro_id = Column(String(36))
    detalles = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)

    usuario = relationship("Usuario")
