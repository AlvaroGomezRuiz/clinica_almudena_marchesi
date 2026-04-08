import os
from datetime import timedelta
from typing import cast
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict
from passlib.context import CryptContext

from db.session import SessionLocal
from models.base import Usuario
from core.config import settings

from core.security import (
    create_access_token,
    verify_mfa_token,
    generate_mfa_secret,
    get_mfa_qr_data,
    limiter
)

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class LoginSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")
    username: str
    password: str

class VerifyMFASchema(BaseModel):
    model_config = ConfigDict(extra="forbid")
    username: str
    code: str

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/login")
@limiter.limit("5/minute")
def login(request: Request, data: LoginSchema, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.username == data.username).first()

    error_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales inválidas"
    )

    if not usuario or not pwd_context.verify(data.password, cast(str, usuario.hashed_password)):
        raise error_exc

    if not bool(usuario.is_active):
        raise HTTPException(status_code=403, detail="Cuenta desactivada")

    if bool(usuario.mfa_enabled):
        return {
            "status": "mfa_required",
            "username": usuario.username,
            "message": "Doble factor requerido"
        }

    access_token = create_access_token(data={"sub": cast(str, usuario.username)})
    return {
        "status": "success",
        "access_token": access_token,
        "token_type": "bearer",
        "username": usuario.username
    }

@router.post("/verify-mfa")
@limiter.limit("5/minute")
def verify_mfa(request: Request, data: VerifyMFASchema, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.username == data.username).first()

    if not usuario or not bool(usuario.mfa_enabled):
        raise HTTPException(status_code=400, detail="MFA no configurado")

    if not verify_mfa_token(cast(str, usuario.mfa_secret), data.code):
        raise HTTPException(status_code=401, detail="Código de seguridad incorrecto")

    access_token = create_access_token(data={"sub": cast(str, usuario.username)})
    return {
        "status": "success",
        "access_token": access_token,
        "token_type": "bearer",
        "username": usuario.username
    }

@router.get("/mfa/setup")
def setup_mfa(username: str, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.username == username).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if not usuario.mfa_secret: #type: ignore
        usuario.mfa_secret = generate_mfa_secret() # type: ignore
        db.commit()

    qr_base64 = get_mfa_qr_data(cast(str, usuario.username), cast(str, usuario.mfa_secret))

    return {
        "qr_code": f"data:image/png;base64,{qr_base64}",
        "mfa_enabled": bool(usuario.mfa_enabled)
    }

@router.post("/mfa/enable")
def enable_mfa(data: VerifyMFASchema, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.username == data.username).first()

    if not usuario or not usuario.mfa_secret: #type: ignore
        raise HTTPException(status_code=400, detail="Inicie configuración primero")

    if verify_mfa_token(cast(str, usuario.mfa_secret), data.code):
        usuario.mfa_enabled = True # type: ignore
        db.commit()
        return {"status": "MFA activado correctamente"}

    raise HTTPException(status_code=400, detail="Código de validación fallido")
