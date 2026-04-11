import os
import hashlib
import hmac
import ipaddress
import secrets
from datetime import datetime, timedelta
from typing import Optional, cast
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict, Field, model_validator
from passlib.context import CryptContext

from db.session import SessionLocal
from models.base import AuthIPThrottle, OTP, UserSession, Usuario
from core.config import settings
from schemas.otp_schema import RegisterStartRequest, VerifyOTPRequest

from core.security import (
    create_access_token,
    verify_mfa_token,
    generate_mfa_secret,
    get_mfa_qr_data,
    limiter,
)

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class LoginSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")
    username: str
    password: str

    trust_device: bool = False
    device_fingerprint: Optional[str] = Field(default=None, max_length=128)

    @model_validator(mode="after")
    def _validate_trust_device(self) -> "LoginSchema":
        if self.trust_device and not self.device_fingerprint:
            raise ValueError("device_fingerprint es obligatorio si trust_device=true")
        return self


class VerifyMFASchema(BaseModel):
    model_config = ConfigDict(extra="forbid")
    username: str
    code: str

    trust_device: bool = False
    device_fingerprint: Optional[str] = Field(default=None, max_length=128)

    @model_validator(mode="after")
    def _validate_trust_device(self) -> "VerifyMFASchema":
        if self.trust_device and not self.device_fingerprint:
            raise ValueError("device_fingerprint es obligatorio si trust_device=true")
        return self


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


def _hash_with_secret(value: str, context: str) -> str:
    msg = f"{context}:{value}".encode("utf-8")
    return hmac.new(
        settings.SECRET_KEY.encode("utf-8"), msg, hashlib.sha256
    ).hexdigest()


def _issue_session(
    request: Request,
    db: Session,
    usuario: Usuario,
    trust_device: bool,
    device_fingerprint: Optional[str],
) -> str:
    now = datetime.utcnow()
    expires_delta = timedelta(days=30) if trust_device else timedelta(hours=8)
    expires_at = now + expires_delta

    ip = _get_client_ip(request)
    user_agent = request.headers.get("user-agent", "")

    jti = secrets.token_urlsafe(32)
    jwt_token = create_access_token(
        data={"sub": cast(str, usuario.username)},
        expires_delta=expires_delta,
        jti=jti,
    )

    session_row = UserSession(
        user_id=cast(int, usuario.id),
        jti=jti,
        trusted=trust_device,
        device_fingerprint_hash=(
            _hash_with_secret(device_fingerprint or "", "device")
            if trust_device
            else None
        ),
        user_agent_hash=_hash_with_secret(user_agent, "ua"),
        ip_first=ip,
        ip_last=ip,
        ip_network=_get_ip_network(ip) if ip else None,
        created_at=now,
        last_seen_at=now,
        expires_at=expires_at,
        revoked_at=None,
        admin_ip_lock=(ip if bool(usuario.is_admin) else None),
    )
    db.add(session_row)
    db.commit()
    return jwt_token


def _ensure_ip_not_blocked(request: Request, db: Session) -> None:
    ip = _get_client_ip(request)
    if not ip:
        return

    row = db.query(AuthIPThrottle).filter(AuthIPThrottle.ip == ip).first()
    if row and row.blocked_until and row.blocked_until > datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="IP bloqueada temporalmente por intentos fallidos",
        )


def _register_login_failure(request: Request, db: Session) -> None:
    ip = _get_client_ip(request)
    if not ip:
        return

    now = datetime.utcnow()
    row = db.query(AuthIPThrottle).filter(AuthIPThrottle.ip == ip).first()
    if not row:
        row = AuthIPThrottle(
            ip=ip,
            failures=1,
            first_failure_at=now,
            last_failure_at=now,
            blocked_until=None,
        )
        db.add(row)
        db.commit()
        return

    # Si estaba bloqueada pero ya expiró, resetea.
    if row.blocked_until and row.blocked_until <= now:
        row.failures = 0  # type: ignore
        row.blocked_until = None  # type: ignore
        row.first_failure_at = None  # type: ignore

    row.failures = cast(int, row.failures) + 1  # type: ignore
    row.last_failure_at = now  # type: ignore

    if cast(int, row.failures) >= 3:
        row.blocked_until = now + timedelta(hours=1)  # type: ignore

    db.commit()


def _clear_login_failures(request: Request, db: Session) -> None:
    ip = _get_client_ip(request)
    if not ip:
        return

    row = db.query(AuthIPThrottle).filter(AuthIPThrottle.ip == ip).first()
    if not row:
        return

    row.failures = 0  # type: ignore
    row.first_failure_at = None  # type: ignore
    row.last_failure_at = None  # type: ignore
    row.blocked_until = None  # type: ignore
    db.commit()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/login")
@limiter.limit("5/minute")
def login(request: Request, data: LoginSchema, db: Session = Depends(get_db)):
    _ensure_ip_not_blocked(request, db)
    usuario = db.query(Usuario).filter(Usuario.username == data.username).first()

    error_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales inválidas"
    )

    if not usuario or not pwd_context.verify(
        data.password, cast(str, usuario.hashed_password)
    ):
        _register_login_failure(request, db)
        raise error_exc

    if not bool(usuario.is_active):
        raise HTTPException(status_code=403, detail="Cuenta desactivada")

    _clear_login_failures(request, db)

    if bool(usuario.mfa_enabled):
        return {
            "status": "mfa_required",
            "username": usuario.username,
            "message": "Doble factor requerido",
        }

    access_token = _issue_session(
        request=request,
        db=db,
        usuario=usuario,
        trust_device=bool(data.trust_device),
        device_fingerprint=data.device_fingerprint,
    )
    return {
        "status": "success",
        "access_token": access_token,
        "token_type": "bearer",
        "username": usuario.username,
    }


@router.post("/verify-mfa")
@limiter.limit("5/minute")
def verify_mfa(request: Request, data: VerifyMFASchema, db: Session = Depends(get_db)):
    _ensure_ip_not_blocked(request, db)
    usuario = db.query(Usuario).filter(Usuario.username == data.username).first()

    if not usuario or not bool(usuario.mfa_enabled):
        raise HTTPException(status_code=400, detail="MFA no configurado")

    if not verify_mfa_token(cast(str, usuario.mfa_secret), data.code):
        _register_login_failure(request, db)
        raise HTTPException(status_code=401, detail="Código de seguridad incorrecto")

    _clear_login_failures(request, db)

    access_token = _issue_session(
        request=request,
        db=db,
        usuario=usuario,
        trust_device=bool(data.trust_device),
        device_fingerprint=data.device_fingerprint,
    )
    return {
        "status": "success",
        "access_token": access_token,
        "token_type": "bearer",
        "username": usuario.username,
    }


@router.get("/mfa/setup")
def setup_mfa(username: str, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.username == username).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if not usuario.mfa_secret:  # type: ignore
        usuario.mfa_secret = generate_mfa_secret()  # type: ignore
        db.commit()

    qr_base64 = get_mfa_qr_data(
        cast(str, usuario.username), cast(str, usuario.mfa_secret)
    )

    return {
        "qr_code": f"data:image/png;base64,{qr_base64}",
        "mfa_enabled": bool(usuario.mfa_enabled),
    }


@router.post("/mfa/enable")
def enable_mfa(data: VerifyMFASchema, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.username == data.username).first()

    if not usuario or not usuario.mfa_secret:  # type: ignore
        raise HTTPException(status_code=400, detail="Inicie configuración primero")

    if verify_mfa_token(cast(str, usuario.mfa_secret), data.code):
        usuario.mfa_enabled = True  # type: ignore
        db.commit()
        return {"status": "MFA activado correctamente"}

    raise HTTPException(status_code=400, detail="Código de validación fallido")


@router.post("/register/start")
@limiter.limit("5/minute")
def register_start(
    request: Request, data: RegisterStartRequest, db: Session = Depends(get_db)
):
    try:
        email = data.email.strip().lower()

        usuario = db.query(Usuario).filter(Usuario.username == email).first()
        if not usuario:
            placeholder_password = pwd_context.hash(secrets.token_urlsafe(32))
            usuario = Usuario(
                username=email,
                hashed_password=placeholder_password,
                is_admin=False,
                is_active=False,
            )
            db.add(usuario)
            db.flush()

        destination = email if data.channel == "email" else cast(str, data.phone)

        code = f"{secrets.randbelow(1_000_000):06d}"
        code_hash = hmac.new(
            settings.SECRET_KEY.encode("utf-8"),
            code.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

        otp = OTP(
            user_id=cast(int, usuario.id),
            purpose="register",
            channel=data.channel,
            destination=destination,
            code_hash=code_hash,
            expires_at=datetime.utcnow() + timedelta(minutes=10),
            attempts=0,
            consumed_at=None,
        )
        db.add(otp)

        # Simulación: envío OTP (Email/SMS). Integrar proveedor real (SendGrid/Twilio) aquí.
        db.commit()
        return {"status": "ok"}
    except Exception:
        db.rollback()
        raise


@router.post("/register/verify-otp")
@limiter.limit("5/minute")
def register_verify_otp(
    request: Request, data: VerifyOTPRequest, db: Session = Depends(get_db)
):
    try:
        email = data.email.strip().lower()
        now = datetime.utcnow()

        otp = (
            db.query(OTP)
            .join(Usuario, OTP.user_id == Usuario.id)
            .filter(
                Usuario.username == email,
                OTP.purpose == "register",
                OTP.consumed_at.is_(None),
                OTP.expires_at > now,
            )
            .order_by(OTP.expires_at.desc())
            .first()
        )

        if not otp:
            raise HTTPException(status_code=400, detail="OTP expirado o inexistente")

        code_hash = hmac.new(
            settings.SECRET_KEY.encode("utf-8"),
            data.code.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(code_hash, cast(str, otp.code_hash)):
            raise HTTPException(status_code=401, detail="Código OTP inválido")

        otp.consumed_at = now

        usuario = db.query(Usuario).filter(Usuario.username == email).first()
        if not usuario:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

        usuario.hashed_password = pwd_context.hash(data.password)  # type: ignore
        usuario.is_active = True  # type: ignore
        db.commit()
        return {"status": "ok"}
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise
