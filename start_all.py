from __future__ import annotations

import os
import shutil
import socket
import subprocess
import sys
import threading
import time
from pathlib import Path
from typing import Optional


ROOT = Path(__file__).resolve().parent
BACKEND_DIR = ROOT / "BACKEND"
FRONTEND_DIR = ROOT / "FRONTEND"
BACKEND_PYTHON = BACKEND_DIR / "venv" / "Scripts" / "python.exe"

MYSQL_SERVICE = "mysql_almudena"


def _print(pref: str, line: str) -> None:
    sys.stdout.write(f"[{pref}] {line}")
    sys.stdout.flush()


def _stream_output(prefix: str, proc: subprocess.Popen[str]) -> None:
    assert proc.stdout is not None
    for line in iter(proc.stdout.readline, ""):
        _print(prefix, line)


def _wait_port(host: str, port: int, timeout_s: int = 60) -> bool:
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.settimeout(1)
            try:
                sock.connect((host, port))
                return True
            except OSError:
                time.sleep(1)
    return False


def _run_docker_compose_up() -> None:
    cmd = ["docker", "compose", "up", "-d", MYSQL_SERVICE]
    _print("DOCKER", f"$ {' '.join(cmd)}\n")
    subprocess.run(cmd, cwd=str(ROOT), check=True)


def _detect_mysql_bind() -> tuple[str, int]:
    compose_path = ROOT / "docker-compose.yml"
    if not compose_path.exists():
        return ("127.0.0.1", 3306)

    text = compose_path.read_text(encoding="utf-8", errors="ignore")

    # Intenta extraer un mapeo tipo: "127.0.0.1:3306:3306" o "3306:3306"
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if "3306:3306" not in line:
            continue
        if '"' not in line and "'" not in line:
            continue

        cleaned = line.lstrip("- ").strip().strip('"').strip("'")
        parts = cleaned.split(":")
        if len(parts) == 3:
            host, host_port, _container_port = parts
            try:
                return (host, int(host_port))
            except ValueError:
                continue
        if len(parts) == 2:
            host_port, _container_port = parts
            try:
                return ("127.0.0.1", int(host_port))
            except ValueError:
                continue

    return ("127.0.0.1", 3306)


def _start_process(
    prefix: str,
    cmd: list[str] | str,
    cwd: Path,
    extra_env: Optional[dict[str, str]] = None,
    *,
    shell: bool = False,
) -> subprocess.Popen[str]:
    env = os.environ.copy()
    if extra_env:
        env.update(extra_env)

    cmd_display = cmd if isinstance(cmd, str) else " ".join(cmd)
    _print(prefix, f"$ {cmd_display}\n")

    return subprocess.Popen(
        cmd,
        cwd=str(cwd),
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        shell=shell,
    )


def _terminate_process_tree(proc: subprocess.Popen[str]) -> None:
    if proc.poll() is not None:
        return

    if os.name == "nt":
        try:
            subprocess.run(
                ["taskkill", "/PID", str(proc.pid), "/T", "/F"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=False,
            )
        except Exception:
            try:
                proc.kill()
            except Exception:
                pass
        return

    try:
        proc.terminate()
    except Exception:
        return

    try:
        proc.wait(timeout=2)
    except Exception:
        pass

    if proc.poll() is None:
        try:
            proc.kill()
        except Exception:
            pass


def main() -> int:
    if not BACKEND_DIR.exists():
        _print("START", "ERROR: falta carpeta BACKEND/\n")
        return 1
    if not FRONTEND_DIR.exists():
        _print("START", "ERROR: falta carpeta FRONTEND/\n")
        return 1
    if not BACKEND_PYTHON.exists():
        _print(
            "START",
            "ERROR: no existe BACKEND/venv. Crea el venv e instala requirements.txt\n",
        )
        return 1

    # 1) Docker (MySQL)
    try:
        _run_docker_compose_up()
    except Exception as exc:
        _print("DOCKER", f"ERROR levantando Docker Compose: {exc}\n")
        return 1

    host, port = _detect_mysql_bind()
    _print("DOCKER", f"Esperando MySQL en {host}:{port}...\n")
    if not _wait_port(host, port, timeout_s=90):
        _print("DOCKER", "ERROR: MySQL no respondió a tiempo.\n")
        return 1

    _print("DOCKER", "MySQL OK\n")

    # 2) Backend + 3) Frontend (logs centralizados)
    backend = _start_process(
        "BACKEND",
        [
            str(BACKEND_PYTHON),
            "-m",
            "uvicorn",
            "main:app",
            "--reload",
        ],
        cwd=BACKEND_DIR,
        extra_env={"PYTHONUNBUFFERED": "1"},
    )

    # En Windows, `npm` suele ser un .cmd y CreateProcess no lo ejecuta directo.
    # Usamos shell=True para delegar la resolución/ejecución a cmd.exe.
    if os.name == "nt":
        if shutil.which("npm") is None:
            _print(
                "FRONTEND",
                "ERROR: `npm` no está en PATH. Instala Node.js y reinicia la terminal.\n",
            )
            _terminate_process_tree(backend)
            return 1

        frontend_cmd: list[str] | str = "npm run dev"
        frontend_shell = True
    else:
        frontend_cmd = ["npm", "run", "dev"]
        frontend_shell = False

    frontend = _start_process(
        "FRONTEND",
        frontend_cmd,
        cwd=FRONTEND_DIR,
        shell=frontend_shell,
    )

    threads = [
        threading.Thread(target=_stream_output, args=("BACKEND", backend), daemon=True),
        threading.Thread(
            target=_stream_output, args=("FRONTEND", frontend), daemon=True
        ),
    ]
    for t in threads:
        t.start()

    try:
        while True:
            be = backend.poll()
            fe = frontend.poll()
            if be is not None:
                _print("BACKEND", f"Proceso terminado con código {be}\n")
                break
            if fe is not None:
                _print("FRONTEND", f"Proceso terminado con código {fe}\n")
                break
            time.sleep(0.5)
    except KeyboardInterrupt:
        _print("START", "CTRL+C recibido, cerrando procesos...\n")
    finally:
        for proc in (frontend, backend):
            _terminate_process_tree(proc)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
