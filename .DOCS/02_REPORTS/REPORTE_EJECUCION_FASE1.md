# REPORTE_EJECUCION_FASE1 — cirugía estructural (Nivel Dios)

Fecha: 2026-04-14

## Resumen ejecutivo

Se ejecutó la **FASE 1 completa** (Seguridad → Estructura → Tipado → SEO/A11y base) con cambios directos en repo. Resultado: **cero `any` en frontend**, **Sentry sin PII**, **docker-compose sin credenciales hardcodeadas**, **header público reparado**, **baseURL unificada por env**, **robots/sitemap añadidos**, **focus visible restaurado**.

## Cambios realizados (por bloque)

### 1) Blindaje de seguridad (Crítico)

- **Sentry sin PII**:
  - `BACKEND/main.py`: `send_default_pii` pasó de `true` a **`false`**.

- **`.env` y `.env.example`**
  - Root:
    - `.env.example`: plantilla para credenciales MySQL de Docker.
    - `.env`: valores **solo dev local** (y queda ignorado por `.gitignore`).
  - Backend:
    - `BACKEND/.env.example`: plantilla completa (DB, llaves, Sentry, SMTP, Stripe).
    - `BACKEND/.env`: valores **solo dev local**, incluyendo una `ENCRYPTION_KEY` válida (Fernet).

- **Docker Compose sin passwords**
  - `docker-compose.yml`: se eliminó `MYSQL_*` hardcodeado y se movió a variables via `env_file: .env`.

- **Scripts backend sin credenciales embebidas**
  - `BACKEND/scripts/rebuild_system.py`:
    - Eliminadas contraseñas hardcodeadas (`ADMIN_PASSWORD`, `PACIENTE_PASSWORD`).
    - Seeding exige env vars: `SEED_ADMIN_PASSWORD`, `SEED_PACIENTE_PASSWORD`.
    - Se eliminó el `print` de credenciales/secretos (no se vuelcan passwords ni MFA secret por consola).

### 2) Reparación de estructura

- **PublicHeader reparado** (el import original apuntaba a un path problemático).
  - `FRONTEND/src/components/PublicHeader.tsx`: header público limpio + skip-link.
  - `FRONTEND/src/app/layout.tsx`:
    - Import ajustado a `@/components/PublicHeader`.
    - Se añadió ancla `id="main"` para el skip-link.

- **BaseURL frontend normalizada**
  - Variable canónica: **`NEXT_PUBLIC_BACKEND_API_URL`** (ej: `http://localhost:8000/api/v1`).
  - `FRONTEND/src/services/axios.ts`: `baseURL` ahora deriva de `NEXT_PUBLIC_BACKEND_API_URL`.
  - `FRONTEND/src/app/dashboard/page.tsx`: llamada Axios ajustada para evitar duplicar `/api/v1`.
  - `FRONTEND/src/middleware.ts`, server actions y páginas admin: migradas a `NEXT_PUBLIC_BACKEND_API_URL`.

### 3) Tipado Apex (TS estricta)

- **Exterminio total de `any`** en frontend:
  - `FRONTEND/src/middleware.ts`: type guards estrictos para `access-status` y `refresh`.
  - `FRONTEND/src/services/auth/actions.ts`: parsing tipado (`unknown` → `LoginPayload` / `ErrorPayload`).
  - `FRONTEND/src/services/auth/registerActions.ts`: parsing tipado (`unknown` → `ErrorPayload` / `LoginPayload`).
  - `FRONTEND/src/services/payments/actions.ts`: parsing tipado (`unknown` → `CheckoutPayload` / `ErrorPayload`).
  - `FRONTEND/src/app/admin/layout.tsx`: parsing tipado de `admin/status`.
  - `FRONTEND/src/app/dashboard/page.tsx`: `useState<unknown>` en vez de `any`.

### 4) SEO & Accesibilidad base

- **Robots + Sitemap (Next.js App Router)**
  - `FRONTEND/src/app/robots.ts`: reglas básicas (bloquea `/admin`, `/portal`, `/dashboard`, `/api`).
  - `FRONTEND/src/app/sitemap.ts`: sitemap básico con rutas públicas principales.
  - Base URL: `NEXT_PUBLIC_SITE_URL` o `SITE_URL` (fallback `http://localhost:3000`).

- **Focus visible (WCAG)**
  - `FRONTEND/src/app/globals.css`:
    - Eliminado el “apagado” global de foco para inputs sin alternativa.
    - Añadidos estilos `:focus-visible` para inputs, textarea, botones, links y roles interactivos.

## Variables de entorno (contrato operativo)

### Root (`.env`)
- `MYSQL_ROOT_PASSWORD`
- `MYSQL_DATABASE`
- `MYSQL_USER`
- `MYSQL_PASSWORD`

### Backend (`BACKEND/.env`)
- `ENV`
- `DATABASE_URL`
- `SECRET_KEY`
- `ENCRYPTION_KEY`
- `SENTRY_DSN` (opcional)
- `TRUST_PROXY_HEADERS`, `TRUSTED_PROXY_IPS`
- `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`
- `SEED_PACIENTE_EMAIL`, `SEED_PACIENTE_PASSWORD`

### Frontend (entorno)
- `NEXT_PUBLIC_BACKEND_API_URL` (canónica; incluye `/api/v1`)
- `NEXT_PUBLIC_SITE_URL` o `SITE_URL` (para `robots/sitemap`)

## Verificación mínima recomendada (local)

Frontend:
- `cd FRONTEND && npm run lint`
- `cd FRONTEND && npm run build`

Backend:
- Arrancar con `BACKEND/.env` cargado y verificar `/health`.

Docker DB:
- `docker compose up -d`

## Notas de riesgo / deuda residual

- Hay un archivo existente en `FRONTEND/src/components/public/PublicHeader.tsx` que el entorno de edición no permite leer/modificar con el lector de archivos; por eso se creó el header canónico en `FRONTEND/src/components/PublicHeader.tsx` y se redirigió el import.
- Aún no se añadió **Schema.org JSON-LD** ni metadatos completos por ruta (eso es Fase 2/3).

