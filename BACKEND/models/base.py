import uuid
from datetime import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Text,
    Index,
)
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
    role = Column(String(20), nullable=False, default="paciente")
    is_admin = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)

    # Campos MFA
    mfa_secret = Column(String(32), nullable=True)
    mfa_enabled = Column(Boolean, default=False)

    # Perfil profesional (admin)
    perfil_nombre = Column(String(255), nullable=True)
    perfil_numero_colegiada = Column(String(64), nullable=True)
    perfil_email = Column(String(255), nullable=True)

    # Alertas de seguridad
    intrusion_alerts_enabled = Column(Boolean, default=True)

    def __repr__(self):
        return f"<Usuario {self.username}>"


# ==========================================
# 1B. SESIONES (Confiar en este dispositivo)
# ==========================================
class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(String(36), primary_key=True, default=generar_uuid)
    user_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False, index=True)

    jti = Column(String(128), unique=True, index=True, nullable=False)
    trusted = Column(Boolean, default=False, nullable=False)

    device_fingerprint_hash = Column(String(64), nullable=True, index=True)
    user_agent_hash = Column(String(64), nullable=False)

    ip_first = Column(String(45), nullable=False)
    ip_last = Column(String(45), nullable=False)
    ip_network = Column(String(64), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_seen_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    mfa_verified_at = Column(DateTime, nullable=True, index=True)
    expires_at = Column(DateTime, nullable=False, index=True)
    revoked_at = Column(DateTime, nullable=True, index=True)

    admin_ip_lock = Column(String(45), nullable=True)

    usuario = relationship("Usuario")


# ==========================================
# 1C. DEFENSA ACTIVA (Bloqueo IP por fallos)
# ==========================================
class AuthIPThrottle(Base):
    __tablename__ = "auth_ip_throttle"

    ip = Column(String(45), primary_key=True)
    failures = Column(Integer, nullable=False, default=0)
    first_failure_at = Column(DateTime, nullable=True)
    last_failure_at = Column(DateTime, nullable=True)
    blocked_until = Column(DateTime, nullable=True, index=True)


# ==========================================
# 2. MODELOS CLÍNICOS
# ==========================================
class Paciente(Base):
    __tablename__ = "pacientes"
    id = Column(String(36), primary_key=True, default=generar_uuid)
    # Campos sensibles: se almacenan cifrados (Fernet) y se indexan vía blind index.
    dni_nie = Column(String(255), nullable=False)
    dni_nie_bidx = Column(String(64), unique=True, index=True, nullable=True)
    nombre_completo = Column(String(255), nullable=False)
    nombre_completo_bidx = Column(String(64), index=True, nullable=True)
    email = Column(String(100), unique=True, index=True)
    telefono = Column(String(255))
    telefono_bidx = Column(String(64), index=True, nullable=True)
    fecha_nacimiento = Column(Date)
    fecha_alta = Column(Date)
    motivo_consulta_inicial = Column(Text)
    experiencia_terapia = Column(String(255), nullable=True)
    motivo_consulta = Column(Text, nullable=True)
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


class AgendaBloqueo(Base):
    __tablename__ = "agenda_bloqueos"

    id = Column(String(36), primary_key=True, default=generar_uuid)
    inicio_iso = Column(DateTime, nullable=False, index=True)
    fin_iso = Column(DateTime, nullable=False, index=True)
    motivo = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    activo = Column(Boolean, default=True, nullable=False, index=True)


class AgendaNotaDia(Base):
    __tablename__ = "agenda_notas_dia"

    id = Column(String(36), primary_key=True, default=generar_uuid)
    dia = Column(Date, nullable=False, unique=True, index=True)
    nota_ciphertext = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)


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
    stripe_event_id = Column(String(255), unique=True, index=True, nullable=True)
    referencia_redsys = Column(String(100), unique=True)
    importe_centimos = Column(Integer, nullable=False)
    estado_transaccion = Column(String(50), default="Pendiente")
    activo = Column(Boolean, default=True, nullable=False)
    fecha_pago = Column(DateTime, default=datetime.utcnow)

    paciente = relationship("Paciente", back_populates="pagos")
    cita = relationship("Cita", back_populates="pago")
    bono = relationship("BonoPaciente", back_populates="pagos")


class FacturacionNota(Base):
    __tablename__ = "facturacion_notas"

    id = Column(Integer, primary_key=True, index=True)
    nota = Column(Text, nullable=False, default="")
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
    updated_by_user_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)

    updated_by = relationship("Usuario")


class Auditoria(Base):
    __tablename__ = "auditoria"
    id = Column(String(36), primary_key=True, default=generar_uuid)
    usuario_id = Column(
        Integer, ForeignKey("usuarios.id"), nullable=False
    )  # Conectado a tabla segura
    accion = Column(String(100), nullable=False)
    tabla_afectada = Column(String(50))
    registro_id = Column(String(36))
    detalles = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)

    usuario = relationship("Usuario")


# ==========================================
# 3. OTP (Registro Verificado Anti-Bots)
# ==========================================
class OTP(Base):
    __tablename__ = "otp_challenges"

    id = Column(String(36), primary_key=True, default=generar_uuid)
    user_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False, index=True)
    purpose = Column(String(32), nullable=False)
    channel = Column(String(16), nullable=False)
    destination = Column(String(320), nullable=False)
    code_hash = Column(String(255), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    attempts = Column(Integer, nullable=False, default=0)
    consumed_at = Column(DateTime, nullable=True)

    usuario = relationship("Usuario")


# ==========================================
# 4A. RECURSOS (Repositorio + Asignación a Paciente)
# ==========================================
class Recurso(Base):
    __tablename__ = "recursos"

    id = Column(String(36), primary_key=True, default=generar_uuid)
    titulo = Column(String(255), nullable=False)
    tipo = Column(String(50), nullable=False, default="archivo")
    categoria = Column(String(50), nullable=False, default="recurso", index=True)

    original_filename = Column(String(255), nullable=True)
    storage_path = Column(String(255), nullable=False)
    mime_type = Column(String(127), nullable=True)
    size_bytes = Column(Integer, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    activo = Column(Boolean, default=True, nullable=False, index=True)

    asignaciones = relationship("RecursoAsignacion", back_populates="recurso")


class RecursoAsignacion(Base):
    __tablename__ = "recurso_asignaciones"

    id = Column(String(36), primary_key=True, default=generar_uuid)
    recurso_id = Column(
        String(36), ForeignKey("recursos.id"), nullable=False, index=True
    )
    paciente_id = Column(
        String(36), ForeignKey("pacientes.id"), nullable=False, index=True
    )
    assigned_by_user_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    assigned_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    activo = Column(Boolean, default=True, nullable=False, index=True)

    recurso = relationship("Recurso", back_populates="asignaciones")
    paciente = relationship("Paciente")
    assigned_by = relationship("Usuario")


Index(
    "ux_recurso_asignaciones_recurso_paciente",
    RecursoAsignacion.recurso_id,
    RecursoAsignacion.paciente_id,
    unique=True,
)


# ==========================================
# 4B. CONVERSACIONES (Chat)
# ==========================================
class Conversacion(Base):
    __tablename__ = "conversaciones"

    id = Column(String(36), primary_key=True, default=generar_uuid)
    paciente_id = Column(
        String(36), ForeignKey("pacientes.id"), nullable=False, index=True
    )

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_message_at = Column(DateTime, nullable=True, index=True)

    archived_at = Column(DateTime, nullable=True, index=True)
    deleted_at = Column(DateTime, nullable=True, index=True)
    activo = Column(Boolean, default=True, nullable=False, index=True)

    paciente = relationship("Paciente")


# ==========================================
# 4. CHAT (Cifrado a Nivel de Aplicación)
# ==========================================
class Mensajes(Base):
    __tablename__ = "mensajes"

    id = Column(String(36), primary_key=True, default=generar_uuid)
    conversation_id = Column(String(36), nullable=False, index=True)
    sender_user_id = Column(
        Integer, ForeignKey("usuarios.id"), nullable=False, index=True
    )
    body_ciphertext = Column(Text, nullable=False)
    encryption_version = Column(String(10), nullable=False, default="v1")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    sender = relationship("Usuario")
