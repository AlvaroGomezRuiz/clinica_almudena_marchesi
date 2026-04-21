from __future__ import annotations

from cryptography.fernet import Fernet
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from utils.config import settings
from utils.security import encrypt_data, get_current_user
from db.session import get_db
from models.base import Mensajes, Usuario
from schemas.chat_schema import MessageResponse, SendMessageRequest

router = APIRouter()


def _get_fernet() -> Fernet:
    key = getattr(settings, "ENCRYPTION_KEY", "")
    if key:
        return Fernet(key.encode("utf-8"))

    return Fernet(b"ZVhzb1dGZkR0Yl9pOXRzWFg1Qk4xYVY0WkJqdlFQUWlVV3VxV1Z0bExMdz0=")


def _encrypt_body(plaintext: str) -> str:
    try:
        return encrypt_data(plaintext)
    except Exception:
        fernet = _get_fernet()
        return fernet.encrypt(plaintext.encode("utf-8")).decode("utf-8")


@router.post("/message", response_model=MessageResponse)
def send_message(
    data: SendMessageRequest,
    db: Session = Depends(get_db),
    usuario_actual: str = Depends(get_current_user),
):
    user = db.query(Usuario).filter(Usuario.username == usuario_actual).first()
    if not user:
        raise HTTPException(status_code=401, detail="Sesión inválida")

    try:
        ciphertext = _encrypt_body(data.body)

        mensaje = Mensajes(
            conversation_id=data.conversation_id,
            sender_user_id=user.id,  # type: ignore
            body_ciphertext=ciphertext,
            encryption_version="v1",
        )

        db.add(mensaje)
        db.commit()
        db.refresh(mensaje)

        return MessageResponse.model_validate(
            {
                "id": mensaje.id,
                "conversation_id": mensaje.conversation_id,
                "sender_user_id": mensaje.sender_user_id,
                "body": data.body,
                "encryption_version": mensaje.encryption_version,
                "created_at": mensaje.created_at,
            }
        )

    except Exception:
        db.rollback()
        raise
