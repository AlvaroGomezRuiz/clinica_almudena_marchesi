import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

if not SQLALCHEMY_DATABASE_URL:
    raise ValueError("ERROR CRÍTICO: DATABASE_URL no está configurado.")

engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Registro de eventos (blind indexes, etc.)
# Llamar a register_events() después de cargar todos los modelos.
def register_events():
    """Register all SQLAlchemy model event listeners.

    Must be called AFTER all models are imported to avoid circular imports.
    """
    from db.events.paciente_bidx import register_paciente_events
    register_paciente_events()
