# Arquitectura Tecnica — Referencia Viva

> Documento operativo. Explica **como** esta construido el sistema hoy, no **que hay que hacer**.
> Para tareas pendientes ver `docs/00_project_control/PENDIENTES_Y_CHECKLIST.md`.
> Para auditorias profundas ver `docs/01_audits/`.

---

## 1. Vision general

Monolito funcional dividido en dos despliegues independientes:

```
┌──────────────────────────────┐    HTTPS     ┌─────────────────────────────────┐
│  Vercel — Next.js 14         │─────────────▶│  Supabase (eu-central-1)        │
│  • App Router + RSC          │              │  • Postgres 15 + RLS            │
│  • Server Actions            │◀─────────────│  • Auth (JWT cookies)           │
│  • Edge Middleware (RBAC)    │              │  • Storage (S3-compatible)      │
│  • Tunnel Sentry /monitoring │              │  • Realtime WebSocket           │
└──────────────┬───────────────┘              │  • Edge Functions (Deno)        │
               │                              │  • pg_cron + pgcrypto + vault   │
               │  Stripe.js (PaymentElement)  └────────────┬────────────────────┘
               ▼                                            │
      ┌──────────────────┐    webhook (HMAC)     ┌──────────▼─────────┐
      │  Stripe          │───────────────────────▶  stripe-webhook EF │
      └──────────────────┘                       └────────────────────┘
```

## 2. Stack tecnologico

### Frontend (`frontend/`)
| Capa              | Tecnologia                         |
|-------------------|-------------------------------------|
| Runtime           | Next.js 14.2.35 (App Router)       |
| Lenguaje          | TypeScript 5 (strict mode)         |
| UI                | React 18 + Tailwind v3             |
| Motion            | Framer Motion + Lenis smooth scroll |
| Estado            | RSC + Server Actions (no Redux)    |
| Forms             | React Hook Form + Zod              |
| Auth              | `@supabase/ssr` (cookies httpOnly)  |
| Pagos             | `@stripe/react-stripe-js`           |
| Realtime          | Supabase Realtime client            |
| Observabilidad    | `@sentry/nextjs`                    |

### Backend activo (`supabase/`)
| Capa              | Tecnologia                         |
|-------------------|-------------------------------------|
| Base de datos     | Postgres 15 (Supabase managed)      |
| Autenticacion     | Supabase Auth (GoTrue)              |
| Autorizacion      | Row Level Security Postgres         |
| API               | PostgREST auto-generada + RPCs      |
| Serverless        | Edge Functions Deno 1.x             |
| Cifrado           | pgcrypto AES-256 + supabase_vault   |
| Scheduling        | pg_cron                             |
| Storage           | S3-compatible buckets               |
| Realtime          | logical replication → WebSocket     |

### Backend stand-by (`backend/`)
FastAPI 0.115 + SQLAlchemy 2.0 + Alembic + Fernet. **No desplegado**. Mantenido como red de seguridad si hiciera falta API REST fuera de Supabase.

### Servicios externos
- **Vercel**: hosting Next.js, Edge Network, Analytics.
- **Stripe**: procesador de pagos (test + live).
- **Resend**: transactional email (3k/mes free).
- **Sentry**: observabilidad (EU Frankfurt, 3 proyectos).
- **GitHub**: repo + CI implicito via Vercel auto-deploy.

## 3. Estructura de carpetas

```
almudena/
├─ frontend/
│  └─ src/
│     ├─ app/
│     │  ├─ (public)/              # landing, enfoque, servicios, contacto
│     │  ├─ admin/                 # panel Almudena (role=admin)
│     │  ├─ portal/                # portal paciente (role=paciente)
│     │  ├─ api/                   # route handlers puntuales
│     │  ├─ monitoring/            # tunnel Sentry
│     │  ├─ sentry-check/          # healthcheck post-deploy
│     │  ├─ robots.ts
│     │  └─ sitemap.ts
│     ├─ components/
│     │  ├─ auth/                  # login, registro, MFA
│     │  ├─ booking/               # slot picker, calendar
│     │  ├─ chat/                  # realtime chat panel
│     │  ├─ portal/                # shells, navegacion, tabs
│     │  ├─ pagos/                 # bonos, drawer Payment Element
│     │  └─ ui/                    # primitivas (Button, Card, Chip, Input)
│     ├─ lib/
│     │  ├─ supabase/              # clients server/browser/middleware + env
│     │  ├─ email/                 # helper fire-and-forget
│     │  └─ utils/                 # cn, dates, formatters
│     ├─ services/                 # Server Actions por dominio
│     │  ├─ auth/
│     │  ├─ citas/
│     │  ├─ mensajes/
│     │  ├─ pagos/
│     │  ├─ pacientes-actions.ts
│     │  └─ rgpd/
│     ├─ contracts/                # tipos TS espejo del backend
│     └─ middleware.ts             # RBAC + sesion refresh
│
├─ backend/                        # FastAPI stand-by
│  ├─ app/                         # routers, models, services
│  ├─ alembic/                     # migraciones historicas
│  ├─ scripts/                     # rebuild_system, security_ops
│  ├─ tests/
│  └─ requirements.txt
│
├─ supabase/
│  ├─ migrations/                  # 0001..0024b SQL ordenadas
│  ├─ scripts/                     # bundle_for_deploy.mjs + smoke_test.mjs
│  ├─ functions/
│  │  ├─ _shared/                  # cors, resend, stripe, sentry, templates
│  │  ├─ send-email/
│  │  ├─ cron-recordatorios-24h/
│  │  ├─ stripe-checkout/
│  │  ├─ stripe-payment-intent/
│  │  ├─ stripe-webhook/
│  │  ├─ invoice-pdf/
│  │  ├─ rgpd-request/
│  │  ├─ cancel-cita/
│  │  ├─ assign-recurso/
│  │  └─ resend-webhook/
│  └─ BOOTSTRAP.md
│
└─ docs/                           # esta documentacion
```

## 4. Flujos criticos

### 4.1 Autenticacion
1. `signUp` → Supabase Auth + trigger `tg_handle_new_user` crea `public.profiles` con `role='paciente'`.
2. Cookie `sb-<ref>-auth-token` httpOnly + SameSite=Lax + Secure.
3. `middleware.ts` refresca access_token al 50% de vida, redirige por rol.

### 4.2 Reserva de cita
1. `obtener_disponibilidad(fecha, servicio_id)` RPC genera slots.
2. `reservarCitaAction` → `reservar_cita` RPC:
   - Si bono activo ⇒ cita `confirmada` + consume sesion.
   - Si no ⇒ cita `bloqueo_temporal`, abre `PaymentElementDrawer`.
3. Stripe Payment Element confirma + `stripe-webhook` procesa `payment_intent.succeeded`.
4. RPC `procesar_pago_stripe` con idempotencia via `stripe_event_id UNIQUE`.
5. Realtime notifica a admin + paciente.

### 4.3 Chat
1. `chat_mi_conversacion()` crea/devuelve conversacion.
2. `ChatPanel` suscribe `postgres_changes` filtrado por `conversation_id`.
3. `chat_enviar_mensaje` SECURITY DEFINER actualiza `unread_*` contadores.
4. Optimistic UI local hasta recibir INSERT Realtime.

### 4.4 Historia clinica cifrada
1. Admin escribe ficha → trigger BEFORE INSERT cifra plaintext → `_ciphertext`.
2. Admin lee ficha → RPC `registro_clinico_descifrar` devuelve plaintext + registra auditoria.
3. Blind index `email_bidx`/`dni_bidx`/`telefono_bidx` permiten busqueda exacta.
4. Master key vive en `supabase_vault.decrypted_secrets['app_encryption_key']`.

### 4.5 Emails transaccionales
1. Server Action llama a `send-email` EF con tipo + payload.
2. EF valida JWT + opt-in + dedupe key.
3. Llama Resend API con retry exponencial (3 intentos).
4. Inserta fila en `emails_log` con estado `sent|failed`.
5. `pg_cron` job horario dispara `cron-recordatorios-24h` con `CRON_SECRET`.

## 5. Contratos y convenciones

### 5.1 Server Actions
- Fichero `frontend/src/services/<dominio>/actions.ts`.
- Siempre marcado `'use server'`.
- Retorna `{ ok: true, data } | { ok: false, error, details? }`.
- Validacion con Zod al recibir input.
- Nunca exporta funciones que no sean server actions desde este fichero.

### 5.2 RPCs Postgres
- Nombre snake_case, SECURITY DEFINER cuando toca datos de otros usuarios.
- Primer paso del cuerpo: validar permiso (`is_admin()` o `current_paciente_id()`).
- Retorna JSON estructurado, nunca filas crudas.

### 5.3 Edge Functions
- Entry: `supabase/functions/<name>/index.ts`.
- Usa helpers de `_shared/` via `import from "../_shared/..."`.
- Al desplegar: `supabase/scripts/bundle_for_deploy.mjs` inlinea `_shared/` en `supabase/functions/.bundled/<name>/index.ts`.
- CORS obligatorio (`_shared/cors.ts` allowlist).
- Error wrapping via `_shared/sentry.ts` (`withSentry`).
- `verify_jwt=true` por defecto excepto webhooks.

### 5.4 Tipado
- **Prohibido `any`** en frontend (ver `.cursor/rules/typescript_strict.mdc`).
- `unknown` + type guards para datos externos.
- Explicit return type en todas las funciones exportadas.
- `interface` para objetos, `type` para uniones.

## 6. Puntos de extension

| Queremos anadir...             | Donde                                                    |
|---------------------------------|----------------------------------------------------------|
| Un nuevo tipo de email          | `_shared/templates.ts` + switch en `send-email/index.ts` |
| Un campo cifrado nuevo          | Migracion SQL: `*_ciphertext` + trigger BEFORE + RPC     |
| Una ruta publica nueva          | `frontend/src/app/(public)/<ruta>/page.tsx`              |
| Una RPC admin-only              | Migracion con `SECURITY DEFINER` + `raise exception if not is_admin()` |
| Un webhook externo              | Nueva Edge Function con `verify_jwt=false` + verificacion firma |

## 7. Dependencias externas criticas

| Servicio       | Si cae                                                 | Plan B                                      |
|----------------|--------------------------------------------------------|---------------------------------------------|
| Supabase       | La app no arranca                                      | Restaurar desde backup PITR (pro)           |
| Vercel         | Web offline                                            | Redeploy en Cloudflare Pages (config ready) |
| Stripe         | Pagos fallan, reservas quedan `bloqueo_temporal`        | Mensaje de error claro + reintento          |
| Resend         | Emails no salen, app sigue operativa                    | Fallback a Supabase SMTP por Auth           |
| Sentry         | Perdida de visibilidad, app sigue operativa             | Logs Supabase como fallback                 |
