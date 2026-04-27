# Clínica Almudena Marchesi Fernández — Plataforma digital

Sitio público + portales **admin** y **paciente** con reserva online, pagos Stripe, chat realtime y gestión clínica, sobre Next.js 14 (App Router) en Vercel y Supabase (Postgres + Auth + Realtime + Storage).

> Este README es la **guía de producción**. Para el bootstrap inicial de Supabase mira `supabase/BOOTSTRAP.md`.

> **Arquitectura unificada (hito 14 · 22-abr-2026):** se eliminó por completo el legacy FastAPI stand-by. Todo el backend vive ahora en Supabase (Postgres RPCs + Edge Functions Deno). El auto-registro público (`/registro-paciente`) usa flujo OTP nativo de Supabase Auth + RPC cifrada `paciente_autoregistro_cifrada`.

> **SEO / GEO / Legal (23-abr-2026):** dominio canónico de producción **`https://ampsicologia.es`**. Metadata unificada con `buildPublicPageMetadata`, JSON-LD `@graph` (WebSite + LocalBusiness/MedicalBusiness) en la home con coordenadas y dirección postal completas, `WebPage` + `dateModified` en `/aviso-legal`, `/cookies`, `/privacidad`. Contacto público **`contacto@ampsicologia.es`**. Documentación de referencia: `docs/03_ingenieria/geo-y-seo.md`. Las tres páginas legales llevan versión **`2026-04-23-v1`**.
>
> **Migraciones Supabase + CLI (abr-2026):** el remoto tenía versiones con timestamp (`202604…`) y el repo numeradas (`0001`…`0046`). Se alineó el historial con ficheros no-op `supabase/migrations/202604*_remote_reconcile.sql` + `supabase migration repair --status applied` para las versiones locales ya reflejadas en esquema. Tras eso, `npx supabase db push` queda en *Remote database is up to date.* Ver `docs/00_proyecto/cronologia.md` (Hitos 16–17).
>
> **Política cancelación paciente:** migración `0046_cancelar_cita_48h_sin_reembolso_paciente.sql` — el paciente solo cancela si la cita es **>48h**; sin reembolso Stripe automático al paciente (gestión manual / política clínica). Admin mantiene flujo con refund cuando aplica.
>
> **Auditoría económica (reposición):** `docs/02_informes/valor-reposicion-software.md` (banda **~12k–20k €** típica de rehacer el alcance, techo razonable en torno a **~30k €** según tramo y tarifa; ver sección 3 del informe).
>
> **Toolkit GEO local:** carpeta **`.GEO/`** (PowerShell + Python venv aislado) — `.\.GEO\run-geo-audit.ps1` genera informes HTML/JSON en `.GEO/reports/`. Ver `.GEO/README.md`.
>
> **Refinamientos de la app (26–27-abr-2026):** iteraciones de **ajuste y pulido** sin cambiar el alcance base del producto.
> - **26-abr:** agenda semana (rejilla Madrid, móvil), horario sesión **09:00–21:59** Madrid + migración **`0064`**, landing/Enfoque sin iconos, menú móvil con contraste WCAG. **`docs/00_proyecto/refinamientos-app-2026-04-26.md`** · `cronologia.md` **Hito 22**.
> - **27-abr:** auditoría en Configuración (nombre paciente vía `pacientes`→`profiles`), **adjuntos en ficha** (subida + descarga firmada), **cancelar cita desde agenda** (panel resumen → hueco liberado vía RPC), más refinamientos de panel, listados, pagos/email PDF, público modo claro; **migración** `terapeuta_public_profile` renumerada a **`0065`** (evitar dos archivos `0062_*.sql`). **`docs/00_proyecto/refinamientos-app-2026-04-27.md`** · `cronologia.md` **Hito 23**.

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
├─ supabase/
│  ├─ migrations/               # 0001..0046 + stubs 202604*_remote_reconcile (historial CLI); ver §8
│  ├─ functions/                # Edge Functions (Deno) — send-email, stripe-*, health, rgpd, invoice-pdf, cancel-cita…
│  ├─ scripts/                  # bundle_for_deploy.mjs + smoke_test.mjs
│  └─ BOOTSTRAP.md              # Setup paso a paso
├─ docs/                        # Toda la documentación .md del producto (ver §12)
├─ .GEO/                        # (Opcional en el clon) Auditoría GEO local — ver docs/00_proyecto/cronologia.md Hito 16
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
| `NEXT_PUBLIC_APP_URL` | all | Ej. `https://ampsicologia.es` (dominio definitivo; preview Vercel hasta DNS). |
| `STRIPE_SECRET_KEY` | server (p. ej. secret Supabase Edge) | `sk_test_...` en pruebas, `sk_live_...` solo al cobrar de verdad. |
| `STRIPE_WEBHOOK_SECRET` | server | `whsec_...` del **mismo** modo: endpoint creado en Test mode vs Live. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | all (Vercel) | `pk_test_...` o `pk_live_...`; debe coincidir con `STRIPE_SECRET_KEY`. |

> **Rotación:** si cualquier secret se pega en un chat, un PR, un screenshot o un log, **rótalo inmediatamente** en Supabase/Stripe. Es 1 click.

---

## 4. Flujos principales

### 4.1 Registro & login

1. **Auto-registro paciente** (`/registro-paciente`, dos pasos):
   - Paso 1 (`RegistroPacienteClient`): recoge datos clínicos completos (nombre, DNI/NIE, teléfono, fecha nacimiento, motivo, experiencia previa, medicación psiquiátrica opcional, alergias). Server Action `startRegistrationAction` almacena los datos clínicos en cookies `httpOnly` con TTL de 15 min y dispara `supabase.auth.signInWithOtp({ shouldCreateUser: true })` → redirige a `/registro-paciente/verificar`.
   - Paso 2 (`VerificarOtpClient`): usuario introduce OTP + define contraseña (≥14 chars). `verifyOtpAction` valida el código, llama a `supabase.auth.updateUser({ password })` y luego a RPC `public.paciente_autoregistro_cifrada(...)` para persistir la ficha completa cifrada (AES-256 vía Vault).
   - Trigger `tg_handle_new_user` había creado ya `public.profiles` con role `'paciente'`.
2. **Login**: cookie httpOnly Supabase + `middleware.ts` valida sesión y redirige por rol a `/admin` o `/portal`.

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
- Cookies Supabase endurecidas por helper `hardenCookieOptions()` en `src/lib/supabase/middleware.ts`: siempre `httpOnly: true`, `secure: true` en prod, `sameSite: 'lax'`, `path: '/'`, por encima de lo que proponga `@supabase/ssr` (defensa en profundidad).
- Header `Vary: Cookie, Accept-Encoding` → evita que la cache CDN sirva respuestas de un usuario a otro.

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

### Capa 5 — Defensas aplicativas (ronda senior · abril 2026)

- **CSP unificada** — única fuente de verdad en `frontend/next.config.js` (`async headers()`). Eliminada la duplicación previa en middleware que generaba CSP divergente entre rutas estáticas y dinámicas. Directivas estrictas: `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`, `worker-src 'self' blob:`, `upgrade-insecure-requests`. Añadidos: `Cross-Origin-Resource-Policy: same-origin`, `Origin-Agent-Cluster: ?1`.
- **Rate limiting** (`src/lib/security/rate-limit.ts`): ventana deslizante; con `UPSTASH_REDIS_*` el contador es **global** entre instancias; sin Redis, reserva en memoria por instancia. Puntos de uso (entre otros):
  - `POST /api/mensajes/attach` — 20/min por usuario.
  - `POST /api/admin/avatar/upload` — 10/h.
  - `POST /api/admin/recursos/upload` — 30/h (admin).
  - `GET /api/admin/facturacion/export` — exportaciones CSV por admin.
  - `GET /api/admin/recursos/file/[id]`, `GET /api/portal/recursos/download/[id]` — descargas.
  - `GET /api/portal/factura/[pagoId]/pdf` — generación de PDF.
- **Magic-bytes validation** (`src/lib/security/file-validation.ts`) — valida la firma binaria real del archivo contra el MIME declarado. Protege contra MIME spoofing (ejecutables renombrados a `.png`). Formatos aceptados: PNG, JPEG, WEBP, HEIC/HEIF, AVIF, PDF, GIF.
- **CSV injection (OWASP)** — `csvEscape()` en el export de facturación prefija con `'` cualquier valor que empiece por `=`, `+`, `-`, `@`, tab o CR. Previene ejecución de fórmulas al abrir el CSV en Excel.
- **Supabase client singleton** (`src/lib/supabase/client.ts`) — una única instancia WebSocket Realtime por pestaña.
- **Optimización de fonts**: Material Symbols self-hosted con subset (solo iconos usados) → `3.8 MB → 6.4 KB` (99.8% reducción). Fuentes con `preload: true` solo para body (LCP).

### Capa 6 — Rendimiento de base de datos

- Migración `0026_performance_indexes` (aplicada `2026-04-22`) — 8 índices compuestos + `ANALYZE`:
  - `citas(paciente_id, inicio DESC)` → ficha paciente.
  - `citas(inicio) WHERE estado IN ('confirmada','bloqueo_temporal')` → dashboard.
  - `pagos(paciente_id, fecha_pago DESC)` y `pagos(estado, fecha_pago DESC)` → historial + export.
  - `mensajes(conversation_id, created_at DESC)` → chat.
  - `mensajes_adjuntos(mensaje_id, created_at ASC)`.
  - `stripe_events(received_at DESC) WHERE processed_at IS NULL` → retry queue.
  - `profiles(role)` → filtros admin.

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

- [ ] Política de privacidad publicada en `/privacidad` (versión vigente fechada).
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

CI/CD: Vercel detecta el push a **`frontend`** (rama de producción) y despliega.
Previews automáticos en cada PR.

### Configuración Vercel vigente
- **Production Branch** (GitHub default branch): `frontend`.
- **Root Directory**: `frontend` (minúsculas — Linux es case-sensitive).
- **Región**: `fra1` (Frankfurt) — misma que Supabase `eu-central-1`, definida en `frontend/vercel.json`.
- **Cache**: `Cache-Control` inmutable para `/fonts/*`, `/images/*`, `/_next/static/*`, `/_next/image`.
- **Runtime sensible**: `/portal/*` y `/admin/*` emiten `Cache-Control: private, no-store, must-revalidate` + `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet` (ningún CDN ni buscador cachea datos clínicos).

---

## 8. Migraciones Supabase

Orden estricto:

| # | Nombre | Descripción |
|---|---|---|
| 0001 | `init.sql` | Enums, tablas, triggers, índices. |
| 0002 | `rls.sql` | Políticas RLS. |
| 0003 | `storage.sql` | Buckets + policies (`recursos`, `firmas-rgpd`, `avatares`, `chat-adjuntos`, `paciente-adjuntos`). |
| 0004 | `realtime.sql` | Publication + replica identity. |
| 0005 | `seed_servicios.sql` | Catálogo base. |
| 0006 | `chat.sql` | Vista `v_conversaciones_admin` + RPCs chat. |
| 0007 | `disponibilidad.sql` | `horarios_clinica` + RPCs `obtener_disponibilidad` + `reservar_cita`. |
| 0008 | `seed_demo.sql` | Datos demo (opcional, solo si existen los users demo). |
| 0009 | `email.sql` | `emails_log`, `notificaciones_prefs`, RPC recordatorio 24h (base), `pg_cron` horario. Ventanas finas: **0060** + **0061** (48h + 24h, `reminder_48h` / `reminder_24h`). |
| 0010 | `stripe.sql` | `bonos_config`, `stripe_events`, RPCs `preparar_checkout_*`, `procesar_pago_stripe`. |
| 0011 | `audit_hashchain` + `cancelacion_asignacion` | Auditoría tamper-evident + cancelación/asignación. |
| 0012 | `auditoria_ficha_clinica` | Registro de accesos a ficha. |
| 0013 | `chat_rgpd_preferencias` | Opt-in/out granular por tipo. |
| 0014-0015 | `horario_plantillas` + `agenda_bloqueos_metadata` | Horarios recurrentes + metadata. |
| 0016-0017 | `ficha_mvp_plaintext` + `citas_notas_plaintext_mvp` | MVP ficha clínica y notas. |
| 0018 | `recursos_publico` | Recursos asignables al paciente. |
| 0019 | `facturas` | Numeración correlativa + serie anual. |
| 0020 | `rgpd_exports` | Exports JSON firmados. |
| 0021 | `security_lints_fix` | `security_invoker=true` en vistas + `search_path` fijo en funciones. |
| 0022-0024b | Cifrado F5 | pgcrypto + vault + RPCs CRUD cifrados + triggers auto-encrypt. |
| **0026** | **`performance_indexes`** | **8 índices compuestos + ANALYZE (aplicado 2026-04-22).** |
| 0027-0028 | `audit_admin_lookups` + `retirar_seed_demo` | Auditoría blind-index + script idempotente de purga demo. |
| **0029** | **`paciente_autoregistro`** | **RPC cifrada para auto-registro público (paso 2 OTP, hito 14). Reemplaza al flujo legacy FastAPI.** |
| 0030–0036 | Fixes críticos post-E2E | `reservar_cita` sin ambigüedad; `admin_lookups`; `registro_clinico_descifrar`; cierre fuga RGPD plaintext; UPSERT nota cita; bulk DX/med. |
| **0037** | **`chat_cifrado`** | Cifrado de `mensajes.body` + vista `v_mensajes_chat`; backfill compatible. |
| 0038–0040 | RLS/prefs, catálogo pareja/precios, bono manual | Ajustes de políticas y producto. |
| **0044** | **`sesion_individual_pareja`** | Sesiones individual/pareja en catálogo y flujos donde aplica. |
| **0045** | **`chat_enviar_variable_conflict`** | `SET plpgsql.variable_conflict = use_column` en `chat_enviar_mensaje` (evita colisión PL/pgSQL). |
| **0046** | **`cancelar_cita_48h_sin_reembolso_paciente`** | Paciente: cancelación solo **>48h** antes del inicio; sin refund Stripe automático al paciente. |
| `202604*_remote_reconcile.sql` | *(47 ficheros)* | No-op: alinean nombres de versión remotos con el CLI (`db push` / `migration list`). |

`[db] major_version = 17` en `supabase/config.toml` alineado con el proyecto enlazado. Varias Edge Functions tienen `verify_jwt = false` donde el contrato es API key / secret (p. ej. webhooks, cron); revisar `config.toml` al añadir funciones.

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
| `reminder_48h`      | `pg_cron` horario (minuto 5) + Edge `cron-recordatorios-24h` (migr. `0060`+`0061`) | **47h–49h** (≈2 días) |
| `reminder_24h`      | Mismo cron / Edge (migr. `0060`+`0061`) | **23h–25h** (≈mañana) |
| `booking_cancelled` | Post-cancelación desde admin o paciente. | Inmediato |
| `nueva_asignacion`  | Al asignar un recurso desde el admin. | Inmediato |
| `welcome`           | Alta de paciente (admin manual o flujo auto-registro). | Inmediato |

### Estructura

```
supabase/functions/
  _shared/
    clinic-brand.ts   # NAP, colegiación, email contacto, tag Resend `brand:almudena`
    cors.ts           # CORS allowlist (localhost + prod)
    resend.ts         # POST /emails con retry exponencial (3 intentos)
    resend-tags.ts    # Tags unificados (auditoría en el panel de Resend)
    templates.ts      # Un shell HTML + pie equivalente en texto plano
  send-email/
    index.ts          # Router por tipo · JWT · opt-in · dedupe · log
  cron-recordatorios-24h/
    index.ts          # Validador CRON_SECRET · procesa batch horario
frontend/src/lib/email/send.ts   # Helper server-only fire-and-forget
```

### Setup productivo (una sola vez)

**1) Alta y verificación en Resend**

```
https://resend.com → Sign up → Domains → Add Domain (ej. ampsicologia.es)
→ Copiar registros DNS (MX, SPF, DKIM) al DNS del dominio → Verify
→ API Keys → Create → guardar el token `re_xxx`
```

**2) Variables de entorno en Supabase**

Dashboard → Project Settings → **Edge Functions → Secrets**:

```bash
RESEND_API_KEY        = re_xxx
RESEND_FROM_EMAIL     = "Clínica Almudena <contacto@ampsicologia.es>"
RESEND_REPLY_TO       = contacto@ampsicologia.es
FRONTEND_URL          = https://ampsicologia.es
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
Sender:     Clínica Almudena <contacto@ampsicologia.es>
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

**Datos del emisor en facturas PDF** (`invoice-pdf`): secrets `FACTURA_EMISOR_*` con nombre, NIF, dirección, CP/ciudad, email de contacto fiscal y colegiación; opcionales teléfono, IBAN y REGCESS (omitir si no aplican). Tabla de valores vigente en **`docs/00_proyecto/estado-y-pendientes.md`** (apartado **2.5 Facturas**). Tras editar secrets en el dashboard, redeploy de `invoice-pdf` si tu flujo no los recarga en caliente.

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

## 12. Documentación técnica

Toda la documentación en **Markdown** está en **`docs/`** (raíz del monorepo). **No** hay carpeta `frontend/docs/`.

| Entrada | Contenido |
|--------|------------|
| `docs/README.md` | Mapa, criterios, orden de lectura |
| `docs/00_proyecto/linea-base-producto.md` | Alcance y módulos en la línea base actual |
| `docs/00_proyecto/refinamientos-app-2026-04-26.md` | Refinamientos de la app — 26-abr (agenda, horario, móvil, público) |
| `docs/00_proyecto/refinamientos-app-2026-04-27.md` | Refinamientos de la app — 27-abr (auditoría, adjuntos ficha, cancelación agenda, pulido panel/listados) |
| `docs/00_proyecto/estado-y-pendientes.md` | Bloqueos, dominio, secrets |
| `docs/05_operaciones/checklist-produccion.md` | Operación, QA profundo, E2E, go-live (un solo doc) |
| `docs/02_informes/ejecutivo-cliente.md` | Visión de negocio (clínica) |
| `docs/02_informes/valor-reposicion-software.md` | Valor de reposición (ingeniería) |
| `supabase/BOOTSTRAP.md` | Primer arranque de base y entorno local |

Lectura breve de onboarding: este README → `docs/README.md` → `02_informes/ejecutivo-cliente` o `estado-y-pendientes` → `01_auditorias/seguridad-rgpd.md` si aplica compliance.

---

## 13. Roadmap corto (post-MVP)

1. ~~**Cancelación de cita**~~ — **Hecho** (admin + paciente con reglas; paciente **>48h** sin refund automático Stripe — ver migración `0046`). Pendiente: refinamiento UX/copy si hace falta.
2. **Asignar recurso** desde admin → email `nueva_asignacion` (Edge `assign-recurso`; verificar despliegue y prefs).
3. ~~**Auto-registro** paciente~~ — **Hecho** (OTP Supabase + `paciente_autoregistro_cifrada` + email `welcome` según flujo).
4. **Webhook Resend** (bounce/complaint → auto-desactivar preferencia).
5. **Cifrado chat “fuerte”** — cifrado en capa app ya aplicado (`0037`); pendiente evolución E2E por conversación si se exige modelo máximo paranoia.
6. **Export RGPD** — infra `rgpd-request` / exports; completar runbooks y pruebas de operador.
7. **Agenda admin semanal drag & drop** (FullCalendar sobre `v_citas_expandidas`).
8. **Notificaciones push PWA** (Web Push API + Service Worker).

---

## 14. Licencia

Código propietario. © Clínica Almudena Marchesi Fernández. Todos los derechos reservados.
