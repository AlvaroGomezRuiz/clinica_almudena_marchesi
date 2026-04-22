# Auditoria del Backend

> **Alcance**: Supabase Edge Functions (Deno) + FastAPI opcional (`backend/`).
> **Fecha**: 2026-04-21.

---

## 1. Resumen ejecutivo

El backend productivo vive **integramente en Supabase** (Postgres + Edge Functions + Realtime). FastAPI existe en `backend/` como alternativa completa pero **no esta desplegada**; queda conservada para hipotetica migracion a infra propia.

| Componente              | LOC aprox. | Estado     | Cobertura tests |
|-------------------------|------------|------------|-----------------|
| Edge Functions (10)     | ~2.800     | produccion | smoke test manual |
| FastAPI (13 routers)    | ~25.000    | stand-by   | 0               |
| Migraciones SQL (24)    | ~3.500     | produccion | n/a             |
| RPCs (~40)              | -          | produccion | roundtrip manual |

**Veredicto**: codigo productivo (Edge + SQL) solido y defensivo. FastAPI usable pero requiere limpieza antes de despliegue eventual.

---

## 2. Edge Functions (Supabase)

### 2.1 Inventario

| Funcion                     | Version | Trigger                         | Auth          | Secretos usados                                |
|-----------------------------|---------|----------------------------------|---------------|-------------------------------------------------|
| `stripe-checkout`           | v19     | Server Action                    | JWT obligatorio | `STRIPE_SECRET_KEY`, `FRONTEND_URL`            |
| `stripe-payment-intent`     | v1      | Server Action (Payment Element)  | JWT obligatorio | `STRIPE_SECRET_KEY`                            |
| `stripe-webhook`            | v19     | HTTP Stripe                      | HMAC firma    | `STRIPE_WEBHOOK_SECRET`, `SERVICE_ROLE_KEY`    |
| `send-email`                | v-      | Server Action + otras EF         | JWT obligatorio | `RESEND_API_KEY`, `RESEND_FROM_EMAIL`          |
| `cron-recordatorios-24h`    | v-      | `pg_cron` cada hora              | `CRON_SECRET` | `RESEND_API_KEY`, `SERVICE_ROLE_KEY`           |
| `assign-recurso`            | v-      | Server Action admin              | JWT obligatorio | `SERVICE_ROLE_KEY`                             |
| `cancel-cita`               | v-      | Server Action                    | JWT obligatorio | `STRIPE_SECRET_KEY`                            |
| `resend-webhook`            | v-      | HTTP Resend                      | HMAC firma    | `RESEND_WEBHOOK_SECRET`                        |
| `invoice-pdf`               | v1      | Server Action                    | JWT obligatorio | `FACTURA_EMISOR_*`, `SERVICE_ROLE_KEY`         |
| `rgpd-request`              | v1      | Server Action paciente/admin     | JWT obligatorio | `SERVICE_ROLE_KEY`, `RESEND_API_KEY`           |

### 2.2 Patrones correctos observados

- **`wrapEdgeHandler` universal**: toda funcion envuelve su handler para capturar excepciones en Sentry antes de rethrow, preservando stack.
- **CORS allowlist** (`_shared/cors.ts`): localhost, preview Vercel, `amclinicapsicologia.es` (+ www), `FRONTEND_URL`; no `*`.
- **Rechazo temprano** (401/405): todas las EF comprueban metodo + auth antes de parsear body.
- **Firma HMAC** en webhooks: `stripe-webhook` y `resend-webhook` verifican con `crypto.subtle.verify`. Si falla ⇒ 400.
- **Idempotencia**: `stripe-webhook` hace UPSERT en `stripe_events` por `id` y RPC detecta duplicado.
- **No PII en logs**: `captureEdgeError` etiqueta con `entity_id` y `event_type`, nunca con payload completo.

### 2.3 Problemas menores detectados

| Severidad | Ubicacion                                      | Problema                                                  | Fix sugerido                                                 |
|-----------|------------------------------------------------|-----------------------------------------------------------|--------------------------------------------------------------|
| Baja      | `supabase/functions/.bundled/`                  | Carpeta auto-generada con versiones inline                | `supabase/functions/.bundled/` debe ir en `.gitignore` (hecho) |
| Baja      | `stripe-checkout` no se usa desde frontend     | Codigo vivo pero no invocado (Payment Element lo sustituye) | Mantener como fallback documentado o eliminar en Q2         |
| Media     | No hay healthcheck endpoint global             | Solo `/health` expone FastAPI (no desplegado)            | Anadir EF `health` que verifique `app_encryption_ready()` + vault |
| Baja      | Timeout implicito en `fetch` a Resend/Stripe   | `AbortController` no usado                                | Anadir timeout 10s defensivo en `_shared/resend.ts` y `_shared/stripe.ts` |
| Baja      | Retry exponencial solo en Resend (3 intentos)  | Stripe no tiene retry (confiamos en su SDK REST)          | Aceptable; Stripe reintenta webhooks desde su lado           |

### 2.4 Secretos requeridos (Supabase Edge Functions → Secrets)

Ver `docs/00_project_control/PENDIENTES_Y_CHECKLIST.md` seccion 2. Todos presentes excepto:
- `FACTURA_EMISOR_NIF` / `FACTURA_EMISOR_COLEGIADA` — valores acordados; configurar en Secrets (ver `PENDIENTES_Y_CHECKLIST.md`).
- `FACTURA_EMISOR_EMAIL` — sugerido `contacto@amclinicapsicologia.es` al activar dominio.
- `FACTURA_EMISOR_REGCESS` — pendiente confirmación colegio.

---

## 3. Backend FastAPI (no desplegado)

### 3.1 Estructura

```
backend/
├─ main.py                  # App FastAPI con middlewares de seguridad
├─ requirements.txt         # 20 deps, cryptography 46, sentry-sdk 2.8
├─ alembic/                 # 7 migraciones hist. (NO activas — se usa supabase/migrations/)
├─ api/v1/citas.py          # router legacy
├─ services/                # 13 services (auth, pacientes, citas, pagos, stripe, facturas, etc.)
├─ schemas/                 # Pydantic v2 (admin, agenda, chat, citas, otp, paciente, pago, servicio, stripe)
├─ models/base.py           # SQLAlchemy 2.0 models
├─ db/                      # session, type decorators cifrado, eventos bidx
├─ utils/                   # security (slowapi, hash), audit, config
├─ scripts/                 # rebuild_system.py, reset_db.py, security_ops.py, test_crypto.py
└─ dockerfile               # imagen uvicorn
```

### 3.2 Fortalezas

- **Tipado estricto** con Pydantic v2 (`extra='forbid'`).
- **TypeDecorator de cifrado** (`db/types/encrypted.py`): Fernet transparente via SQLAlchemy.
- **Blind index event listener** (`db/events/paciente_bidx.py`): mantiene columnas `_bidx` sin codigo duplicado.
- **Middleware de seguridad bancario** (`main.py`): HSTS 2 anos, CSP estricto, Permissions-Policy, X-Frame-Options DENY, rate limiting `slowapi`, limite upload 20MB.
- **Sentry integrado** con `send_default_pii=False`.

### 3.3 Deuda tecnica si se decide desplegar

| Severidad | Ubicacion                                 | Problema                                                    |
|-----------|-------------------------------------------|-------------------------------------------------------------|
| Alta      | `backend/alembic/versions/*.py`           | Desincronizado con `supabase/migrations/`: si algun dia se despliega FastAPI, regenerar desde cero a partir del schema Supabase |
| Alta      | `backend/scripts/rebuild_system.py`       | Drop total + seed: peligroso en produccion, restringir con guard `ENV=dev` |
| Media     | `backend/setup_admin.py`                  | Promueve usuario a admin sin autenticar — solo dev          |
| Resuelta  | ~~Dual stack DB (MySQL vs Postgres)~~     | ~~Decidir cual es fuente de verdad~~ → **MySQL retirado el 22-abr-2026** (ver CONTEXTO_HISTORICO Hito 12). FastAPI ya usa psycopg2/Postgres. |
| Baja      | CORS `allow_origins=["http://localhost:3000"]` | Endurecer con variable `CORS_ALLOWED_ORIGINS`               |

### 3.4 Recomendacion sobre FastAPI

**Opcion A (recomendada)**: marcar como *alternativa arquitectonica* y no desplegar. Conservar el codigo como plan de contingencia ante cambio de vendor. Documentar en README.

**Opcion B**: desplegar en Fly.io / Railway / Render como API publica bajo `api.<dominio>` y **migrar** las Edge Functions hacia endpoints FastAPI. Requiere:
1. ~~Migrar de MySQL → PostgreSQL~~ → **hecho 22-abr-2026** (`psycopg2-binary` en `requirements.txt`, `DATABASE_URL=postgresql+psycopg2://...`).
2. Regenerar migraciones Alembic desde el schema actual de Supabase (0001..0027).
3. Refactorizar `backend/scripts/` para que no hagan drop masivo.
4. Anadir `pytest` + coverage >= 70%.
5. CI/CD con secrets propios.

---

## 4. Migraciones SQL (24)

### 4.1 Timeline

```
0001_init                        schema base + helpers is_admin / current_paciente_id
0002_rls                         RLS por tabla (defense in depth)
0003_storage                     buckets + policies
0004_realtime                    publication + replica identity
0005_seed_servicios              catalogo inicial
0006_chat                        conversaciones + mensajes RLS + RPCs
0007_disponibilidad              horarios_clinica + RPC obtener_disponibilidad
0008_seed_demo                   users demo (RETIRAR antes de produccion)
0009_email                       emails_log + notificaciones_prefs + pg_cron hourly
0010_stripe                      bonos_config + stripe_events + procesar_pago_stripe
0011_cancelacion_asignacion      RPCs cancelar_cita + asignar_recurso
0012_auditoria_ficha_clinica     tabla auditoria + ficha clinica
0013_chat_rgpd_preferencias      opt-in notifs + bucket adjuntos chat
0014_horario_plantillas          plantillas horario + agenda_semana
0015_agenda_bloqueos_metadata    metadata bloqueos (color, nota)
0016_ficha_mvp_plaintext         diagnosticos + medicacion MVP
0017_citas_notas_plaintext_mvp   notas por cita
0018_recursos_publico            recursos publicos por servicio
0019_facturas                    numerador + tabla facturas
0020_rgpd_exports                export RGPD firmado
0021_security_lints_fix          security_invoker=true + search_path fijo
0022_cifrado_setup               pgcrypto + vault + app_encrypt/decrypt/bidx
0023_cifrado_rpcs_crud           RPCs CRUD cifrado (admin only, SECURITY DEFINER)
0024_auto_encrypt_triggers       triggers BEFORE INSERT/UPDATE → plaintext → ciphertext
0024b_fix_nota_cita_upsert       fix ON CONFLICT en nota_cita_guardar_cifrada
```

### 4.2 Calidad

- **Idempotencia**: todas las migraciones usan `create ... if not exists` / `create or replace`.
- **Comentarios**: la mayoria tienen preambulo explicando estrategia y pre-requisitos.
- **Transaccional**: `begin/commit` en migraciones criticas (cifrado).
- **Revocaciones**: funciones sensibles (`_app_encryption_key`, `app_encrypt`) tienen `revoke all from public, anon, authenticated`.

### 4.3 Pendiente

- `0025_cifrado_drop_plaintext` (planeada): drop columnas plaintext tras QA cliente.
- `0026_retirar_seed_demo`: borrar `usuario@visualizacion.com` y rows demo antes de go-live.

---

## 5. Seguridad del codigo backend

- **Sin secretos hardcoded** en el codigo productivo (Edge Functions).
- **`backend/scripts/rebuild_system.py`**: lee `SEED_ADMIN_PASSWORD` y `SEED_PACIENTE_PASSWORD` de env; falla si faltan → correcto.
- **`backend/setup_admin.py`**: interactivo (`input()`), solo dev.
- **`backend/utils/security.py`** (10KB): rate limiter + bcrypt + signing — revisado, ok.
- **`backend/db/types/encrypted.py`**: usa Fernet (AES-128-CBC + HMAC-SHA256); valida key al arranque (`cryptography.fernet.Fernet(key)`).

## 6. Conclusiones y acciones

### Acciones inmediatas (pre-produccion)
1. Rotar `STRIPE_SECRET_KEY` a `sk_live_*` tras verificar empresa en Stripe.
2. Rotar `STRIPE_WEBHOOK_SECRET` al crear endpoint de live.
3. Aplicar `0026_retirar_seed_demo.sql` antes de abrir registro publico.
4. Anadir funcion Edge `health` con verificacion `app_encryption_ready()`.

### Acciones Q2 (no bloqueante)
5. Decidir destino de `backend/`: documentar como contingencia o desplegar.
6. Anadir E2E con Playwright golpeando EF desplegadas (smoke extendido).
7. Monitor Resend rate limit (alert >80% cuota).
