# Clínica Almudena Marchesi Fernández — Plataforma digital

Sitio público + portales **admin** y **paciente** con reserva online, pagos Stripe, chat realtime y gestión clínica, sobre Next.js 14 (App Router) en Vercel y Supabase (Postgres + Auth + Realtime + Storage).

> Este README es la **guía de producción**. Para el bootstrap inicial de Supabase mira `supabase/BOOTSTRAP.md`.

---

## 1. Arquitectura

```
┌──────────────┐    HTTPS    ┌──────────────────────┐   RLS + RPC   ┌───────────────────────┐
│  Navegador   │────────────▶│ Vercel · Next.js 14  │──────────────▶│ Supabase (eu-central) │
│  (usuario)   │◀────────────│  App Router + SSR    │◀──────────────│ Postgres + Auth + Rt  │
└──────────────┘   Cookies   └──────────────────────┘    WebSocket  └───────────────────────┘
                                     ▲
                        Stripe webhook │
                        (vía Edge Fn)  │
```

- **Frontend:** Next.js 14 + React 18 + Tailwind (`frontend/`).
- **Auth & DB:** Supabase Auth (cookies httpOnly vía `@supabase/ssr`), Postgres con RLS por fila.
- **Realtime:** Supabase Realtime WebSocket en `citas`, `mensajes`, `conversaciones`, `pagos`, `recurso_asignaciones`.
- **Pagos:** Stripe Checkout + webhook que escribe en `pagos` con `service_role`.
- **Cifrado:** PII crítica (DNI, nombre completo, notas clínicas) cifrada a nivel aplicación con AES-256-GCM. Solo RLS controla visibilidad de filas, nunca el texto en claro.

---

## 2. Estructura del monorepo

```
almudena/
├─ frontend/                    # Next.js 14 app (Vercel)
│  └─ src/
│     ├─ app/                   # Rutas: (public), /admin, /portal, /api
│     ├─ components/            # UI: chat, booking, auth, pagos, portal-shell
│     ├─ lib/supabase/          # Clientes: server, browser, middleware, env, types
│     └─ services/              # Server Actions por dominio
├─ backend/                     # FastAPI stand-by (no desplegado)
│  ├─ app/                      # Rutas, modelos SQLAlchemy, servicios
│  ├─ migrations/               # Alembic (historico)
│  └─ requirements.txt
├─ supabase/
│  ├─ migrations/               # 0001..0024 ordenadas e idempotentes
│  ├─ functions/                # Edge Functions (Deno)
│  ├─ scripts/                  # bundle_for_deploy.mjs + smoke_test.mjs
│  └─ BOOTSTRAP.md              # Setup paso a paso
├─ docs/                        # Documentacion completa (ver seccion 12)
├─ .gitignore
└─ README.md                    # este archivo
```

---

## 3. Puesta en marcha local

```bash
# 1. Instalar dependencias
cd frontend
npm install

# 2. Configurar variables (ver .env.local.example)
cp .env.local.example .env.local
# Edita con tus URLs + keys de Supabase

# 3. Arrancar dev server
npm run dev
# → http://localhost:3000
```

### Variables de entorno (Vercel + local)

| Variable | Entorno | Notas |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | all | Pública, visible en bundle cliente. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | all | Pública; cada request va con RLS del usuario. |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | **NUNCA** expongas esto al cliente. Solo webhooks. |
| `NEXT_PUBLIC_APP_URL` | all | Ej. `https://clinica-almudena.vercel.app`. |
| `STRIPE_SECRET_KEY` | server | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | server | `whsec_...` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | all | `pk_live_...` |

> **Rotación:** si cualquier secret se pega en un chat, un PR, un screenshot o un log, **rótalo inmediatamente** en Supabase/Stripe. Es 1 click.

---

## 4. Flujos principales

### 4.1 Registro & login

1. `POST /signup` (formulario) → `supabase.auth.signUp` → trigger `tg_handle_new_user` crea `public.profiles` con role `'paciente'`.
2. Email de verificación (Supabase Auth).
3. Login → cookie httpOnly Supabase + `middleware.ts` valida sesión y redirige por rol a `/admin` o `/portal`.

### 4.2 Reserva

1. Paciente abre `/portal/citas/reservar`.
2. Client component `SlotPicker` consume `RPC obtener_disponibilidad(fecha, servicio_id)` → Postgres genera slots descontando citas + bloqueos.
3. Click en slot → Server Action `reservarCitaAction` → `RPC reservar_cita(servicio, slot)`:
   - Si bono activo → `'confirmada'` y consume una sesión.
   - Si no → `'bloqueo_temporal'` y redirige a Stripe Checkout.
4. Webhook Stripe (`/api/stripe/webhook`) confirma pago → actualiza `citas.estado` a `'confirmada'` con `service_role`.
5. Canal Realtime notifica a admin y paciente → refresh automático.

### 4.3 Chat realtime

1. Paciente abre `/portal/mensajes` → `RPC chat_mi_conversacion()` devuelve/crea conversación.
2. Componente `ChatPanel` suscribe `postgres_changes` sobre `public.mensajes filter=conversation_id=eq.<id>`.
3. Envío → `sendMensajeAction` → `RPC chat_enviar_mensaje` (SECURITY DEFINER, check permiso + actualiza `unread_*`).
4. Optimistic UI: pinta temporal con `pending:true`, sustituye al llegar INSERT Realtime.
5. Al abrir → `chat_marcar_leidos` resetea `unread_*` del invocador.

---

## 5. Seguridad

### Capa 1 — Auth

- Passwords ≥ 12 caracteres (validación Supabase + server action).
- MFA TOTP opcional (enrollment en `/admin/configuracion`).
- Middleware Next.js valida sesión en cada request + RBAC (`/admin/*` solo `role='admin'`).

### Capa 2 — RLS

- Todas las tablas con `enable row level security`.
- Dos helpers canónicos:
  - `public.is_admin()` — `true` si el usuario logueado tiene `role='admin'`.
  - `public.current_paciente_id()` — devuelve `pacientes.id` del usuario actual.
- Paciente solo ve filas donde `paciente_id = current_paciente_id()`.
- Admin lee todo.
- `auditoria` es solo-lectura para admin; inserts únicamente vía `service_role` desde el webhook/Edge Fn.

### Capa 3 — Cifrado

- PII en columnas `_ciphertext` (AES-256-GCM). Los `_bidx` son HMAC-SHA256 para búsquedas exactas sin desanonimizar.
- La clave maestra vive en **Supabase Vault** (no en env vars). Rotación trimestral.
- Mensajes de chat actualmente en texto plano dentro de `body_ciphertext` (TLS + RLS); pendiente upgrade a AES con clave por conversación (ver `TODO: encryption` en migraciones).

### Capa 4 — Auditoría

- Tabla `auditoria` con hash-chain: cada fila tiene `hash_integridad = SHA-256(hash_previo || usuario || accion || ts || detalles)`. Tamper-evident.
- Inserciones desde Edge Function `audit-log` o trigger PL/pgsql.

---

## 6. Checklist de producción

### 6.1 Seguridad

- [ ] Variables `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` configuradas **solo** como Production/Preview secrets en Vercel.
- [ ] `SECURITY_HEADERS` en `next.config.js`: `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin`.
- [ ] Rate limiting en endpoints de auth (Supabase nativo + middleware con `@upstash/ratelimit` si el tráfico lo pide).
- [ ] MFA obligatorio para el único admin (Almudena).
- [ ] Supabase Auth > Rate limits > Email/SMS revisados.
- [ ] Backups automáticos Supabase activados (Point-in-Time Recovery desde plan Pro).
- [ ] Key rotation calendar documentado (cada 90 días).

### 6.2 Accesibilidad (WCAG 2.2 AA)

- [ ] Focus visible con contraste ≥ 3:1 en todos los interactivos (`:focus-visible` con `outline-primary`).
- [ ] Contraste texto ≥ 4.5:1 (ya verificado en la paleta ink/canvas/primary).
- [ ] Navegación por teclado completa (tabulación lógica, `Enter`/`Space` en botones, `Esc` en modales).
- [ ] `aria-label` en íconos solo-ícono; `aria-live` en toasts de error.
- [ ] `prefers-reduced-motion`: todas las animaciones editoriales (`.portal-rise`, `@keyframes`) respetan la preferencia.
- [ ] Alt text en imágenes. `aria-hidden` en decorativas.
- [ ] Form labels asociados con `htmlFor` + `id`. Errores con `aria-describedby`.

### 6.3 SEO

- [ ] `metadata` por ruta pública (`(public)/layout.tsx`, `page.tsx`, etc.).
- [ ] `robots.txt` + `sitemap.xml` generados estáticamente en build.
- [ ] `application/ld+json` de tipo `MedicalBusiness` en home (nombre, dirección, teléfono, `priceRange`).
- [ ] Open Graph images dinámicas vía `next/og` para compartir en WhatsApp/LinkedIn.
- [ ] Canonical URLs y `hreflang` (solo `es`) declarados.
- [ ] Páginas admin/portal **excluidas** del indexado (`robots` en headers + `noindex` meta).

### 6.4 Performance

- [ ] Lighthouse Mobile ≥ 95 en home pública. Portales internos ≥ 90.
- [ ] `next/image` en todas las imágenes (AVIF+WebP, sizes correcto).
- [ ] `next/font` con `display: swap` para evitar FOIT.
- [ ] Code-splitting: los portales son rutas separadas con sus propios bundles.
- [ ] Supabase client memoizado en client components (`useMemo` singleton).
- [ ] Cache Components (Next 15/16) cuando se actualice — por ahora `force-dynamic` + Realtime refresh.
- [ ] Core Web Vitals monitorizados (Vercel Web Analytics).
- [ ] Bundle size < 200 KB transferido en cada ruta (comprobar con `@next/bundle-analyzer`).

### 6.5 Observabilidad

- [ ] Sentry en frontend (`@sentry/nextjs`) con PII masking activado.
- [ ] Supabase Logs: query slow (>500ms) configurados como alerta.
- [ ] Alertas de pago fallido (webhook Stripe `payment_intent.payment_failed`) → email + registro en `auditoria`.
- [ ] Uptime monitoring (Vercel o UptimeRobot) en home y `/portal`.

### 6.6 Legal / RGPD

- [ ] Política de privacidad publicada en `/legal/privacidad`.
- [ ] Consentimiento explícito + firma en el onboarding (tabla `pacientes.consentimiento_rgpd` + storage bucket `firmas-rgpd`).
- [ ] Proceso de derecho al olvido documentado (soft delete `activo=false` → purga anonimizada tras 5 años).
- [ ] Data Processing Agreement con Supabase (EU region).
- [ ] Registro de tratamientos según RGPD art. 30.

---

## 7. Deploy

```bash
# Link del proyecto con Vercel (primera vez)
cd frontend
vercel link --project clinica-almudena --yes

# Deploy preview
vercel

# Deploy producción
vercel deploy --prod
```

CI/CD: Vercel detecta el push a `main` y despliega. Previews automáticos en cada PR.

---

## 8. Migraciones Supabase

Orden estricto:

| # | Nombre | Descripción |
|---|---|---|
| 0001 | `init.sql` | Enums, tablas, triggers, índices. |
| 0002 | `rls.sql` | Políticas RLS. |
| 0003 | `storage.sql` | Buckets + policies (`recursos`, `firmas-rgpd`, `avatares`). |
| 0004 | `realtime.sql` | Publication + replica identity. |
| 0005 | `seed_servicios.sql` | Catálogo base. |
| 0006 | `chat.sql` | Vista `v_conversaciones_admin` + RPCs chat. |
| 0007 | `disponibilidad.sql` | `horarios_clinica` + RPCs `obtener_disponibilidad` + `reservar_cita`. |
| 0008 | `seed_demo.sql` | Datos demo (opcional, solo si existen los users demo). |
| 0009 | `email.sql` | `emails_log`, `notificaciones_prefs`, RPC `citas_pendientes_recordatorio_24h`, `pg_cron` horario. |
| 0010 | `stripe.sql` | `bonos_config`, `stripe_events`, RPCs `preparar_checkout_*`, `procesar_pago_stripe`. |

Aplicar todas:

```bash
# Vía MCP Supabase (recomendado) o Dashboard SQL Editor
# o con Supabase CLI:
supabase db push
```

---

## 9. Usuarios demo

| Email | Contraseña | Rol | Uso |
|---|---|---|---|
| `almudena@admin.com` | `Almudena2026!` | admin | Panel Almudena. |
| `usuario@visualizacion.com` | `Usuario2026!` | paciente | Portal paciente con datos demo (citas, bono, mensajes, pago). |

Créalos desde **Supabase Dashboard → Authentication → Users → Add user**. El trigger `tg_handle_new_user` creará `profiles` automáticamente. Luego:

```sql
update public.profiles set role = 'admin'    where email = 'almudena@admin.com';
update public.profiles set role = 'paciente' where email = 'usuario@visualizacion.com';
```

Y ejecuta `0008_seed_demo.sql` (o vía MCP `apply_migration`) para poblar los dashboards.

---

## 10. Emails transaccionales (Resend + Edge Functions)

Sistema de envíos automáticos con **Resend** (3.000 mails/mes gratis, DKIM auto, deliverability enterprise).

### Tipos implementados

| Tipo | Disparador | Ventana |
|---|---|---|
| `booking_confirmed` | Post-`reservarCitaAction` (solo si cita queda `confirmada`). | Inmediato |
| `reminder_24h`      | `pg_cron` horario (minuto 5) + Edge Fn `cron-recordatorios-24h`. | 23-25h antes |
| `booking_cancelled` | Post-cancelación desde admin o paciente. | Inmediato |
| `nueva_asignacion`  | Al asignar un recurso desde el admin. | Inmediato |
| `welcome`           | Alta de paciente (admin manual o flujo auto-registro). | Inmediato |

### Estructura

```
supabase/functions/
  _shared/
    cors.ts           # CORS allowlist (localhost + prod)
    resend.ts         # POST /emails con retry exponencial (3 intentos)
    templates.ts      # HTML inline-styled (Georgia + sage/parchment)
  send-email/
    index.ts          # Router por tipo · JWT · opt-in · dedupe · log
  cron-recordatorios-24h/
    index.ts          # Validador CRON_SECRET · procesa batch horario
frontend/src/lib/email/send.ts   # Helper server-only fire-and-forget
```

### Setup productivo (una sola vez)

**1) Alta y verificación en Resend**

```
https://resend.com → Sign up → Domains → Add Domain (ej. clinicamarchesi.es)
→ Copiar registros DNS (MX, SPF, DKIM) al DNS del dominio → Verify
→ API Keys → Create → guardar el token `re_xxx`
```

**2) Variables de entorno en Supabase**

Dashboard → Project Settings → **Edge Functions → Secrets**:

```bash
RESEND_API_KEY        = re_xxx
RESEND_FROM_EMAIL     = "Clínica Almudena <hola@clinicamarchesi.es>"
RESEND_REPLY_TO       = almudena@clinicamarchesi.es
FRONTEND_URL          = https://clinica-almudena.vercel.app
CRON_SECRET           = <32+ chars aleatorios — solo para el cron>
# SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY ya están inyectados por la plataforma
```

**3) Settings Postgres para el cron**

Una sola vez, desde el SQL Editor con el rol `postgres`:

```sql
alter database postgres set "app.settings.project_url" = 'https://<ref>.supabase.co';
alter database postgres set "app.settings.cron_secret" = '<el mismo CRON_SECRET>';
-- Reprograma el job (releerá los settings):
select cron.unschedule(jobid) from cron.job where jobname = 'recordatorios_24h_hourly';
-- Y re-aplica 0009_email.sql, que detectará los settings y creará el schedule.
```

**4) Despliegue de Edge Functions**

Tras modificar `supabase/functions/_shared/` o antes de subir una EF que importe `_shared/`, genera los bundles (salida en `supabase/functions/.bundled/`, ignorada por git):

```bash
node supabase/scripts/bundle_for_deploy.mjs
```

```bash
supabase functions deploy send-email              --project-ref <ref>
supabase functions deploy cron-recordatorios-24h  --project-ref <ref>
```

**5) Configurar SMTP personalizado de Supabase Auth**

Para que los mails nativos de Auth (verify, magic link, reset) también salgan por Resend:

Dashboard → **Authentication → Emails → SMTP Settings** → Enable custom SMTP:

```
Host:       smtp.resend.com
Port:       465     (TLS)
Username:   resend
Password:   re_xxx  (la misma API key)
Sender:     Clínica Almudena <hola@clinicamarchesi.es>
```

### Verificación end-to-end

```bash
# 1. Reserva una cita desde /portal/citas/reservar (con bono, para que quede confirmada)
#    → debe llegar booking_confirmed en segundos

# 2. Forzar ejecución manual del cron (sin esperar al minuto 5):
curl -X POST https://<ref>.supabase.co/functions/v1/cron-recordatorios-24h \
  -H "Authorization: Bearer <CRON_SECRET>"

# 3. Ver logs:
#    Dashboard → Logs → Edge Functions → send-email | cron-recordatorios-24h
#    SQL: select * from public.emails_log order by created_at desc limit 20;
```

### Dedupe y opt-out

- **Dedupe:** `emails_log.dedupe_key` = `tipo:cita_id_o_user:YYYY-MM-DD` con UNIQUE INDEX sobre filas `pending`/`sent`. Ejecuciones duplicadas del cron no reenvían.
- **Opt-out:** tabla `notificaciones_prefs` con granularidad por tipo. El paciente la edita en `/portal/ajustes`. Al insertar un `profile` nuevo, un trigger inicializa las preferencias en `true`.

---

## 11. Pagos con Stripe (Checkout + webhook)

Integración PCI-compliant mediante **Stripe Checkout hosted**. Las tarjetas NUNCA tocan nuestros servidores: Stripe las recibe, nosotros solo procesamos el `checkout.session.completed` vía webhook.

### Flujos

| Flujo | Trigger | Destino |
|---|---|---|
| **Cita suelta** (sin bono activo) | Paciente reserva → `reservarCitaAction` crea `bloqueo_temporal` → SlotPicker llama a `crearCheckoutCitaAction` → redirige a Checkout. | Pago confirmado → webhook pasa cita a `confirmada` + email `booking_confirmed`. |
| **Compra de bono** | Paciente pulsa "Comprar ahora" en `/portal/pagos` → `crearCheckoutBonoAction` → redirige a Checkout. | Pago confirmado → webhook crea `bonos_pacientes` con validez del `bonos_config`. |

### Estructura

```
supabase/functions/
  _shared/
    stripe.ts                    # REST client + HMAC-SHA256 signature verify
  stripe-checkout/index.ts       # Crea Checkout Session (JWT · RPC ownership)
  stripe-webhook/index.ts        # Verifica firma · procesar_pago_stripe · email
frontend/src/
  services/pagos/actions.ts      # crearCheckoutCita / crearCheckoutBono
  components/pagos/BonoCompraCard.tsx
  app/portal/pagos/
    page.tsx                     # Catálogo + bonos + historial
    success/page.tsx             # Retorno OK (?session_id=)
    cancel/page.tsx              # Retorno cancelado
```

### Idempotencia bulletproof

- **Nivel DB:** `pagos.stripe_event_id UNIQUE` → nunca se crea el mismo pago 2 veces aunque Stripe reenvíe el webhook (lo hace con backoff hasta 72h).
- **Nivel RPC:** `procesar_pago_stripe` retorna `ya_procesado: true` si detecta el evento, sin mutar nada.
- **Nivel audit:** tabla `stripe_events` con upsert del payload raw por `id`. Útil para forensics y replay manual.

### Setup productivo (una vez)

**1) Alta en Stripe y obtener claves**

```
https://dashboard.stripe.com → Developers → API keys
→ Copiar "Secret key" (sk_live_... para producción, sk_test_... para test)
```

**2) Configurar webhook endpoint en Stripe**

```
Dashboard → Developers → Webhooks → Add endpoint
URL:    https://<ref>.supabase.co/functions/v1/stripe-webhook
Events: checkout.session.completed
        checkout.session.async_payment_succeeded
        payment_intent.payment_failed
→ Signing secret: whsec_... (copiar, es DIFERENTE de la API key)
```

**3) Secretos en Supabase Edge Functions**

Dashboard → Project Settings → **Edge Functions → Secrets**:

```bash
STRIPE_SECRET_KEY      = sk_live_xxx   # (o sk_test_xxx para pruebas)
STRIPE_WEBHOOK_SECRET  = whsec_xxx
# FRONTEND_URL, SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY ya configurados antes
```

**4) Aplicar migración y desplegar Edge Functions**

```bash
# Migración
supabase db push   # aplica 0010_stripe.sql

# Bundles (si tocaste _shared/ o es la primera vez)
node supabase/scripts/bundle_for_deploy.mjs

# Funciones
supabase functions deploy stripe-checkout --project-ref <ref>
supabase functions deploy stripe-webhook  --project-ref <ref>
```

**5) Poblar `bonos_config`** (opcional — la migración siembra 3 bonos básicos)

```sql
insert into public.bonos_config (nombre, descripcion, servicio_id, sesiones, precio_centimos, validez_dias, destacado)
values ('Bono 20 sesiones', 'Ahorra un 20%.', '<servicio_uuid>', 20, 96000, 365, true);
```

### Pruebas en modo test

Usa las tarjetas oficiales de Stripe:

| Escenario | Número |
|---|---|
| Pago OK | `4242 4242 4242 4242` |
| Requiere 3D Secure | `4000 0027 6000 3184` |
| Rechazada | `4000 0000 0000 0002` |

CVC: cualquier 3 dígitos. Fecha: cualquier futura. Código postal: cualquier 5 dígitos.

### Testear el webhook localmente (Stripe CLI)

```bash
stripe listen --forward-to https://<ref>.supabase.co/functions/v1/stripe-webhook
# Reenvía eventos reales de tu cuenta test a la función desplegada, firmados
# con un webhook_secret temporal que la CLI muestra en pantalla.

# Disparar un evento de prueba:
stripe trigger checkout.session.completed
```

### Diagnóstico

```sql
-- Últimos eventos recibidos y si se procesaron
select id, type, received_at, processed_at, processing_error
from public.stripe_events
order by received_at desc limit 20;

-- Pagos recientes
select id, importe_centimos, estado, metodo, fecha_pago, cita_id, bono_id
from public.pagos
order by fecha_pago desc limit 20;
```

Si `processing_error` no es null → la firma era válida pero algo falló dentro de la RPC. Stripe reintentará automáticamente.

---

## 12. Documentacion tecnica

Todo el material de contexto, auditorias, planes e informes vive en `docs/` con esta estructura:

```
docs/
├─ 00_project_control/          # Control del proyecto
│  ├─ CONTEXTO_HISTORICO.md
│  └─ PENDIENTES_Y_CHECKLIST.md
├─ 01_audits/                   # Auditorias tecnicas
│  ├─ AUDITORIA_ARQUITECTURA.md
│  ├─ AUDITORIA_BACKEND.md
│  ├─ AUDITORIA_FRONTEND.md
│  ├─ AUDITORIA_BASE_DATOS.md
│  └─ AUDITORIA_SEGURIDAD_RGPD.md
├─ 02_reports/                  # Informes ejecutivos
│  ├─ INFORME_EJECUTIVO_CLIENTE.md
│  └─ REPORTE_EJECUCION.md
├─ 03_engineering/              # Arquitectura y planificacion
│  ├─ ARQUITECTURA_TECNICA.md
│  └─ ROADMAP.md
├─ 04_design/                   # Sistema visual
│  └─ SISTEMA_DISENO.md
└─ 05_operations/               # Operacion y runbooks
   ├─ SENTRY.md
   └─ TESTING_CHECKLIST.md
```

**Lectura recomendada para onboarding rapido**:
1. Este README.
2. `docs/02_reports/INFORME_EJECUTIVO_CLIENTE.md` — vision de producto.
3. `docs/01_audits/AUDITORIA_ARQUITECTURA.md` — diseno del sistema.
4. `docs/00_project_control/PENDIENTES_Y_CHECKLIST.md` — estado live.
5. `docs/01_audits/AUDITORIA_SEGURIDAD_RGPD.md` — compliance.

---

## 13. Roadmap corto (post-MVP)

1. **Cancelación de cita** (admin+paciente) con `booking_cancelled` + reembolso parcial Stripe si procede.
2. **Asignar recurso** desde admin → `nueva_asignacion` email.
3. **Auto-registro** paciente con verificación Supabase Auth + `welcome`.
4. **Webhook Resend** (tracking bounce/complaint → auto-desactivar preferencia).
5. **Cifrado chat end-to-end** (clave por conversación vía Vault).
6. **Export RGPD** (endpoint JSON firmado con todo el historial).
7. **Agenda admin semanal drag & drop** (FullCalendar sobre `v_citas_expandidas`).
8. **Notificaciones push PWA** (Web Push API + Service Worker).

---

## 14. Licencia

Código propietario. © Clínica Almudena Marchesi Fernández. Todos los derechos reservados.
