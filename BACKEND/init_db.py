import sys
import os
from pathlib import Path

root_path = Path(__file__).resolve().parent
if str(root_path) not in sys.path:
    sys.path.insert(0, str(root_path))

from db.session import engine, SessionLocal
from models.base import Base, Usuario
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def init_database():
    print("[1/2] Forjando nueva estructura de tablas...")
    Base.metadata.create_all(bind=engine)
    print("Tablas creadas con éxito.")

    print("[2/2] Verificando usuario maestro 'almudena'...")
    db = SessionLocal()
    usuario = db.query(Usuario).filter(Usuario.username == "almudena").first()

    if not usuario:
        hashed_pw = pwd_context.hash("almudena")
        new_usuario = Usuario(
            username="almudena",
            hashed_password=hashed_pw,
            is_admin=True,
            is_active=True,
            mfa_enabled=False
        )
        db.add(new_usuario)
        db.commit()
        print("Usuario 'almudena' inyectado. Contraseña: almudena")
    else:
        print("El usuario 'almudena' ya existe en el búnker.")

    db.close()
    print("IGNICIÓN COMPLETADA.")

if __name__ == "__main__":
    init_database()
