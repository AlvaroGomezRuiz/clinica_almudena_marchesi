# Contexto historico del proyecto

> Linea temporal resumida de hitos tecnicos. Para detalle activo ver `PENDIENTES_Y_CHECKLIST.md`.

---

## Hito 1 — Fundacion (Q4 2025)

- Stack inicial: Next.js 14 (App Router) + FastAPI + MySQL + Docker.
- Autenticacion propia basada en JWT emitido por FastAPI.
- Landing publica basica, dashboard admin rudimentario.

## Hito 2 — Blindaje de seguridad

- Sentry instrumentado sin PII (`send_default_pii = false`).
- Secretos movidos a `.env` fuera del repo.
- Docker Compose parametrizado con `env_file`.
- Scripts backend eliminan credenciales hardcodeadas.
- Focus visible WCAG restaurado en frontend.
- `robots.ts` + `sitemap.ts` de Next.js App Router.

## Hito 3 — Cifrado y contratos estrictos (FastAPI)

- Fernet (AES-128) + blind indexes HMAC-SHA256 via SQLAlchemy `TypeDecorator`.
- Pydantic v2 con `extra="forbid"` en todos los schemas.
- Contratos TypeScript espejo en `frontend/src/contracts/`.
- API v1 de citas con proteccion anti-solape + JWT.

## Hito 4 — Migracion a Supabase como backend principal

Decision arquitectonica: se sustituye FastAPI + MySQL + Docker por **Supabase (Postgres + Auth + Storage + Realtime + Edge Functions)**. Motivos:

- Zero servers que mantener.
- RLS nativo Postgres ⇒ autorizacion en la fila, no en la app.
- Realtime WebSocket out-of-the-box.
- Edge Functions Deno para webhooks / crons.
- Plan Free cubre el volumen esperado (<10 GB DB, <500k filas).

FastAPI queda **stand-by** en `backend/` por si el cliente quiere replegarse.

## Hito 5 — Migraciones SQL 0001..0011

- `0001_init.sql`: enums, tablas, triggers, indices.
- `0002_rls.sql`: policies canonicas (`*_self_*`, `*_admin_all`).
- `0003_storage.sql`: buckets `recursos`, `firmas-rgpd`, `avatares`, `chat-adjuntos`, `paciente-adjuntos`.
- `0004_realtime.sql`: publication + replica identity.
- `0005_seed_servicios.sql`: catalogo base.
- `0006_chat.sql`: RPCs `chat_mi_conversacion`, `chat_enviar_mensaje`, `chat_marcar_leidos`.
- `0007_disponibilidad.sql`: `horarios_clinica` + `obtener_disponibilidad` + `reservar_cita`.
- `0008_seed_demo.sql`: usuarios y datos de demo.
- `0009_email.sql`: `emails_log`, `notificaciones_prefs`, `pg_cron` horario.
- `0010_stripe.sql`: `bonos_config`, `stripe_events`, `procesar_pago_stripe`.
- `0011_audit_hashchain.sql`: auditoria tamper-evident SHA-256.

## Hito 6 — Edge Functions + integraciones

- `send-email` + `cron-recordatorios-24h` (Resend).
- `stripe-checkout` + `stripe-webhook` (Stripe hosted).
- `cancel-cita`, `assign-recurso`, `resend-webhook`.
- Bundler propio (`supabase/scripts/bundle_for_deploy.mjs`) para inlinear `_shared/`.
- Smoke tests (`supabase/scripts/smoke_test.mjs`).

## Hito 7 — Migraciones 0012..0021 (sprint producto)

- `0012_auditoria_ficha_clinica`: registro accesos sensibles.
- `0013_chat_rgpd_preferencias_retry`.
- `0014_horario_plantillas_retry`.
- `0015_agenda_bloqueos_metadata`.
- `0016_ficha_mvp_plaintext_retry`.
- `0017_citas_notas_plaintext_mvp`.
- `0018_recursos_publico`.
- `0019_facturas`: numeracion correlativa + serie anual.
- `0020_rgpd_exports`: export JSON firmado.
- `0021_security_lints_fix`: `security_invoker=true` + `search_path` fijo.

## Hito 8 — F5 Cifrado real

- `0022_cifrado_setup`: pgcrypto + supabase_vault + `app_encrypt`/`app_decrypt`/`app_bidx`.
- `0023_cifrado_rpcs_crud`: CRUD cifrado para pacientes + diagnosticos + medicacion + notas.
- `0024_auto_encrypt_triggers`: BEFORE INSERT/UPDATE triggers.
- `0024b_fix_nota_cita_upsert`: fix edge case unique.

## Hito 9 — Payment Element embebido

- `stripe-payment-intent` Edge Function.
- `PaymentElementDrawer` componente frontend con dark/light theme + locale `es`.
- Flujo in-page (sin redirect a Checkout hosted) para citas y bonos.
- `payment_intent.succeeded` anadido al webhook Stripe.

## Hito 10 — Sentry observabilidad

- Proyecto Sentry EU Frankfurt `o4511259694465024`.
- Tres proyectos: `frontend`, `backend` (FastAPI stand-by), `supabase-edge`.
- `beforeSend` redacta PII, DNI, IBAN, tarjetas.
- Tunnel `/monitoring` para evitar adblockers.
- Instrumentacion Edge manual via HTTP envelope.

## Hito 11 — Reorganizacion del repo (abril 2026)

- Renombrado `BACKEND/` → `backend/` y `FRONTEND/` → `frontend/`.
- Consolidacion `.DOCS/` + `docs/` en un unico `docs/` con 6 carpetas numeradas.
- Limpieza scripts obsoletos.
- Reescritura `.gitignore` + `README.md`.
- 6 auditorias tecnicas + informe ejecutivo para cliente (ver `01_audits/` y `02_reports/`).

## Estado actual (punto de partida para siguientes sesiones)

- **Backend real**: Supabase (Postgres 15 + Edge Functions Deno + Auth + Storage + Realtime).
- **Backend stand-by**: FastAPI en `backend/` (no desplegado).
- **Frontend**: Next.js 14 App Router en Vercel.
- **Cifrado**: AES-256 via pgcrypto + blind index HMAC-SHA256 + master key en Vault.
- **Pagos**: Stripe Payment Element embebido + webhook verificado.
- **Emails**: Resend (3k/mes gratis) + dominio pendiente de compra.
- **Observabilidad**: Sentry 3 proyectos.
- **Bloqueos go-live**: datos fiscales de Almudena + compra dominio + rotacion credenciales.
