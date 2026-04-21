"""
Tipos SQLAlchemy con cifrado Fernet (AES-256) a nivel de aplicación.

Blindaje:
  - Las variables de texto plano se limpian de memoria lo antes posible.
  - Las excepciones de descifrado devuelven un error genérico sin detalles técnicos.
"""

from __future__ import annotations

import ctypes
from typing import Optional

from sqlalchemy.types import TypeDecorator, String, Text

from utils.security import decrypt_data, encrypt_data


def _wipe_string(s: str) -> None:
    """Intenta sobrescribir el buffer interno de un str en CPython.

    Limitación conocida: Python puede crear copias internas (interning).
    Esta función es un best-effort para minimizar la ventana de exposición.
    """
    if not s:
        return
    try:
        # Localizar el buffer interno del str en CPython
        # PyUnicodeObject.data está a un offset fijo tras el header.
        buf_addr = id(s) + 48  # offset para CPython 3.10+ (compact ASCII)
        buf_size = len(s)
        ctypes.memset(buf_addr, 0, buf_size)
    except Exception:
        # Si falla (PyPy, Jython, etc.), seguimos sin romper nada.
        pass


def _decrypt_or_raise(value: str) -> str:
    """Descifra un valor Fernet. Devuelve error genérico si falla."""
    plaintext = decrypt_data(value)
    if plaintext.startswith("[ERROR_INTEGRIDAD"):
        raise ValueError("Error de integridad de datos.")
    return plaintext


class EncryptedString(TypeDecorator):
    """String cifrado a nivel de aplicación (Fernet)."""

    impl = String
    cache_ok = True

    def __init__(self, length: int = 255, *, nullable: bool = True):
        super().__init__(length=length)
        self._nullable = nullable

    def process_bind_param(self, value: Optional[str], dialect) -> Optional[str]:
        if value is None:
            return None if self._nullable else ""
        v = value.strip()
        if v == "":
            return "" if not self._nullable else ""
        ciphertext = encrypt_data(v)
        # Limpiar texto plano de memoria lo antes posible
        _wipe_string(v)
        return ciphertext

    def process_result_value(self, value: Optional[str], dialect) -> Optional[str]:
        if value is None:
            return None
        if value == "":
            return ""
        # Fernet tokens suelen empezar por gAAAA; si no, asumimos legacy plaintext.
        return _decrypt_or_raise(value) if value.startswith("gAAAA") else value


class EncryptedText(TypeDecorator):
    """Text cifrado a nivel de aplicación (Fernet)."""

    impl = Text
    cache_ok = True

    def __init__(self, *, nullable: bool = True):
        super().__init__()
        self._nullable = nullable

    def process_bind_param(self, value: Optional[str], dialect) -> Optional[str]:
        if value is None:
            return None if self._nullable else ""
        v = value.strip()
        if v == "":
            return "" if not self._nullable else ""
        ciphertext = encrypt_data(v)
        _wipe_string(v)
        return ciphertext

    def process_result_value(self, value: Optional[str], dialect) -> Optional[str]:
        if value is None:
            return None
        if value == "":
            return ""
        return _decrypt_or_raise(value) if value.startswith("gAAAA") else value
