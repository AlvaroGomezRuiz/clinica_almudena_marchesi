import jwt
import pyotp
import qrcode
import base64
import hashlib
import hmac
import ipaddress
from io import BytesIO
from datetime import datetime, timedelta
from typing import Optional
from jwt.exceptions import PyJWTError
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from cryptography.fernet import Fernet
from sqlalchemy.orm import Session

# --- NUEVO: Suministros para el Rate Limiting ---
from slowapi import Limiter
from slowapi.util import get_remote_address

# 1. CARGA DE CONFIGURACIÓN
from utils.config import settings

from db.session import get_db

# NOTE: UserSession & Usuario are imported lazily inside functions
# to break a circular import chain:
#   models.base → db.types.encrypted → utils.security → models.base
# Use _get_models() helper below.

def _get_models():
    """Lazy import to avoid circular dependency."""
    from models.base import UserSession, Usuario
    return UserSession, Usuario


SECRET_KEY = settings.SECRET_KEY
ALGORITHM = "HS256"
ENCRYPTION_KEY = settings.ENCRYPTION_KEY

# Inicializar motor AES-256
fernet = Fernet(ENCRYPTION_KEY.encode())

# --- NUEVO: Inicializamos el Limiter aquí ---
limiter = Limiter(key_func=get_remote_address)

# 2. SEGURIDAD DE ACCESO (JWT con PyJWT)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")


def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None,
    jti: Optional[str] = None,
):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(hours=8))
    to_encode.update({"exp": expire, "iat": datetime.utcnow()})
    if jti:
        to_encode.update({"jti": jti})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def _hash_with_secret(value: str, context: str) -> str:
    msg = f"{context}:{value}".encode("utf-8")
    return hmac.new(SECRET_KEY.encode("utf-8"), msg, hashlib.sha256).hexdigest()


def _get_client_ip(request: Request) -> str:
    remote_ip = request.client.host if request.client and request.client.host else ""

    if settings.TRUST_PROXY_HEADERS and remote_ip:
        trusted = {
            ip.strip()
            for ip in (settings.TRUSTED_PROXY_IPS or "").split(",")
            if ip.strip()
        }
        if remote_ip in trusted:
            xff = request.headers.get("x-forwarded-for") or request.headers.get(
                "X-Forwarded-For"
            )
            if xff:
                candidate = xff.split(",")[0].strip()
                try:
                    ipaddress.ip_address(candidate)
                    return candidate
                except ValueError:
                    pass

            xri = request.headers.get("x-real-ip") or request.headers.get("X-Real-Ip")
            if xri:
                candidate = xri.strip()
                try:
                    ipaddress.ip_address(candidate)
                    return candidate
                except ValueError:
                    pass

    return remote_ip


def _get_ip_network(ip: str) -> Optional[str]:
    try:
        addr = ipaddress.ip_address(ip)
        if addr.version == 4:
            return str(ipaddress.ip_network(f"{ip}/24", strict=False))
        return str(ipaddress.ip_network(f"{ip}/64", strict=False))
    except ValueError:
        return None


def _extract_token(request: Request) -> Optional[str]:
    auth = request.headers.get("authorization") or request.headers.get("Authorization")
    if auth:
        parts = auth.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            return parts[1]

    cookie_token = request.cookies.get("auth_token")
    if cookie_token:
        return cookie_token

    return None


def get_current_user(request: Request, db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Sesión inválida o expirada",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token = _extract_token(request)
    if not token:
        raise credentials_exception

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        jti = payload.get("jti")
        if not isinstance(username, str) or not isinstance(jti, str):
            raise credentials_exception
    except PyJWTError:
        raise credentials_exception

    UserSession, Usuario = _get_models()
    usuario = db.query(Usuario).filter(Usuario.username == username).first()
    if not usuario or not bool(usuario.is_active):
        raise credentials_exception

    sesion = (
        db.query(UserSession)
        .filter(UserSession.user_id == usuario.id, UserSession.jti == jti)
        .first()
    )

    if not sesion or sesion.revoked_at is not None:
        raise credentials_exception

    now = datetime.utcnow()
    if sesion.expires_at <= now:
        sesion.revoked_at = now  # type: ignore
        db.commit()
        raise credentials_exception

    ip = _get_client_ip(request)
    user_agent = request.headers.get("user-agent", "")
    ua_hash = _hash_with_secret(user_agent, "ua")

    # Admin: sesión vinculada a IP exacta (anti-robo de cookie)
    if bool(usuario.is_admin):
        # Timeout por inactividad (acciones sensibles): 15 minutos.
        if sesion.last_seen_at and (now - sesion.last_seen_at) > timedelta(minutes=15):
            sesion.revoked_at = now  # type: ignore
            db.commit()
            raise credentials_exception

        if sesion.admin_ip_lock and ip and ip != sesion.admin_ip_lock:
            sesion.revoked_at = now  # type: ignore
            db.commit()
            raise credentials_exception

    # Sesión confiable: binding a dispositivo + drift detection
    if bool(sesion.trusted):
        device_id = request.cookies.get("device_id")
        if not device_id or not sesion.device_fingerprint_hash:
            sesion.revoked_at = now  # type: ignore
            db.commit()
            raise credentials_exception

        device_hash = _hash_with_secret(device_id, "device")
        if not hmac.compare_digest(device_hash, sesion.device_fingerprint_hash):
            sesion.revoked_at = now  # type: ignore
            db.commit()
            raise credentials_exception

        if not hmac.compare_digest(ua_hash, sesion.user_agent_hash):
            sesion.revoked_at = now  # type: ignore
            db.commit()
            raise credentials_exception

        current_net = _get_ip_network(ip) if ip else None
        if sesion.ip_network and current_net and current_net != sesion.ip_network:
            sesion.revoked_at = now  # type: ignore
            db.commit()
            raise credentials_exception

    sesion.last_seen_at = now  # type: ignore
    if ip:
        sesion.ip_last = ip  # type: ignore
    db.commit()

    return username


# 3. DOBLE FACTOR - MFA
def generate_mfa_secret() -> str:
    return pyotp.random_base32()


def get_mfa_qr_data(username: str, secret: str) -> str:
    totp = pyotp.totp.TOTP(secret)
    provisioning_uri = totp.provisioning_uri(
        name=username, issuer_name="Clinica Almudena"
    )
    img = qrcode.make(provisioning_uri)
    buffered = BytesIO()
    img.save(buffered, "PNG")
    return base64.b64encode(buffered.getvalue()).decode()


def verify_mfa_token(secret: str, token: str) -> bool:
    if not secret:
        return False
    totp = pyotp.totp.TOTP(secret)
    return totp.verify(token)


# 4. BLINDAJE DE DATOS CLÍNICOS
def encrypt_data(text: str) -> str:
    if not text:
        return ""
    return fernet.encrypt(text.encode()).decode()


def decrypt_data(encrypted_text: str) -> str:
    if not encrypted_text:
        return ""
    try:
        return fernet.decrypt(encrypted_text.encode()).decode()
    except Exception:
        # Error genérico: nunca revelar detalles de Fernet/clave al frontend.
        return "[ERROR_INTEGRIDAD_DATOS]"


# ─── CONTROL DE ACCESO POR ROL ───

def _get_user_role(usuario) -> str:
    role = str(getattr(usuario, "role", None) or "").strip().lower()
    if role:
        return role
    return "admin" if bool(getattr(usuario, "is_admin", False)) else "paciente"


def get_current_admin(request: Request, db: Session = Depends(get_db)) -> str:
    """Dependencia que garantiza que el usuario es admin.

    Los tokens de paciente son rechazados en rutas administrativas.
    """
    username = get_current_user(request, db)
    _, Usuario = _get_models()
    usuario = db.query(Usuario).filter(Usuario.username == username).first()
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión inválida o expirada",
        )
    if _get_user_role(usuario) != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso restringido a administradores",
        )
    return username


def get_current_paciente(request: Request, db: Session = Depends(get_db)) -> str:
    """Dependencia que garantiza que el usuario es paciente.

    Los tokens administrativos son rechazados en rutas de paciente.
    """
    username = get_current_user(request, db)
    _, Usuario = _get_models()
    usuario = db.query(Usuario).filter(Usuario.username == username).first()
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión inválida o expirada",
        )
    if _get_user_role(usuario) != "paciente":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso restringido a pacientes",
        )
    return username
