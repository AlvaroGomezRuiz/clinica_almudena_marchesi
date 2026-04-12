import os
import sys
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent
load_dotenv(dotenv_path=ROOT / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("DATABASE_URL no está configurado (revisa BACKEND/.env).")
    raise SystemExit(1)

if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

try:
    import pyotp
except Exception:
    print("Falta dependencia: pyotp. Ejecuta: pip install -r requirements.txt")
    raise SystemExit(1)

try:
    import qrcode
    from qrcode.constants import ERROR_CORRECT_M
except Exception:
    print("Falta dependencia: qrcode. Ejecuta: pip install -r requirements.txt")
    raise SystemExit(1)

from db.session import SessionLocal
from models.base import Usuario


def _print_qr_console(data: str) -> None:
    qr = qrcode.QRCode(
        error_correction=ERROR_CORRECT_M,
        box_size=1,
        border=2,
    )
    qr.add_data(data)
    qr.make(fit=True)

    matrix = qr.get_matrix()

    if sys.stdout.isatty():
        reset = "\x1b[0m"
        black_bg = "\x1b[40m"
        white_bg = "\x1b[47m"
        for row in matrix:
            line = "".join((black_bg if cell else white_bg) + "  " for cell in row)
            print(line + reset)
        print(reset)
        return

    black = "██"
    white = "  "
    for row in matrix:
        print("".join(black if cell else white for cell in row))


def main() -> int:
    email = input("Email del usuario a promover a ADMIN: ").strip()
    if not email:
        print("Email vacío.")
        return 1

    db = SessionLocal()
    try:
        usuario = db.query(Usuario).filter(Usuario.username == email).first()
        if not usuario:
            print("Usuario no encontrado.")
            return 1

        usuario.role = "admin"  # type: ignore[assignment]
        usuario.is_admin = True  # type: ignore[assignment]

        secret = pyotp.random_base32()
        usuario.mfa_secret = secret  # type: ignore[assignment]
        db.commit()

        uri = pyotp.totp.TOTP(secret).provisioning_uri(
            name=email, issuer_name="Almudena Clinica"
        )

        print("ADMIN CONFIGURADO:", email)
        print("MFA SECRET:", secret)
        print("PROVISIONING URI:", uri)
        print("\nQR (escanea con Google Authenticator):\n")
        _print_qr_console(uri)
        print("")
        return 0
    except Exception as exc:
        db.rollback()
        print("Error:", str(exc))
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
