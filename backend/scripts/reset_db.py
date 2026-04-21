import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, MetaData

# Cargar variables de entorno
load_dotenv()

# Conectar a la base de datos
engine = create_engine(os.getenv('DATABASE_URL')) #type: ignore
meta = MetaData()

# Leer todas las tablas existentes y borrarlas (incluida alembic_version)
meta.reflect(bind=engine)
meta.drop_all(bind=engine)

print("💥 BASE DE DATOS PURGADA COMPLETAMENTE. TERRENO LIMPIO.")
