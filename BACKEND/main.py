import sys
import os
from pathlib import Path

# --- PROTOCOLO DE RUTAS ---
root_path = Path(__file__).resolve().parent
if str(root_path) not in sys.path:
    sys.path.insert(0, str(root_path))

import logging
import time
try:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    _HAS_SENTRY = True
except ImportError:
    _HAS_SENTRY = False
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from dotenv import load_dotenv

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from utils.security import limiter

# Importación de Rutas
from services.pacientes import router as pacientes_router
from services.servicios import router as servicios_router
from services.citas import router as citas_router
from services.pagos import router as pagos_router
from services.auth import router as auth_router
from services.stripe import router as stripe_router
from services.admin import router as admin_router
from services.facturas import router as facturas_router
from services.recursos import router as recursos_router
from services.mensajes import router as mensajes_router
from services.configuracion import router as configuracion_router
from api.v1.citas import router as citas_v1_router

load_dotenv()

# Register SQLAlchemy model events (blind indexes, etc.)
# Must happen after all model-importing modules above are loaded.
from db.session import register_events
register_events()

MODO_ENTORNO = os.getenv("ENV", "development")

# ==========================================
# 0. CONFIGURACIÓN SENTRY
# ==========================================
SENTRY_DSN = os.getenv("SENTRY_DSN")
if _HAS_SENTRY and SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[FastApiIntegration()],
        send_default_pii=False,
        traces_sample_rate=1.0,
        profiles_sample_rate=1.0,
    )

# 1. CONFIGURACIÓN DE AUDITORÍA
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# 2. INICIALIZACIÓN DEL ESCUDO (Invisible en producción)
app = FastAPI(
    title="API Clínica Almudena",
    version="1.0.0",
    docs_url=None if MODO_ENTORNO == "production" else "/docs",
    redoc_url=None if MODO_ENTORNO == "production" else "/redoc",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore

# 3. MIDDLEWARES (Capas de Defensa)


# --- Cabeceras de Seguridad de Nivel Bancario ---
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)

    # ── Cabeceras universales ──
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-Permitted-Cross-Domain-Policies"] = "none"
    response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
    response.headers["Cross-Origin-Resource-Policy"] = "same-origin"

    # HSTS: 2 años, incluye subdominios, preload-ready
    response.headers["Strict-Transport-Security"] = (
        "max-age=63072000; includeSubDomains; preload"
    )

    # Permissions-Policy: bloquear APIs sensibles del navegador
    response.headers["Permissions-Policy"] = (
        "camera=(), microphone=(), geolocation=(), payment=(), "
        "usb=(), magnetometer=(), gyroscope=(), accelerometer=()"
    )

    path = request.url.path
    is_docs_route = (
        path.startswith("/docs") or path.startswith("/redoc") or path == "/openapi.json"
    )

    # CSP: Swagger UI necesita inline scripts; API endpoints son estrictos.
    if is_docs_route:
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
            "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
            "font-src 'self' data: https://cdn.jsdelivr.net; "
            "img-src 'self' data: https://cdn.jsdelivr.net https://fastapi.tiangolo.com;"
        )
    else:
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline'; "
            "frame-ancestors 'none'; "
            "object-src 'none'; "
            "base-uri 'self'; "
            "form-action 'self'; "
            "upgrade-insecure-requests"
        )
    return response


class LimitUploadSize(BaseHTTPMiddleware):
    def __init__(self, app, max_size: int):
        super().__init__(app)
        self.max_size = max_size

    async def dispatch(self, request: Request, call_next):
        if request.method in ["POST", "PUT", "PATCH"]:
            content_length = request.headers.get("content-length")
            if content_length and int(content_length) > self.max_size:
                return JSONResponse(
                    status_code=413, content={"detail": "Archivo demasiado grande."}
                )
        return await call_next(request)


app.add_middleware(LimitUploadSize, max_size=20971520)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = (time.time() - start_time) * 1000
    logger.info(
        f"ACCESO | {request.method} {request.url.path} | STATUS: {response.status_code} | {process_time:.2f}ms"
    )
    return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. INYECCIÓN DE RUTAS
app.include_router(auth_router, prefix="/api/v1/auth", tags=["Autenticación"])
app.include_router(admin_router, prefix="/api/v1/admin", tags=["Admin"])
app.include_router(configuracion_router, prefix="/api/v1/admin", tags=["Configuración"])
app.include_router(pacientes_router, prefix="/api/v1/pacientes", tags=["Pacientes"])
app.include_router(servicios_router, prefix="/api/v1/servicios", tags=["Servicios"])
app.include_router(citas_router, prefix="/api/v1/citas", tags=["Citas"])
app.include_router(pagos_router, prefix="/api/v1/pagos", tags=["Pagos"])
app.include_router(facturas_router, prefix="/api/v1/facturas", tags=["Facturas"])
app.include_router(stripe_router, prefix="/api/v1/stripe", tags=["Stripe"])
app.include_router(recursos_router, prefix="/api/v1/recursos", tags=["Recursos"])
app.include_router(mensajes_router, prefix="/api/v1/mensajes", tags=["Mensajes"])
app.include_router(citas_v1_router, prefix="/api/v1/citas", tags=["Citas"])


@app.get("/health")
def health_check():
    return {"status": "Operativo", "defensas": "Cerradas y activas"}
