from __future__ import annotations

from typing import Optional

from sqlalchemy.types import TypeDecorator, String, Text

from utils.security import decrypt_data, encrypt_data


def _decrypt_or_raise(value: str) -> str:
    plaintext = decrypt_data(value)
    if plaintext.startswith("[DATOS CORRUPTOS"):
        raise ValueError("Ciphertext inválido o ENCRYPTION_KEY incorrecta.")
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
        return encrypt_data(v)

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
        return encrypt_data(v)

    def process_result_value(self, value: Optional[str], dialect) -> Optional[str]:
        if value is None:
            return None
        if value == "":
            return ""
        return _decrypt_or_raise(value) if value.startswith("gAAAA") else value

