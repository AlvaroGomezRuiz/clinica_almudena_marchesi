from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path
from typing import NoReturn, Sequence

import pyotp
from dotenv import load_dotenv
from passlib.context import CryptContext
from sqlalchemy import create_engine, inspect
from sqlalchemy.engine import Engine


BACKEND_ROOT = Path(__file__).resolve().parents[1]
VERSIONS_DIR = BACKEND_ROOT / "alembic" / "versions"

# Asegura imports tipo: from db.session import SessionLocal
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

ADMIN_EMAIL = (os.getenv("SEED_ADMIN_EMAIL") or "almudena@admin.com").strip()
PACIENTE_EMAIL = (os.getenv("SEED_PACIENTE_EMAIL") or "usuario@visualizacion.com").strip()


def _die(message: str) -> NoReturn:
    print(f"[rebuild_system] ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def _run(cmd: Sequence[str], cwd: Path) -> None:
    print(f"[rebuild_system] $ {' '.join(cmd)}")
    subprocess.run(list(cmd), cwd=str(cwd), check=True)


def _purge_alembic_versions() -> None:
    if not VERSIONS_DIR.exists():
        _die(f"No existe el directorio de migraciones: {VERSIONS_DIR}")

    for path in VERSIONS_DIR.glob("*.py"):
        path.unlink()

    pycache = VERSIONS_DIR / "__pycache__"
    if pycache.exists():
        shutil.rmtree(pycache, ignore_errors=True)


def _get_engine() -> Engine:
    database_url = (os.getenv("DATABASE_URL") or "").strip()
    if not database_url:
        _die("DATABASE_URL no está configurado en el entorno (revisa backend/.env).")

    return create_engine(database_url)


def _drop_all_tables(engine: Engine) -> None:
    """Drop all tables del schema público.

    PostgreSQL soporta `DROP TABLE ... CASCADE` para resolver dependencias
    circulares, así evitamos depender de banderas de motor (antes se usaba
    SET FOREIGN_KEY_CHECKS=0 de MySQL, retirado del stack).
    """
    inspector = inspect(engine)
    table_names = inspector.get_table_names()

    with engine.begin() as conn:
        for table in table_names:
            conn.exec_driver_sql(f'DROP TABLE IF EXISTS "{table}" CASCADE')


def _alembic_initial_state() -> None:
    _purge_alembic_versions()

    # Genera una migración base desde cero y la aplica.
    _run(
        [
            sys.executable,
            "-m",
            "alembic",
            "revision",
            "--autogenerate",
            "-m",
            "Initial_State",
        ],
        cwd=BACKEND_ROOT,
    )
    _run([sys.executable, "-m", "alembic", "upgrade", "head"], cwd=BACKEND_ROOT)


def _seed_identity_users() -> None:
    # Import diferido para evitar side-effects antes de cargar .env
    from db.session import SessionLocal
    from models.base import Usuario

    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    admin_secret = pyotp.random_base32()
    admin_password = (os.getenv("SEED_ADMIN_PASSWORD") or "").strip()
    paciente_password = (os.getenv("SEED_PACIENTE_PASSWORD") or "").strip()

    if not admin_password or not paciente_password:
        _die(
            "Faltan variables de entorno para seeding: SEED_ADMIN_PASSWORD y/o SEED_PACIENTE_PASSWORD. "
            "Define credenciales en backend/.env (solo desarrollo) o en el entorno."
        )

    db = SessionLocal()
    try:
        admin = db.query(Usuario).filter(Usuario.username == ADMIN_EMAIL).first()
        if not admin:
            admin = Usuario(
                username=ADMIN_EMAIL, hashed_password=pwd_context.hash(admin_password)
            )
            db.add(admin)

        admin.hashed_password = pwd_context.hash(admin_password)  # type: ignore[assignment]
        admin.role = "admin"  # type: ignore[assignment]
        admin.is_admin = True  # type: ignore[assignment]
        admin.is_active = True  # type: ignore[assignment]
        admin.mfa_secret = admin_secret  # type: ignore[assignment]
        admin.mfa_enabled = True  # type: ignore[assignment]

        paciente = db.query(Usuario).filter(Usuario.username == PACIENTE_EMAIL).first()
        if not paciente:
            paciente = Usuario(
                username=PACIENTE_EMAIL,
                hashed_password=pwd_context.hash(paciente_password),
            )
            db.add(paciente)

        paciente.hashed_password = pwd_context.hash(paciente_password)  # type: ignore[assignment]
        paciente.role = "paciente"  # type: ignore[assignment]
        paciente.is_admin = False  # type: ignore[assignment]
        paciente.is_active = True  # type: ignore[assignment]
        paciente.mfa_secret = None  # type: ignore[assignment]
        paciente.mfa_enabled = False  # type: ignore[assignment]

        db.commit()

        print("[rebuild_system] Seed OK")
        print(f"[rebuild_system] Admin: {ADMIN_EMAIL}")
        print(f"[rebuild_system] Paciente: {PACIENTE_EMAIL}")
    except Exception as exc:
        db.rollback()
        _die(f"Fallo seeding usuarios: {exc}")
    finally:
        db.close()


def main() -> int:
    os.chdir(BACKEND_ROOT)
    load_dotenv(dotenv_path=BACKEND_ROOT / ".env")

    engine = _get_engine()

    print("[rebuild_system] DROP total de tablas (incl. alembic_version)")
    _drop_all_tables(engine)

    print("[rebuild_system] Reconstruyendo Alembic Initial_State")
    _alembic_initial_state()

    print("[rebuild_system] Seeding identidad (admin/paciente)")
    _seed_identity_users()

    print("[rebuild_system] OK: sistema reconstruido y listo")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
