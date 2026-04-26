# Auditoría del backend (Supabase: Postgres, RPC, Edge)

> **Fecha:** 2026-04-26 · **Alcance:** `supabase/migrations/`, `supabase/functions/`, `supabase/config.toml`, interacción con `frontend/src/services/`.  
> **Nota:** no existe un servidor de aplicación Python/FastAPI en el repositorio; el “backend” de producto es **Postgres + Edge (Deno 2)**.

---

## 1. Resumen ejecutivo

| Componente            | Ubicación | Líneas / volumen (orden de magnitud) |
|-----------------------|-----------|--------------------------------------|
| Migraciones SQL       | `supabase/migrations/*.sql` | 50+ ficheros (incl. reconciliación remota si aplica) |
| Edge Functions        | `supabase/functions/<nombre>/index.ts` | 11 funciones con carpeta propia (ver §3) |
| Código compartido EF  | `supabase/functions/_shared/*` | Plantillas Resend, Stripe, CORS, Sentry, PDF, marca |
| RPC y tipos expuestos | `frontend/src/lib/supabase/types.ts` → `Database['public']['Functions']` | Conjunto documentado de firmas; el remoto puede tener sinónimos adicionales |

**Veredicto:** el backend se apoya en **defensa en profundidad** (RLS, RPC con privilegio controlado, HMAC en webhooks, cifrado en capa de aplicación para chat y ficha). Los cambios de esquema deben ir **solo** por migraciones versionadas.

---

## 2. Postgres como núcleo

| Responsabilidad | Cómo se materializa |
|-----------------|----------------------|
| Modelo de datos | Tablas en `public` (y extensiones) definidas o alteradas en migraciones `0001+` |
| Autorización    | RLS: políticas `*_self_*` / `*_admin_*`, helpers `is_admin()`, `current_paciente_id()` |
| Negocio         | `reservar_cita`, `obtener_disponibilidad`, chat RPCs, cifrado CRUD, `bono_asignar_manual`, facturación |
| Cifrado         | `app_encrypt` / `app_decrypt`, vault, columnas `*_ciphertext`, triggers `0024` |
| Auditoría       | Cadenas hash, `admin_lookups`, trazas de accesos a campos |
| Tareas programadas | `pg_cron` + `cron-recordatorios-24h` (vía `CRON_SECRET` en la función) |

**Disponibilidad de huecos (regla 0056+):** la lógica de *solo citas confirmadas* para bloquear slots se documenta en migraciones `0056_disponibilidad_solo_confirmadas.sql` (ajustar lectura a negocio actual en staging antes de proclamar comportamiento en prod).

**Detalle de tablas y lista de migraciones por fichero:** `docs/01_auditorias/base-de-datos.md`.

---

## 3. Edge Functions (inventario al repo)

Cada fila: **nombre de carpeta** bajo `supabase/functions/`, cometido, autenticación típica.

| Carpeta                 | Cometido principal | Auth / notas |
|------------------------|--------------------|-------------|
| `send-email`           | Router de plantillas (Resend), opt-in, deduplicación | Invocación con JWT de usuario o interna según ruta |
| `cron-recordatorios-24h` | Recordatorios **~48h** y **~24h** (migr. `0060` + `0061`); `email_type` `reminder_48h` / `reminder_24h` | `CRON_SECRET` o equivalente en cabecera según despliegue |
| `stripe-checkout`     |/checkout hosted como respaldo al flujo PI | Requiere usuario con sesión válida |
| `stripe-payment-intent` | Crea Payment Element (cita/bono) | JWT usuario |
| `stripe-webhook`       | `checkout.session.*`, `payment_intent.*`, `verify_jwt = false` en `config.toml` | HMAC Stripe + idempotencia en `stripe_events` |
| `invoice-pdf`          | PDF A4 IVA exento, numeración correlativa | Admin o paciente según pago |
| `rgpd-request`         | ACK, `execute` export, plazos legales | Diferencia rol admin / paciente |
| `cancel-cita`         | Cancelación, reembolsos, emails | Usuario o admin según reglas 0046+ |
| `assign-recurso`      | Asignación a paciente + notificación | Admin |
| `resend-webhook`       | Bounces, complaints, `verify_jwt = false` | HMAC Svix, actualización de prefs |
| `health`              | `SELECT 1` + `app_encryption_ready` | Público para monitoreo, sin PII (comentario en el código) |

**Bundling de despliegue:** `supabase/scripts/bundle_for_deploy.mjs` (si existe) prepara inlining de `_shared/`.

**Patrones:** `buildCorsHeaders` / `handleOptions`, captura a Sentry en `sentry.ts`, sin registrar cuerpos completos con datos clínicos.

---

## 4. Configuración de Supabase CLI (extracto)

| Clave en `config.toml` | Efecto |
|------------------------|--------|
| `major_version = 17`  | Alineada con el proyecto remoto |
| `[functions.stripe-webhook] verify_jwt = false` | Necesario: Stripe no envía JWT de Supabase |
| `[functions.resend-webhook] verify_jwt = false`  | Idem para Svix/Resend |
| Comentario en TOML (L367+) | Explica 401 en webhooks si se olvida esto al migrar de entorno |

---

## 5. Interacción front → backend

| Capa en `frontend` | Qué hace |
|--------------------|----------|
| `src/services/**/actions.ts` | Server Actions: Zod/validación en limite, llamada a `createServerClient` y `rpc` |
| `src/app/api/**/route.ts`  | API routes con rate limit, `multipart` para adjuntos, magic bytes |
| `lib/supabase/server.ts`  | Cliente con cookies de sesión |

**No usar `service_role` en el bundle del cliente** — solo en Edge o scripts server-side aislados.

---

## 6. Riesgos o deuda a vigilar (no suprimidos, solo rastreables)

| Tema | Acción de control |
|------|-------------------|
| Reconciliación de migraciones 0001… vs 202604…* | Seguir el procedimiento de `docs/00_proyecto/cronologia.md` (Hito 17) |
| Tests automáticos SQL | `pgTAP` sugerido en checklist operativo, no en repo obligatorio |
| Versiones de `supabase-js` en Deno (import map / esm.sh) | Fijar versiones en diffs de seguridad de dependencia |

---

*Fin del informe. Para mapa de sistema más visual ver `arquitectura.md` (este directorio) y `docs/03_ingenieria/arquitectura-visual.md`.*
