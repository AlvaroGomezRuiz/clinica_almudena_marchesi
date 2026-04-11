from __future__ import annotations

from typing import Literal, Optional

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
    model_validator,
)


def _validate_password_policy(password: str) -> None:
    if len(password) < 14:
        raise ValueError("La contraseña debe tener al menos 14 caracteres")

    has_lower = any(ch.islower() for ch in password)
    has_upper = any(ch.isupper() for ch in password)
    has_digit = any(ch.isdigit() for ch in password)
    has_symbol = any(not ch.isalnum() for ch in password)

    if not (has_lower and has_upper and has_digit and has_symbol):
        raise ValueError(
            "La contraseña debe incluir mayúsculas, minúsculas, números y símbolos"
        )


class RegisterStartRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    channel: Literal["email", "sms"] = "email"
    phone: Optional[str] = Field(default=None, pattern=r"^\+?[0-9]{9,15}$")

    @model_validator(mode="after")
    def _validate_destination(self) -> "RegisterStartRequest":
        if self.channel == "sms" and not self.phone:
            raise ValueError("phone es obligatorio cuando channel='sms'")
        return self


class VerifyOTPRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    code: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")

    password: str = Field(..., min_length=14, max_length=128)
    password_confirm: str = Field(..., min_length=14, max_length=128)

    @field_validator("code")
    @classmethod
    def _normalize_code(cls, value: str) -> str:
        value = value.strip().replace(" ", "")
        return value

    @field_validator("password")
    @classmethod
    def _validate_password(cls, value: str) -> str:
        value = value.strip()
        _validate_password_policy(value)
        return value

    @model_validator(mode="after")
    def _validate_password_confirmation(self) -> "VerifyOTPRequest":
        if self.password != self.password_confirm:
            raise ValueError("Las contraseñas no coinciden")
        return self
