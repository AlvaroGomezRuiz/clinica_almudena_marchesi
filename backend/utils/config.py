import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # Si os.getenv devuelve None, la app lanzará un error al arrancar (Detección temprana)
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    ENCRYPTION_KEY: str = os.getenv("ENCRYPTION_KEY", "")

    # Proxy / Forwarded headers
    # - Solo se usan si el request llega desde una IP en TRUSTED_PROXY_IPS.
    TRUST_PROXY_HEADERS: bool = (
        os.getenv("TRUST_PROXY_HEADERS", "true").lower() == "true"
    )
    TRUSTED_PROXY_IPS: str = os.getenv("TRUSTED_PROXY_IPS", "127.0.0.1,::1")

    def __init__(self):
        # Validación de seguridad: No arrancamos si faltan llaves
        if not self.SECRET_KEY or not self.ENCRYPTION_KEY:
            raise ValueError(
                "ERROR CRÍTICO: Faltan las llaves maestras en las variables de entorno."
            )


settings = Settings()
