import sys
import os
from pathlib import Path

# --- PROTOCOLO DE RUTAS ---
root_path = Path(__file__).resolve().parent
if str(root_path) not in sys.path:
    sys.path.insert(0, str(root_path))

import logging
import time
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from dotenv import load_dotenv

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from core.security import limiter

# Importación de Rutas
from api.pacientes import router as pacientes_router
from api.servicios import router as servicios_router
from api.citas import router as citas_router
from api.pagos import router as pagos_router
from api.auth import router as auth_router

load_dotenv()
MODO_ENTORNO = os.getenv("ENV", "development")

# ==========================================
# 0. CONFIGURACIÓN SENTRY
# ==========================================
SENTRY_DSN = os.getenv("SENTRY_DSN")
if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[FastApiIntegration()],
        send_default_pii=True,
        traces_sample_rate=1.0,
        profiles_sample_rate=1.0,
    )

# 1. CONFIGURACIÓN DE AUDITORÍA
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger(__name__)

# 2. INICIALIZACIÓN DEL ESCUDO (Invisible en producción)
app = FastAPI(
    title="API Clínica Almudena",
    version="1.0.0",
    docs_url=None if MODO_ENTORNO == "production" else "/docs",
    redoc_url=None if MODO_ENTORNO == "production" else "/redoc"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler) #type: ignore

# 3. MIDDLEWARES (Capas de Defensa)

# --- NUEVO: Cabeceras de Seguridad Paranoicas ---
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Frame-Options"] = "DENY" # Anti-Clickjacking
    response.headers["X-Content-Type-Options"] = "nosniff" # Anti-MIME-Sniffing
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    # CSP: Solo permitimos scripts de nuestro origen
    response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';"
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
                    status_code=413,
                    content={"detail": "Archivo demasiado grande."}
                )
        return await call_next(request)

app.add_middleware(LimitUploadSize, max_size=20971520)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = (time.time() - start_time) * 1000
    logger.info(f"ACCESO | {request.method} {request.url.path} | STATUS: {response.status_code} | {process_time:.2f}ms")
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. INYECCIÓN DE RUTAS
app.include_router(auth_router, prefix="/api/v1/auth", tags=["Autenticación"])
app.include_router(pacientes_router, prefix="/api/v1/pacientes", tags=["Pacientes"])
app.include_router(servicios_router, prefix="/api/v1/servicios", tags=["Servicios"])
app.include_router(citas_router, prefix="/api/v1/citas", tags=["Citas"])
app.include_router(pagos_router, prefix="/api/v1/pagos", tags=["Pagos"])

@app.get("/health")
def health_check():
    return {"status": "Operativo", "defensas": "Cerradas y activas"}
