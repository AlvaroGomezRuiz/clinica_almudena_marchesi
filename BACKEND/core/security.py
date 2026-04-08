import jwt
import pyotp
import qrcode
import base64
from io import BytesIO
from datetime import datetime, timedelta
from typing import Optional
from jwt.exceptions import PyJWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from cryptography.fernet import Fernet

# --- NUEVO: Suministros para el Rate Limiting ---
from slowapi import Limiter
from slowapi.util import get_remote_address

# 1. CARGA DE CONFIGURACIÓN
from core.config import settings

SECRET_KEY = settings.SECRET_KEY
ALGORITHM = "HS256"
ENCRYPTION_KEY = settings.ENCRYPTION_KEY

# Inicializar motor AES-256
fernet = Fernet(ENCRYPTION_KEY.encode())

# --- NUEVO: Inicializamos el Limiter aquí ---
limiter = Limiter(key_func=get_remote_address)

# 2. SEGURIDAD DE ACCESO (JWT con PyJWT)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(hours=8))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Sesión inválida o expirada",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub") # type: ignore
        if username is None:
            raise credentials_exception
        return username
    except PyJWTError:
        raise credentials_exception

# 3. DOBLE FACTOR - MFA
def generate_mfa_secret() -> str:
    return pyotp.random_base32()

def get_mfa_qr_data(username: str, secret: str) -> str:
    totp = pyotp.totp.TOTP(secret)
    provisioning_uri = totp.provisioning_uri(name=username, issuer_name="Clinica Almudena")
    img = qrcode.make(provisioning_uri)
    buffered = BytesIO()
    img.save(buffered, "PNG")
    return base64.b64encode(buffered.getvalue()).decode()

def verify_mfa_token(secret: str, token: str) -> bool:
    if not secret: return False
    totp = pyotp.totp.TOTP(secret)
    return totp.verify(token)

# 4. BLINDAJE DE DATOS CLÍNICOS
def encrypt_data(text: str) -> str:
    if not text: return ""
    return fernet.encrypt(text.encode()).decode()

def decrypt_data(encrypted_text: str) -> str:
    if not encrypted_text: return ""
    try:
        return fernet.decrypt(encrypted_text.encode()).decode()
    except Exception:
        return "[DATOS CORRUPTOS O LLAVE INVÁLIDA]"
