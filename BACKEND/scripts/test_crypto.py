import sys
import os

# 1. FORZAR RUTA DE PROYECTO (Añadir la raíz al buscador de Python)
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from core.security import encrypt_data, decrypt_data
from dotenv import load_dotenv

# 2. CARGAR ENTORNO
load_dotenv()

def test_bunker():
    dato_sensible = "Paciente con ansiedad severa y fobia a los espacios cerrados"

    print(f"\n--- TEST DE INTEGRIDAD CRIPTOGRÁFICA ---")
    print(f"Original: {dato_sensible}")

    try:
        # 1. Cifrar
        cifrado = encrypt_data(dato_sensible)
        print(f"En la Base de Datos se verá así: {cifrado}")

        # 2. Descifrar
        descifrado = decrypt_data(cifrado)
        print(f"Descifrado para Almudena: {descifrado}")

        if dato_sensible == descifrado:
            print("\n✅ ÉXITO: El búnker es impenetrable y funcional.")
        else:
            print("\n❌ ERROR: Las llaves no coinciden.")

    except Exception as e:
        print(f"\n❌ FALLO DE SISTEMA: {str(e)}")

if __name__ == "__main__":
    test_bunker()
