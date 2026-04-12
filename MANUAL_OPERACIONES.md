# Manual Maestro de Operaciones: Clínica Almudena

> **Ámbito:** Guía de operaciones para entorno local (Windows) y mantenimiento.
> **Carpetas reales del proyecto:** `BACKEND/` y `FRONTEND/` (en Windows no importa mayúsculas/minúsculas, pero aquí se documenta el nombre real).

## Arranque rápido (recomendado)

**1 comando** para levantar **MySQL (Docker) + Backend + Frontend** (logs centralizados):

```powershell
.\start_all.bat
```

- Requisitos: `BACKEND\venv\` creado + dependencias instaladas; Node.js con `npm` en `PATH`; Docker Desktop encendido.
- Para detener Backend/Frontend: `CTRL+C` en esa consola.
- Para apagar MySQL (Docker): usa el comando del **Nivel 1**.

---

## Nivel 1: Infraestructura y Control Total (Docker)

**Uso:** Gestión del ciclo de vida del servidor y mantenimiento del motor de base de datos.

> Nota: el proyecto usa `docker compose` (Docker Compose v2). Si tu equipo solo tiene `docker-compose`, puedes sustituirlo.

| Acción                      | Comando                                 | Uso específico                              |
| :-------------------------- | :-------------------------------------- | :------------------------------------------ |
| **Encender Búnker (MySQL)** | `docker compose up -d mysql_almudena`   | Inicia la base de datos en segundo plano.   |
| **Apagar Búnker**           | `docker compose down`                   | Cierra los servicios de forma segura.       |
| **Estado de Celdas**        | `docker ps`                             | Verifica contenedores activos y puertos.    |
| **Ver logs DB**             | `docker logs -f --tail 200 almudena_db` | Diagnóstico si la base de datos no arranca. |

---

## 🗄️ Nivel 2: Gestión de Datos (MySQL)

**Contenedor:** `almudena_db` | **Base de Datos:** `almudena_clinic`

🔑 Inventario de credenciales (DEV):

- **Root (mantenimiento)**
  - Usuario: `root`
  - Contraseña: definida en `MYSQL_ROOT_PASSWORD` (ver `docker-compose.yml` / `BACKEND/.env`).
- **API (aplicación)**
  - Usuario: `api_almudena`
  - Contraseña: definida en `MYSQL_PASSWORD` / `DB_PASSWORD` (ver `docker-compose.yml` / `BACKEND/.env`).

> Recomendación: no pegues llaves/contraseñas en este manual. Mantén los secretos en `BACKEND/.env` (y asegúrate de que **no** se versiona en Git) o en un gestor de secretos.

### Acceso a terminal (MySQL dentro del contenedor)

**Entrar como root:**

```powershell
docker exec -it almudena_db mysql -u root -p
```

**Entrar como usuario API:**

```powershell
docker exec -it almudena_db mysql -u api_almudena -p
```

### Blindaje (privilegios mínimos)

Ejecutar **dentro de MySQL** (como `root`):

```sql
REVOKE ALL PRIVILEGES, GRANT OPTION FROM 'api_almudena'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON almudena_clinic.* TO 'api_almudena'@'%';
FLUSH PRIVILEGES;
```

---

## ⚙️ Nivel 3: El Cerebro (Backend FastAPI)

**Puerto local:** `8000` | **Docs (DEV):** `http://localhost:8000/docs` | **Health:** `http://localhost:8000/health`

### Variables de entorno críticas

El backend carga `BACKEND/.env` y **no debe arrancar** si faltan llaves.

- `DATABASE_URL` (ejemplo: `mysql+pymysql://...`)
- `SECRET_KEY` (firma JWT)
- `ENCRYPTION_KEY` (cifrado de campos sensibles)
- Opcional: `ENV=development|production` (en `production` se desactivan `/docs` y `/redoc`)

### Arranque manual (sin `start_all`)

1. Crear el venv (si no existe) + instalar dependencias (una vez):

```powershell
cd .\BACKEND
# Solo si no existe .\venv\
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

2. Levantar API:

```powershell
python -m uvicorn main:app --reload --port 8000
```

---

## 💻 Nivel 4: Interfaz de Usuario (Frontend Next.js)

**Puerto local:** `3000` | **Acceso:** `http://localhost:3000/login`

### Arranque

```powershell
cd .\FRONTEND
npm install
npm run dev
```

### Acceso humano (login)

- Las credenciales **no se documentan aquí en claro**.
- Si necesitas crear usuarios de desarrollo, revisa los scripts de bootstrap del backend (p. ej. `BACKEND/init_db.py` o `BACKEND/rebuild_db.py`) y cambia las contraseñas antes de usar fuera de local.

---

## 🛠️ Nivel 5: Scripts de Mantenimiento y Auditoría

**Uso:** verificación de seguridad, reconstrucción controlada y copias de seguridad.

### Test de criptografía (valida `ENCRYPTION_KEY`)

```powershell
& .\BACKEND\venv\Scripts\python.exe .\BACKEND\scripts\test_crypto.py
```

### Backup real (exportar datos)

**Opción recomendada (PowerShell, UTF-8):**

```powershell
docker exec almudena_db mysqldump -u root -p almudena_clinic | Out-File -Encoding utf8 .\backup_almudena_clinic.sql
```

### Reconstruir entorno Python + auditoría (pip-audit)

Este script **borra y recrea** el `venv` del backend e intenta ejecutar `pip-audit`:

```powershell
.\BACKEND\rebuild_bunker.ps1
```

### Reconstrucción total de BD (PELIGRO)

Esto **borra todas las tablas** y reconstruye migraciones + usuarios de identidad (solo para entorno local):

```powershell
& .\BACKEND\venv\Scripts\python.exe .\BACKEND\rebuild_db.py
```
