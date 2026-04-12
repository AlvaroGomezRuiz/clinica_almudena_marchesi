import os
import hashlib
import hmac
import ipaddress
import secrets
import smtplib
import ssl
from datetime import datetime, timedelta
from email.message import EmailMessage
from typing import Optional, cast
import jwt
import pyotp
from jwt.exceptions import PyJWTError
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict, Field, model_validator
from passlib.context import CryptContext

from db.session import SessionLocal
from models.base import AuthIPThrottle, OTP, UserSession, Usuario
from utils.config import settings
from schemas.otp_schema import RegisterStartRequest, VerifyOTPRequest

from utils.security import (
    create_access_token,
    verify_mfa_token,
    generate_mfa_secret,
    get_mfa_qr_data,
    limiter,
)

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

JWT_ALGORITHM = "HS256"


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


class AdminVerifyTOTPRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")


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


def _get_smtp_config() -> Optional[dict]:
    host = os.getenv("SMTP_HOST") or os.getenv("SMTP_SERVER")
    if not host:
        return None

    port_str = os.getenv("SMTP_PORT") or ""
    try:
        port = int(port_str) if port_str else 587
    except ValueError:
        port = 587

    user = os.getenv("SMTP_USER") or os.getenv("SMTP_USERNAME")
    password = os.getenv("SMTP_PASSWORD")
    from_addr = os.getenv("SMTP_FROM") or user
    if not from_addr:
        return None

    use_ssl = (os.getenv("SMTP_USE_SSL") or "").lower() == "true"
    use_tls = (
        os.getenv("SMTP_USE_TLS") or os.getenv("SMTP_STARTTLS") or "true"
    ).lower() == "true"

    return {
        "host": host,
        "port": port,
        "user": user,
        "password": password,
        "from_addr": from_addr,
        "use_ssl": use_ssl,
        "use_tls": use_tls,
    }


def _send_otp_email(to_email: str, code: str) -> bool:
    cfg = _get_smtp_config()
    if not cfg:
        return False

    msg = EmailMessage()
    msg["Subject"] = "Código de verificación"
    msg["From"] = cast(str, cfg["from_addr"])
    msg["To"] = to_email
    msg.set_content(
        "Tu código de verificación es: " + code + "\n\nCaduca en 10 minutos.\n"
    )

    try:
        if bool(cfg["use_ssl"]):
            server = smtplib.SMTP_SSL(
                cast(str, cfg["host"]), cast(int, cfg["port"]), timeout=10
            )
        else:
            server = smtplib.SMTP(
                cast(str, cfg["host"]), cast(int, cfg["port"]), timeout=10
            )

        with server:
            server.ehlo()
            if (not bool(cfg["use_ssl"])) and bool(cfg["use_tls"]):
                server.starttls(context=ssl.create_default_context())
                server.ehlo()

            if cfg.get("user") and cfg.get("password"):
                server.login(cast(str, cfg["user"]), cast(str, cfg["password"]))

            server.send_message(msg)

        return True
    except Exception:
        return False


def _extract_bearer_token(request: Request) -> Optional[str]:
    auth = request.headers.get("authorization") or request.headers.get("Authorization")
    if auth:
        parts = auth.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            return parts[1]

    cookie_token = request.cookies.get("auth_token")
    if cookie_token:
        return cookie_token

    return None


def _get_user_role(usuario: Usuario) -> str:
    role = cast(str, getattr(usuario, "role", None) or "").strip().lower()
    if role:
        return role
    return "admin" if bool(getattr(usuario, "is_admin", False)) else "paciente"


def _load_session_from_request(
    request: Request, db: Session
) -> tuple[dict, Usuario, UserSession]:
    token = _extract_bearer_token(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión inválida o expirada",
        )

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[JWT_ALGORITHM])
        username = payload.get("sub")
        jti = payload.get("jti")
        if not isinstance(username, str) or not isinstance(jti, str):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Sesión inválida o expirada",
            )
    except PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión inválida o expirada",
        )

    usuario = db.query(Usuario).filter(Usuario.username == username).first()
    if not usuario or not cast(bool, getattr(usuario, "is_active", False)):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión inválida o expirada",
        )

    sesion = (
        db.query(UserSession)
        .filter(UserSession.user_id == usuario.id, UserSession.jti == jti)
        .first()
    )
    if not sesion or sesion.revoked_at is not None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión inválida o expirada",
        )

    now = datetime.utcnow()
    expires_at = cast(Optional[datetime], getattr(sesion, "expires_at", None))
    if expires_at is None or expires_at <= now:
        sesion.revoked_at = now  # type: ignore
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión inválida o expirada",
        )

    return payload, usuario, sesion


def _issue_session(
    request: Request,
    db: Session,
    usuario: Usuario,
    trust_device: bool,
    device_fingerprint: Optional[str],
) -> str:
    now = datetime.utcnow()
    role = cast(str, getattr(usuario, "role", None) or "").strip().lower()
    if not role:
        role = "admin" if bool(getattr(usuario, "is_admin", False)) else "paciente"

    expires_delta = (
        timedelta(days=30)
        if role == "paciente"
        else (timedelta(days=30) if trust_device else timedelta(hours=8))
    )
    expires_at = now + expires_delta

    ip = _get_client_ip(request)
    user_agent = request.headers.get("user-agent", "")

    jti = secrets.token_urlsafe(32)
    jwt_token = create_access_token(
        data={"sub": cast(str, usuario.username), "role": role},
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
        admin_ip_lock=(ip if role == "admin" else None),
    )
    db.add(session_row)
    db.commit()
    return jwt_token


def _ensure_ip_not_blocked(request: Request, db: Session) -> None:
    ip = _get_client_ip(request)
    if not ip:
        return

    row = db.query(AuthIPThrottle).filter(AuthIPThrottle.ip == ip).first()
    if not row:
        return

    blocked_until = cast(Optional[datetime], getattr(row, "blocked_until", None))
    if blocked_until is not None and blocked_until > datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="IP bloqueada temporalmente por intentos fallidos",
        )


def _intrusion_alerts_enabled(db: Session) -> bool:
    """Devuelve si las alertas de intrusión están activadas para el entorno.

    Fuente: preferencia persistida en el primer admin activo.
    Seguridad por defecto: si el campo está a NULL (o falta por datos antiguos), se trata como activado.
    """

    admin = (
        db.query(Usuario)
        .filter(Usuario.is_active == True)
        .filter((Usuario.role == "admin") | (Usuario.is_admin == True))
        .order_by(Usuario.id.asc())
        .first()
    )
    if not admin:
        return False

    raw = getattr(admin, "intrusion_alerts_enabled", None)
    if raw is None:
        return True
    return bool(raw)


def _capture_intrusion_alert(
    request: Request, ip: str, failures: int, blocked_until: datetime
) -> None:
    """Emite una alerta a Sentry (si está configurado) con contexto mínimo."""

    try:
        import sentry_sdk

        with sentry_sdk.push_scope() as scope:
            scope.set_tag("security_event", "auth_ip_blocked")
            scope.set_extra("ip", ip)
            scope.set_extra("failures", failures)
            scope.set_extra("blocked_until", blocked_until.isoformat())
            scope.set_extra("path", request.url.path)
            user_agent = request.headers.get("user-agent")
            if user_agent:
                scope.set_extra("user_agent", user_agent)

            sentry_sdk.capture_message(
                "ALERTA_INTRUSION: IP bloqueada por intentos fallidos",
                level="warning",
            )
    except Exception:
        # Nunca interrumpimos el login por alertas.
        return


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

    blocked_until = cast(Optional[datetime], getattr(row, "blocked_until", None))

    # Si estaba bloqueada pero ya expiró, resetea.
    if blocked_until is not None and blocked_until <= now:
        row.failures = 0  # type: ignore
        row.blocked_until = None  # type: ignore
        row.first_failure_at = None  # type: ignore
        blocked_until = None

    row.failures = cast(int, row.failures) + 1  # type: ignore
    row.last_failure_at = now  # type: ignore

    if cast(int, row.failures) >= 3:
        was_blocked = blocked_until is not None and blocked_until > now
        new_blocked_until = now + timedelta(hours=1)
        row.blocked_until = new_blocked_until  # type: ignore
        blocked_until = new_blocked_until

        if not was_blocked and _intrusion_alerts_enabled(db):
            _capture_intrusion_alert(
                request=request,
                ip=ip,
                failures=cast(int, row.failures),
                blocked_until=blocked_until,
            )

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

    role = _get_user_role(usuario)

    provisioning_uri: str | None = None
    if role == "admin":
        # Si el admin no tiene MFA configurado (sin secret), lo generamos y devolvemos
        # el provisioning_uri para onboarding en /admin/mfa.
        secret = cast(str, getattr(usuario, "mfa_secret", None) or "").strip()
        if not secret:
            secret = generate_mfa_secret()
            usuario.mfa_secret = secret  # type: ignore[assignment]
            provisioning_uri = pyotp.totp.TOTP(secret).provisioning_uri(
                name=cast(str, usuario.username), issuer_name="Clinica Almudena"
            )

    if bool(usuario.mfa_enabled):
        # MFA legacy (ya soportado por /verify-mfa). En el flujo asimétrico actual,
        # no bloqueamos el login: el rol admin se verifica en /admin/mfa.
        pass

    access_token = _issue_session(
        request=request,
        db=db,
        usuario=usuario,
        trust_device=bool(data.trust_device),
        device_fingerprint=data.device_fingerprint,
    )

    response: dict[str, object] = {
        "status": "success",
        "access_token": access_token,
        "token_type": "bearer",
        "username": usuario.username,
        "role": role,
    }

    if provisioning_uri:
        response["provisioning_uri"] = provisioning_uri

    return response


@router.post("/refresh")
def refresh_sliding_session(request: Request, db: Session = Depends(get_db)):
    """Sliding sessions (pacientes): renueva el JWT a 30 días cuando el token está a medio consumir."""

    payload, usuario, sesion = _load_session_from_request(request, db)
    username = cast(str, payload.get("sub"))
    jti = cast(str, payload.get("jti"))
    exp = payload.get("exp")
    iat = payload.get("iat")

    role = _get_user_role(usuario)
    if role != "paciente":
        return {"status": "ok", "refreshed": False}

    now = datetime.utcnow()

    if not isinstance(exp, int) or not isinstance(iat, int):
        return {"status": "ok", "refreshed": False}

    ttl_seconds = exp - iat
    if ttl_seconds <= 0:
        return {"status": "ok", "refreshed": False}

    now_ts = int(now.timestamp())
    half_ts = int(iat + (ttl_seconds / 2))
    if now_ts < half_ts:
        return {"status": "ok", "refreshed": False}

    expires_delta = timedelta(days=30)
    new_token = create_access_token(
        data={"sub": username, "role": role},
        expires_delta=expires_delta,
        jti=jti,
    )

    sesion.expires_at = now + expires_delta  # type: ignore
    db.commit()

    return {
        "status": "ok",
        "refreshed": True,
        "access_token": new_token,
        "token_type": "bearer",
    }


@router.get("/admin/status")
def admin_status(request: Request, db: Session = Depends(get_db)):
    """Estado de MFA para admin (revalidación cada 24h)."""

    _payload, usuario, sesion = _load_session_from_request(request, db)
    role = _get_user_role(usuario)

    if role != "admin":
        return {"is_admin": False, "mfa_verified": False}

    now = datetime.utcnow()
    verified_at = getattr(sesion, "mfa_verified_at", None)
    mfa_ok = bool(verified_at and (now - verified_at) <= timedelta(hours=24))

    return {"is_admin": True, "mfa_verified": mfa_ok}


@router.post("/admin/verify-totp")
@limiter.limit("10/minute")
def admin_verify_totp(
    request: Request, data: AdminVerifyTOTPRequest, db: Session = Depends(get_db)
):
    """Valida TOTP (Google Authenticator) y marca la sesión como verificada por 24h."""

    _payload, usuario, sesion = _load_session_from_request(request, db)
    role = _get_user_role(usuario)
    if role != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")

    secret = cast(str, getattr(usuario, "mfa_secret", None) or "").strip()
    if not secret:
        raise HTTPException(status_code=400, detail="MFA no configurado")

    code = data.code.strip().replace(" ", "")
    if not verify_mfa_token(secret, code):
        raise HTTPException(status_code=401, detail="Código de seguridad incorrecto")

    sesion.mfa_verified_at = datetime.utcnow()  # type: ignore
    db.commit()
    return {"status": "ok"}


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
                role="paciente",
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
        db.commit()

        sent = False
        if data.channel == "email":
            sent = _send_otp_email(destination, code)

        if not sent:
            print(f"--- OTP de Desarrollo: {code} ---")

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

        otp.consumed_at = now  # type: ignore[assignment]

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
