# Pendientes & checklist operativo (fuente de verdad)

> Este documento reemplaza "lo que quedó en el chat". Se actualiza en cada hito.
> **Regla**: nada de secretos en claro aquí (solo nombres de variables y pasos).

Última actualización: **2026-04-22** — ronda senior performance + seguridad aplicada:
- FASE 3·4·6: ficha admin (edición por sección + historial paginado), `/portal/pagos` y `/portal/recursos` alineados al plan, audio en chat (validación magic bytes + límite audio + UI). Verificación: `docs/00_project_control/VERIFICACION_FASE3_4_6_22_ABR_2026.md`. **SEPA en Stripe: aún no activado** en dashboard; la guía operativa sigue en `docs/05_operations/ACTIVAR_SEPA_STRIPE.md` (o equivalente).
- Migración `0026_performance_indexes` aplicada en producción (8 índices compuestos + ANALYZE).
- CSP unificada y endurecida (una sola fuente en `next.config.js`); middleware deja de duplicarla.
- Cookies Supabase endurecidas (`httpOnly`+`secure`+`sameSite`+`path` forzados).
- Rate limiter en memoria + validación magic-bytes en endpoints de upload (`attach`, `avatar`, `recursos`).
- Protección CSV injection en export facturación.
- Rama git renombrada `FRONTEND` → `frontend`; Vercel Production Branch = `frontend`, Root Directory = `frontend` (case-sensitive en Linux).
- Migraciones 0012-0024b aplicadas + Edge Functions F5 desplegadas + cifrado cliente migrado + Payment Element embebido + webhook Stripe verificado (200 OK en sandbox).

---

## 1) Datos recibidos de Almudena (abril 2026)

| Dato | Estado | Uso |
|------|--------|-----|
| **Dominio** | **amclinicapsicologia.es** (elegido; **compra y DNS al final** del go-live) | Vercel + Resend + URLs canónicas en código (`frontend/src/lib/clinic.ts`). |
| **NIF / DNI** | `04850571D` | Secret `FACTURA_EMISOR_NIF` (Supabase Edge) + textos legales en web. |
| **Col. COPM** | `M-40804` | Secret `FACTURA_EMISOR_COLEGIADA` + PDF factura + aviso/privacidad. |
| **REGCESS** | Pendiente (consulta en colegio; confirmar mañana) | Secret `FACTURA_EMISOR_REGCESS` cuando exista; PDF lo omite si vacío. |
| **Titulación** | PGS — *Máster habilitante* (sanitaria) | Sustenta exención IVA 20.1.3 LIVA; texto en factura (pie) y legales. |

### Último tramo (cuando se compre el dominio)

- [ ] Comprar **amclinicapsicologia.es** y apuntar DNS a Vercel.
- [ ] Añadir el dominio en Vercel y **Supabase Auth → URL configuration / redirect URLs** (ya listados en `supabase/config.toml` como referencia local).
- [ ] Verificar dominio en Resend (SPF/DKIM/DMARC).
- [ ] Buzón **contacto@amclinicapsicologia.es** (o el acordado) y secret `FACTURA_EMISOR_EMAIL` + `RESEND_FROM_EMAIL` con remitente del dominio.
- [ ] `FRONTEND_URL` en Edge Secrets = `https://amclinicapsicologia.es` (hasta entonces puede mantenerse el preview de Vercel sin romper; el código ya usa el dominio final como canónico y CORS).

---

## 2) Secrets obligatorios (Supabase Edge Functions → Secrets)

### 2.1 Observabilidad (Edge Functions)
- [x] `SENTRY_DSN` *(proyecto Sentry `supabase-edge`)* — confirmado listo.

### 2.2 Resend
- [x] `RESEND_API_KEY`
- [x] `RESEND_WEBHOOK_SECRET`
- [x] `RESEND_FROM_EMAIL` *(temporal: `Clinica Almudena <onboarding@resend.dev>` hasta dominio)*

### 2.3 Stripe
- [x] `STRIPE_SECRET_KEY` *(test)*
- [x] `STRIPE_WEBHOOK_SECRET` *(test)* — **a rotar al pasar a Live**

### 2.4 App
- [x] `CRON_SECRET`
- [ ] `FRONTEND_URL` en producción: `https://amclinicapsicologia.es` *(hasta DNS: opcional dejar el preview de Vercel en Secrets)*

### 2.5 Facturas (mínimo para generar PDF válido)
- [x] `FACTURA_EMISOR_NOMBRE`
- [ ] `FACTURA_EMISOR_NIF` → **`04850571D`**
- [x] `FACTURA_EMISOR_DIRECCION`
- [x] `FACTURA_EMISOR_CP_CIUDAD`
- [ ] `FACTURA_EMISOR_EMAIL` → sugerido **`contacto@amclinicapsicologia.es`** (crear buzón al activar el dominio)
- [x] `FACTURA_IVA_EXENCION_TEXTO` *(opcional; el EF trae default si se omite)*
- [ ] `FACTURA_EMISOR_COLEGIADA` → **`M-40804`**
- [ ] `FACTURA_EMISOR_REGCESS` → **pendiente** (rellenar cuando el colegio/REGCESS lo confirme)

### 2.6 Cifrado de columnas (F5) — COMPLETADO
- [x] Migración `0022_cifrado_setup` aplicada (pgcrypto + supabase_vault + helpers).
- [x] Secret `app_encryption_key` provisionada en `vault` (32 bytes random hex).
- [x] `app_encryption_ready()` devuelve `true`.
- [x] Migración `0023_cifrado_rpcs_crud` aplicada (CRUD cifrado pacientes + ficha clínica).
- [x] Roundtrip encrypt/decrypt/bidx verificado end-to-end.

---

## 3) Variables obligatorias (Vercel → Environment Variables)

### 3.1 Frontend Next.js (Vercel)
- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Stripe: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- Sentry: `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`, `SENTRY_CHECK_TOKEN`
- App URLs: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL`
- Cron: `CRON_SECRET` (para que las Server Actions puedan firmar callbacks)

### 3.2 Backend legacy (FastAPI) — ELIMINADO (hito 14 · 22-abr-2026)
**Decisión arquitectónica final**: el directorio `backend/` y todas sus dependencias (`services/citas.ts`, `services/payments/*` client-side, rutas `/api/admin/facturacion/nota-administrativa`, `/api/admin/config/backup-keys`, `components/admin/AdminNotaAdministrativaSticker.tsx`, `scripts/update-imports.js`) fueron **eliminados del repositorio**. El auto-registro público se migró a Supabase Auth OTP + RPC `paciente_autoregistro_cifrada` (migración `0029`). Cualquier futura necesidad de lógica servidor va como Edge Function Deno, no como servicio Python aparte.

---

## 4) Estado de despliegue técnico (✅ completado en esta sesión)

### 4.1 Migraciones aplicadas (project ref `koxsikkobjlycqqfstye`)
- [x] `0012_auditoria_ficha_clinica`
- [x] `0013_chat_rgpd_preferencias_retry`
- [x] `0014_horario_plantillas_retry`
- [x] `0015_agenda_bloqueos_metadata`
- [x] `0016_ficha_mvp_plaintext_retry`
- [x] `0017_citas_notas_plaintext_mvp`
- [x] `0018_recursos_publico`
- [x] `0019_facturas`
- [x] `0020_rgpd_exports`
- [x] `0021_security_lints_fix` (view `security_invoker=true` + `search_path` fijo en funciones)
- [x] `0022_cifrado_setup` (pgcrypto + vault + `app_encrypt`/`app_decrypt`/`app_bidx`)
- [x] `0023_cifrado_rpcs_crud` (RPCs CRUD cifradas: pacientes + diagnósticos + medicación + notas cita)
- [x] `0024_auto_encrypt_triggers` + `0024b_fix_nota_cita_upsert`
- [x] `0026_performance_indexes` — **2026-04-22** — 8 índices compuestos (citas, pagos, mensajes, mensajes_adjuntos, stripe_events, profiles) + ANALYZE. ~120 KB total. Ganancia esperada 2–10× en ficha paciente, agenda, chat y retry queue de webhooks.

### 4.2 Edge Functions desplegadas
- [x] `invoice-pdf` v1 (nueva)
- [x] `rgpd-request` v1 (nueva)
- [x] `stripe-payment-intent` v1 (nueva, Payment Element embebido)
- [x] `stripe-webhook` v19 (Sentry + handler `payment_intent.succeeded`)
- [x] `stripe-checkout` v19 (`automatic_payment_methods` + `locale: "es"`)

### 4.3 Stripe Dashboard → webhook endpoint
Eventos que debe escuchar el endpoint de `stripe-webhook`:
- [ ] `checkout.session.completed`
- [ ] `checkout.session.async_payment_succeeded`
- [ ] `payment_intent.succeeded` **(nuevo — confirmar en dashboard)**
- [ ] `payment_intent.payment_failed`

---

## 5) Pendiente técnico — bloques grandes

### 5.1 F5 — Cifrado real de columnas sensibles ✅ INFRA LISTA
Estrategia aplicada: `pgcrypto` (`pgp_sym_encrypt` AES-256) + `supabase_vault` (master key) + blind index HMAC-SHA256 para lookup.
**NO** se usa `pgsodium` (Supabase lo está desaconsejando).

**Listo**:
- [x] `0022_cifrado_setup` + secret en vault.
- [x] `0023_cifrado_rpcs_crud` con RPCs admin-only SECURITY DEFINER para todas las tablas sensibles.
- [x] `0024_auto_encrypt_triggers` → triggers BEFORE INSERT/UPDATE en `paciente_diagnosticos`, `paciente_medicacion`, `citas_notas_paciente` que cifran plaintext → `_ciphertext` automáticamente (idempotentes).
- [x] `0024b_fix_nota_cita_upsert` → arregla `nota_cita_guardar_cifrada` (insert directo, sin ON CONFLICT porque `cita_id` no es unique).

**Migración cliente completada** (commit actual):
- [x] `revelarCampoSensibleAction` → ahora llama a `paciente_revelar_campo` y devuelve plaintext real (antes devolvía placeholder).
- [x] `SensitiveField` → prop renombrada `plaintext` → `plaintextOverride`; lee `res.data.plaintext`.
- [x] `crearDiagnosticoAction` → RPC `diagnostico_crear_cifrado`.
- [x] `crearMedicacionAction` → RPC `medicacion_crear_cifrada`.
- [x] `/admin/pacientes/alta/page.tsx` → form funcional `AltaManualForm` + `altaManualPacienteAction` → `paciente_alta_cifrada`.
- [x] `services/admin/pacientes-actions.ts` → `altaManualPacienteAction`, `actualizarPacienteSensiblesAction`, `buscarPacientePorCampoAction`.
- [x] Notas de cita del paciente (`crearNotaCitaAction`) → insert directo + trigger auto-encrypt. Sin cambios en UI.
- [x] Tipos Supabase (`lib/supabase/types.ts`) extendidos con todas las RPCs F5.

**Queda por migrar** (no bloqueante, cuando haya diseño de UI):
- [x] `/admin/pacientes/[id]` edit inline de campos sensibles → componente `EditableSensitiveField` con `actualizarPacienteSensiblesAction` (completado 22-abr-2026).
- [x] UI admin para notas post-sesión vía `nota_cita_guardar_cifrada` → `NotaSesionAdminEditor` expandible en timeline de la ficha, descifrado on-demand (completado 22-abr-2026).
- [x] Búsqueda en `/admin/pacientes` por email/DNI/teléfono → detección automática de patrón y lookup vía `paciente_buscar_por_campo` (blind index HMAC, completado 22-abr-2026).

**Migración futura `0025_cifrado_drop_plaintext`** (SOLO tras 100% confianza en que nadie lee plaintext):
- [ ] Drop columnas `titulo`, `descripcion` de `paciente_diagnosticos` (mantener `_ciphertext`).
- [ ] Drop columna `notas` de `paciente_medicacion`.
- [ ] Drop columna `contenido` de `citas_notas_paciente`.
- [ ] Actualizar todos los reads para pasar por `registro_clinico_descifrar`.

### 5.2 Payment Element embebido (frontend) ✅ COMPLETADO
- [x] `@stripe/stripe-js` + `@stripe/react-stripe-js` instalados.
- [x] `PaymentElementDrawer` (`components/portal/pagos/PaymentElementDrawer.tsx`) → modal bottom-sheet con `<Elements>` + `<PaymentElement>`, appearance match dark/light, locale `es`.
- [x] `crearPaymentIntentCitaAction` + `crearPaymentIntentBonoAction` en `services/pagos/actions.ts` → invocan Edge Function `stripe-payment-intent`.
- [x] `SlotPicker` → abre el drawer al reservar sin bono (antes: redirect a Checkout hosted).
- [x] `BonoCompraCard` → abre el drawer directamente (antes: redirect).
- [x] Flow completo queda in-page; Stripe redirige a `/portal/pagos/success` tras confirmación.
- [x] `stripe-checkout` sigue deployada como fallback si alguna vez hace falta (no usada actualmente desde el frontend).

### 5.3 Lint Supabase — último warn
- [x] **Leaked Password Protection** → decisión tomada: **se mantiene todo gratuito** (no upgrade a Pro). Mitigación ya aplicada: password mínimo 12 chars + complejidad en `authOptions`. El warning en Advisor queda como aceptado y no bloquea go-live.

---

## 6) Hito final (pre-producción) — rotación obligatoria

- [ ] Cambiar passwords: Outlook, Supabase, Vercel, Stripe (passphrases >= 20 chars).
- [ ] Rotar `RESEND_API_KEY`, `STRIPE_SECRET_KEY` (al pasar a Live), `CRON_SECRET`, `STRIPE_WEBHOOK_SECRET`, `RESEND_WEBHOOK_SECRET`.
- [ ] Rotar `APP_ENCRYPTION_KEY` (vault) **solo si se ha expuesto**.
- [ ] Invalidar tokens antiguos (GitHub/Vercel/etc.).
- [ ] Crear usuarios admin/paciente reales con credenciales fuertes y borrar seeds demo (`usuario@visualizacion.com` / `Almudena2026!`).
- [ ] Borrar toda fila de testing en `pacientes`, `citas`, `pagos`, `mensajes`, `bonos_pacientes`, `stripe_events` antes de abrir al público.
  - [x] Script idempotente listo: `supabase/migrations/0028_retirar_seed_demo.sql`. **Ejecutar desde Supabase SQL Editor justo antes del go-live** (tras crear el paciente real y antes de exponer el dominio).

---

## 7) Ronda "ultra-performance + seguridad senior" (abril 2026)

### 7.1 Seguridad aplicativa — COMPLETADO
- [x] CSP unificada en `next.config.js` (única fuente de verdad; middleware no duplica).
- [x] CSP endurecida: `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`, `worker-src 'self' blob:`, `upgrade-insecure-requests`.
- [x] Añadidos headers `Cross-Origin-Resource-Policy: same-origin`, `Origin-Agent-Cluster: ?1`.
- [x] `/portal/*` y `/admin/*` → `Cache-Control: private, no-store, must-revalidate` + `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet`.
- [x] `/api/*` → `Cache-Control: no-store` + `X-Robots-Tag: noindex, nofollow`.
- [x] Cookies Supabase endurecidas con helper `hardenCookieOptions()` (`httpOnly`+`secure`+`sameSite:lax`+`path:/`).
- [x] Header `Vary: Cookie, Accept-Encoding` (previene fuga de sesiones entre usuarios en CDN).

### 7.2 Rate limiting + validación binaria — COMPLETADO
- [x] `src/lib/security/rate-limit.ts` — limiter en memoria con ventana deslizante + sweep automático.
- [x] `src/lib/security/file-validation.ts` — validación por magic bytes (PNG/JPEG/WEBP/HEIC/AVIF/PDF/GIF).
- [x] Aplicado a `POST /api/mensajes/attach` (20/min), `POST /api/admin/avatar/upload` (10/h), `POST /api/admin/recursos/upload` (30/h).
- [x] CSV injection protection en `/api/admin/facturacion/export` (prefijo `'` si empieza por `=+-@\t\r`).

### 7.3 Performance DB — COMPLETADO
- [x] Migración `0026_performance_indexes` aplicada en producción.
- [x] 8 índices compuestos verificados (16 kB cada uno en media).
- [x] `ANALYZE` ejecutado en citas, pagos, profiles, mensajes, mensajes_adjuntos, stripe_events.

### 7.4 Performance frontend — COMPLETADO
- [x] Material Symbols self-hosted subset (3.8 MB → 6.4 KB · 99.8% reducción).
- [x] Supabase browser client singleton (una WS Realtime por pestaña).
- [x] `content-visibility: auto` en secciones below-the-fold.
- [x] `preconnect` + `dns-prefetch` de Supabase, Stripe y Vercel.
- [x] Lazy-load de `zxcvbn` (OTP page: 548 kB → 157 kB).
- [x] `framer-motion` ya sólo en mobile drawer con `dynamic({ ssr: false })`.
- [x] `vercel.json` con región `fra1` + `Cache-Control` inmutable en `/fonts`, `/images`, `/_next/static`.

### 7.5 Repo + Vercel — COMPLETADO
- [x] Renombrada rama Git `FRONTEND` → `frontend` (remoto + local).
- [x] GitHub Default Branch = `frontend`.
- [x] Vercel Root Directory corregido `FRONTEND` → `frontend` (case-sensitive).
- [x] Build de producción verde desde rama `frontend`.

### 7.6 Advisors Supabase (estado tras la ronda)
- Security advisors: 1 WARN restante (`auth_leaked_password_protection` — requiere Supabase Pro · aceptado).
- Performance advisors: solo INFO (unindexed foreign keys en tablas de baja escritura · impacto despreciable).

---

## 8) Fases no-dominio ejecutadas (22-abr-2026)

> Ejecutadas en el orden pedido por el cliente: "todo por fases, lo del dominio al final".

### 8.1 FASE 1 — UX admin cifrada (COMPLETADO)
- [x] **1.1 Edición inline de campos sensibles** — nuevo `EditableSensitiveField` aplicado a DNI, teléfono, email, dirección, contacto emergencia, alergias, medicación y objetivos. Guarda vía `actualizarPacienteSensiblesAction` → RPC `paciente_actualizar_cifrado`.
- [x] **1.2 Nota post-sesión cifrada desde admin** — nuevo `NotaSesionAdminEditor` integrado en el timeline de la ficha. Guardado con `nota_cita_guardar_cifrada`; lectura on-demand con `registro_clinico_descifrar` y justificación `lectura_nota_admin`.
- [x] **1.3 Búsqueda blind index en `/admin/pacientes`** — detección automática de patrones (DNI / email / teléfono) y lookup vía `paciente_buscar_por_campo`; combinada con el match por `profiles.display_name/email` existente (OR sobre `user_id` e `id`).

### 8.2 FASE 2 — Cleanup y build (COMPLETADO)
- [x] **2.1 Legacy `services/payments` + `components/payments` eliminados** — la ruta pública `/pagos` redirige a `/citas/nueva` (que usa `PaymentElement` embebido). Elimina la dependencia del backend FastAPI para el flujo de pago.
- [x] **2.2 Build de producción limpio** — `npm run build` OK, 42 páginas generadas, 0 errores de tipo, único warn residual: `<img>` en `ChatPanel` con Signed URLs de Storage (decisión consciente, no optimizable por `next/image`).

### 8.3 FASE 3 — Observabilidad y healthcheck (COMPLETADO)
- [x] **3.1 Edge Function `health`** — `supabase/functions/health/index.ts` + entrada en `config.toml` con `verify_jwt=false`. Verifica conectividad DB (`horario_plantillas` head-only) y `public.app_encryption_ready()` (vault). Devuelve `200 healthy` / `200 degraded` / `503 down` con metadatos mínimos (sin PII).
- [x] **3.2 Runbook de alertas operativas** — `docs/05_operations/ALERTAS_OPERATIVAS.md`. Incluye 7 reglas Sentry (Stripe webhook, PaymentIntent, invoice PDF, RGPD, cifrado clínico, client errors, EF genérica), flujo de pago fallido (email paciente + admin), Resend webhook (bounce/complaint), monitores externos y matriz de responsabilidad.

### 8.4 FASE 4 — Seeds demo (COMPLETADO, pendiente ejecutar)
- [x] **Script idempotente** `supabase/migrations/0028_retirar_seed_demo.sql`. Borra en orden seguro: mensajes + adjuntos, notas de cita, historial sesiones, factura_nota, emails_log, pagos, citas, bonos, recurso_asignaciones, diagnósticos/medicación/adjuntos, admin_lookups, preferencias, paciente, profile y `auth.users` del demo (`usuario@visualizacion.com`).
- [ ] **Ejecutar** en Supabase SQL Editor tras crear el usuario real y antes de exponer el dominio.

### 8.5 FASE 5 — Documentación (COMPLETADO)
- [x] `ROADMAP.md` — migraciones 0027/0028 y Edge Function health marcadas; items UX de admin marcados como hechos.
- [x] `PENDIENTES_Y_CHECKLIST.md` (este documento) — reflejado lo ejecutado en §5.1 y §6.

### 8.6 FASE FINAL — pospuesta explícitamente (DOMINIO)
> Todo lo siguiente depende de decisiones/compra del dominio `amclinicapsicologia.es` y se ejecuta como última fase.

- [ ] Comprar `amclinicapsicologia.es` y apuntar DNS a Vercel.
- [ ] Añadir dominio en Vercel + **Supabase Auth → URL configuration / redirect URLs**.
- [ ] Buzón `contacto@amclinicapsicologia.es` + `FACTURA_EMISOR_EMAIL` + `RESEND_FROM_EMAIL` con remitente del dominio.
- [ ] `FRONTEND_URL` en Edge Secrets = `https://amclinicapsicologia.es`.
- [ ] Verificar dominio en Resend (SPF/DKIM/DMARC) y activar webhook bounce/complaint.
- [ ] Migrar cuenta Stripe a modo Live + rotar `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`.
- [ ] Ejecutar `0028_retirar_seed_demo.sql`.
- [ ] Activar las 7 reglas de Sentry documentadas en `ALERTAS_OPERATIVAS.md`.
- [ ] Crear monitor UptimeRobot contra `/functions/v1/health`.
- [ ] Rotar passwords (Outlook, Supabase, Vercel, Stripe) + invalidar tokens antiguos.

---

## 9) Hito 14 — Limpieza final y unificación arquitectónica (22-abr-2026)

> Revisión meticulosa "senior lead" del proyecto completo. Objetivo: base de código limpia, una única fuente de verdad, sin dependencias zombis.

### 9.1 Eliminado del repositorio (117.56 MB liberados)
- [x] **`backend/`** — directorio FastAPI stand-by completo (46 archivos Python, `alembic.ini`, `dockerfile`, `requirements.txt`, `venv/`, `uploads/`, seeds, scripts).
- [x] **`frontend/src/services/citas.ts`** + **`frontend/src/types/citas.ts`** — cliente axios que apuntaba al FastAPI ya eliminado.
- [x] **`frontend/src/app/api/admin/config/backup-keys/route.ts`** — endpoint huérfano sin consumidores.
- [x] **`frontend/src/app/api/admin/facturacion/nota-administrativa/route.ts`** + **`frontend/src/components/admin/AdminNotaAdministrativaSticker.tsx`** — feature dependiente del FastAPI.
- [x] **`frontend/scripts/update-imports.js`** — script de refactor obsoleto que sólo referenciaba al sticker eliminado.
- [x] **`supabase/functions/.bundled/`** + **`**/__pycache__/`** — cachés de build (y confirmado que `.gitignore` los cubre).

### 9.2 Iconografía Material Symbols — cobertura completa
- [x] **`frontend/scripts/extract-icons.mjs`** reescrito con 8 regex (incluye JSX multilínea, ternarios, `icon="…"`, `icon: "…"`, `data-icon`, `metodoIcon/action.icon/iconFor/trendIcon`, `return 'icono'`) + `BLACKLIST` de palabras falsas.
- [x] Subset regenerado vía `fetch-icons-font.mjs`: **202 glyphs** (antes 181) en **18.1 KB WOFF2**. 0 iconos faltantes.

### 9.3 Auto-registro paciente público — migrado a Supabase Auth (sin FastAPI)
- [x] **Migración SQL `0029_paciente_autoregistro.sql`**: RPC `public.paciente_autoregistro_cifrada(p_nombre_completo, p_dni_nie, p_telefono, p_email, p_fecha_nacimiento, p_direccion, p_contacto_emergencia_*, p_alergias, p_medicacion_base, p_objetivos, p_motivo_consulta_inicial, p_experiencia_terapia, p_consentimiento_rgpd)`. SECURITY DEFINER, exige `auth.uid()` del propio usuario, idempotente, cifra PII con `app_encrypt` + `app_bidx`. `grant execute` solo a `authenticated`.
- [x] **`services/auth/registerActions.ts`** reescrito con 3 acciones:
  - `startRegistrationAction`: valida datos clínicos, guarda en cookies `httpOnly` (TTL 15 min) + `signInWithOtp({ shouldCreateUser: true })` → email con OTP + usuario en `auth.users`.
  - `verifyOtpAction`: `verifyOtp(type:'email')` + `updateUser({ password })` + RPC `paciente_autoregistro_cifrada` + limpia cookies → redirige a `/portal` (o `/portal/citas/reservar` si venía con plan preseleccionado).
  - `resendOtpAction`: reintentar envío del código si el paciente no lo recibió.
- [x] **`RegistroPacienteClient.tsx`**: añadidos `textarea` para `medicacion_base` (recomendado, psiquiatría) y `alergias` (opcional). Eliminado `PasswordInput` (ahora se define en el paso 2). CTA: "Enviarme código de verificación".
- [x] **`VerificarOtpClient.tsx`**: paso 2 con password ≥14 chars + complejidad + reenvío de OTP.

### 9.4 Flujos revisados y verificados OK (sin bugs)
- [x] **Reserva de horas (`/portal/citas/reservar`)** — `SlotPicker` → `getDisponibilidadAction` → RPC `obtener_disponibilidad` → selección → `reservarCitaAction` → RPC `reservar_cita` + (si no hay bono) `PaymentElementDrawer` con `crearPaymentIntentCitaAction`. 100% Supabase, sin FastAPI.
- [x] **Upload foto perfil** — `AvatarUploader` + `/api/admin/avatar/upload`: rate-limit 10/h, `validateImageMagicBytes`, bucket `avatares` con RLS por `user_id`. Admin y paciente.
- [x] **Pagos** — Payment Element embebido + Edge Function `stripe-webhook v19` con idempotencia en `pagos.stripe_event_id UNIQUE` + `stripe_events` audit.

### 9.5 Documentación y `.env`/`.cursorrules`
- [x] **`frontend/.env.example`** — eliminadas `NEXT_PUBLIC_API_URL` y `NEXT_PUBLIC_BACKEND_API_URL` (apuntaban a FastAPI).
- [x] **`.gitignore`** — sección Python generalizada (`**/venv/`, `**/.venv/`) tras eliminar `backend/`.
- [x] **`.cursorrules`** — sección "Monorepo boundary" reescrita: ya no habla de FastAPI sino de Supabase como único backend. Sección "Backend excellence" reescrita con reglas de RLS, cifrado vía `app_encrypt`, convenciones de migraciones, auditoría `admin_lookups`.
- [x] **`README.md`** — árbol monorepo actualizado (sin `backend/`), aviso de hito 14 arriba, flujo de auto-registro OTP documentado, tabla de migraciones con 0027/0028/0029.
- [x] **Este checklist** — §3.2 marca el backend como eliminado + §9 documenta todo el hito.

---

## 10) Hito 14 · Test E2E definitivo (22-abr-2026 · pre go-live)

> Simulación completa del recorrido real: paciente nuevo ⇒ autoregistro ⇒ reserva ⇒
> pago/bono ⇒ admin (Almudena) consulta/edita/cifra/cancela. Ejecutado directamente
> contra el proyecto Supabase de producción con JWT sintético.

### 10.1 Bugs críticos DETECTADOS y corregidos en este hito

| # | Migración | Problema | Impacto |
|---|-----------|----------|---------|
| 1 | `0030_fix_reservar_cita_ambiguity` | `RETURN TABLE(..., estado cita_estado, ...)` de `reservar_cita` colisionaba con `bonos_pacientes.estado` en PL/pgSQL ⇒ error 42702 "column reference estado is ambiguous". | 100% reservas fallaban. |
| 2 | `0031_fix_admin_lookups_campo_check` | `paciente_ficha_sensibles_bulk` escribía `campo='acceso_ficha_completa'` pero el CHECK de `admin_lookups.campo` no lo permitía ⇒ 23514. | Cada apertura de ficha admin reventaba. |
| 3 | `0032_fix_registro_clinico_descifrar` | `CASE (p_tabla, p_campo) WHEN (...)` rompía con 42804 "cannot compare text and unknown". | Admin no podía leer notas, DX ni medicación cifradas. |
| 4 | `0033_extend_admin_lookups_campo_check_clinical` | Faltaban los valores `paciente_*.*` y `citas_notas_paciente.contenido` en el CHECK del audit. | Lectura de registro clínico cifrado rompía en auditoría. |
| 5 | `0034_fix_rgpd_plaintext_leak` | Las 3 RPCs de cifrado (`diagnostico_crear_cifrado`, `medicacion_crear_cifrada`, `nota_cita_guardar_cifrada`) insertaban TAMBIÉN el plaintext en las columnas legacy. Además RLS permitía al paciente SELECT directo de DX/medicación y de notas de sesión del terapeuta. | **Leak RGPD grave**: datos clínicos en claro + paciente podía leer notas de su terapeuta. |
| 6 | `0035_nota_cita_upsert_admin` | `nota_cita_guardar_cifrada` hacía siempre INSERT ⇒ notas duplicadas al editar. | Cada "guardar" en el editor creaba una fila nueva. |
| 7 | `0036_paciente_dx_med_bulk_descifrar` | (Complemento de 0034). Nuevo RPC admin que devuelve DX+medicación descifrados en 1 llamada con 1 sola entrada de auditoría (`bulk_export / ficha_admin_ui_dx_med`). | UI `/admin/pacientes/[id]` vuelve a ver títulos y notas clínicas tras eliminar plaintext. |

### 10.2 Flujos verificados end-to-end (✅ todos OK tras fixes)

- [x] **Autoregistro paciente** — `signInWithOtp` → `verifyOtp` → `paciente_autoregistro_cifrada` (idempotente). Ficha crea con PII cifrada (ct ≥ 100B por campo) y blind index HMAC (12 hex chars).
- [x] **Disponibilidad** — `obtener_disponibilidad('Europe/Madrid')` devuelve 17 slots/día laborable (L–V 9–20h, V 9–18h). Bloqueos `agenda_bloqueos` y citas existentes se descuentan.
- [x] **Reserva sin bono** — `reservar_cita` crea cita `bloqueo_temporal` + libera slot en caso de `slot_ocupado` (23505) correcto.
- [x] **Pago con Stripe** — `procesar_pago_stripe(event_id, ...)` con idempotencia por `stripe_event_id UNIQUE`. Cita pasa a `confirmada`. Reintento devuelve `ya_procesado=true`.
- [x] **Compra de bono** — `procesar_pago_stripe(bono_config_id=...)` crea `bonos_pacientes` activo + fecha_expiración calculada.
- [x] **Reserva con bono** — `reservar_cita` detecta bono activo → cita `confirmada` directa sin checkout + `sesiones_consumidas +1`.
- [x] **Admin busca paciente** — `paciente_buscar_por_campo('dni_nie'/'email'/'telefono')` devuelve `paciente_id` vía blind index.
- [x] **Admin revela PII** — `paciente_revelar_campo` devuelve plaintext + registra en `admin_lookups`.
- [x] **Admin ficha completa** — `paciente_ficha_sensibles_bulk` devuelve JSON con 12 campos descifrados + 1 audit entry.
- [x] **Admin edita PII** — `paciente_actualizar_cifrado(jsonb)` reencripta y recalcula blind index (lookup por valor antiguo ⇒ NULL, por nuevo ⇒ `paciente_id`).
- [x] **Admin guarda nota de sesión (cifrada)** — `nota_cita_guardar_cifrada` (UPSERT). Ciphertext ≥ 120B, plaintext siempre NULL.
- [x] **Admin lee nota cifrada** — `registro_clinico_descifrar('citas_notas_paciente', ...)` descifra y registra audit.
- [x] **Admin crea diagnóstico + medicación** cifrados. Plaintext columns = NULL. Audit bulk en 1 entry vía `paciente_dx_med_bulk_descifrar`.
- [x] **Admin cancela cita con bono** — `cancelar_cita` restaura `sesiones_consumidas -= 1`. Slot disponible otra vez.
- [x] **Admin cancela cita pagada con tarjeta** — `cancelar_cita` devuelve `needs_stripe_refund=true, stripe_payment_intent, importe_centimos` para que la Edge Function orqueste el refund.
- [x] **Paciente re-reserva mismo slot cancelado** — OK, slot libre. Reutiliza bono si lo tiene.

### 10.3 RLS verificado bajo `SET ROLE authenticated`

| Recurso | Paciente propietario | Paciente ajeno | Admin |
|---------|----------------------|----------------|-------|
| `pacientes` (ficha propia) | ✅ 1 fila | ❌ 0 filas | ✅ todas |
| `citas` / `pagos` / `bonos_pacientes` propios | ✅ | ❌ | ✅ todas |
| `paciente_diagnosticos` | ❌ (solo RPC admin) | ❌ | ✅ |
| `paciente_medicacion` | ❌ (solo RPC admin) | ❌ | ✅ |
| `citas_notas_paciente` (propias, autor=self) | ✅ solo las que ha escrito el propio paciente | ❌ | ✅ todas |
| Notas de sesión del terapeuta (autor=admin) | ❌ (no visibles al paciente) | ❌ | ✅ |

### 10.4 Migraciones finales aplicadas en producción en este hito

```
0030_fix_reservar_cita_ambiguity.sql
0031_fix_admin_lookups_campo_check.sql
0032_fix_registro_clinico_descifrar.sql
0033_extend_admin_lookups_campo_check_clinical.sql
0034_fix_rgpd_plaintext_leak.sql
0035_nota_cita_upsert_admin.sql
0036_paciente_dx_med_bulk_descifrar.sql
```

### 10.5 Checks de ingeniería

- [x] `npx tsc --noEmit` → **0 errors**
- [x] `npm run build` → ✅ (49 rutas generadas, middleware 86.5 kB, first-load shared 155 kB).
- [x] Cleanup de test data completado (auth.users, profile, paciente, citas, pagos, bonos, DX, medicación, notas, admin_lookups). Sin residuos.
- [x] Ningún Edge Function escribe en columnas plaintext clínicas (`rg contenido|titulo|descripcion|notas:` en `supabase/functions/` solo devuelve campos de servicio/bono descripción no clínicos).

---

## 11) Hito 15 — Hardening post-launch (22-abr-2026 · mejoras recomendadas)

> Ejecutado como cierre técnico tras el test E2E definitivo del Hito 14.
> Objetivo: blindar calidad, accesibilidad y observabilidad sin romper la entrega.

### 11.1 Entregables

| # | Mejora | Estado | Artefactos |
|---|--------|--------|------------|
| 1 | **Cifrado chat (`mensajes.body`)** | ✅ en producción | `0037_chat_cifrado.sql` — backfill seguro + vista `v_mensajes_chat` (security_invoker) + `chat_enviar_mensaje` cifra con `app_encrypt` + nuevo `chat_descifrar_mensaje(uuid)` para realtime. |
| 2 | **Rate limit distribuido (Upstash Redis)** | ✅ código listo · secrets pendientes | `frontend/src/lib/security/rate-limit.ts` reescrito con `@upstash/ratelimit` sliding-window + fallback in-memory. `enforceRateLimit` ahora `async`. |
| 3 | **Playwright E2E (4 flujos oro)** | ✅ specs listos | `frontend/e2e/{smoke,registro-otp,reserva,pago-tarjeta,chat}.spec.ts` + `fixtures.ts` + `playwright.config.ts`. Scripts `npm run test:e2e*`. |
| 4 | **axe-core a11y (WCAG 2.2 AA)** | ✅ spec listo | `frontend/e2e/a11y.spec.ts` cubre home, login, reserva y admin dashboard con `@axe-core/playwright`. |
| 5 | **LCP hero** | ✅ auditado | `HeroImage` ya en óptimo: `priority` + `fetchPriority="high"` + AVIF q78 + `sizes` calibrado por breakpoint + sin JS (Framer fuera). Queda sólo medir en campo con Vercel Speed Insights / PageSpeed. |
| 6 | **Click-through manual** | ✅ guía | `docs/05_operations/TESTING_CHECKLIST.md` §4 (automáticos) y §4B (post-hardening) preparados para Almudena. |

### 11.2 Ficheros nuevos / modificados (resumen)

```
supabase/migrations/0037_chat_cifrado.sql                    (nuevo)
frontend/playwright.config.ts                                (nuevo)
frontend/e2e/fixtures.ts                                     (nuevo)
frontend/e2e/smoke.spec.ts                                   (nuevo)
frontend/e2e/registro-otp.spec.ts                            (nuevo)
frontend/e2e/reserva.spec.ts                                 (nuevo)
frontend/e2e/pago-tarjeta.spec.ts                            (nuevo)
frontend/e2e/chat.spec.ts                                    (nuevo)
frontend/e2e/a11y.spec.ts                                    (nuevo)
frontend/src/lib/security/rate-limit.ts                      (reescrito)
frontend/src/lib/supabase/types.ts                           (+ v_mensajes_chat, chat_descifrar_mensaje, Mensaje.body)
frontend/src/services/mensajes/actions.ts                    (ajuste SendOk.body)
frontend/src/services/mensajes/fetch-adjuntos.ts             (body en vez de body_ciphertext)
frontend/src/components/chat/ChatPanel.tsx                   (optimistic + realtime descifra)
frontend/src/app/portal/mensajes/page.tsx                    (v_mensajes_chat)
frontend/src/app/admin/mensajes/[id]/page.tsx                (v_mensajes_chat)
frontend/src/app/portal/page.tsx                             (último mensaje del dashboard)
frontend/src/app/api/admin/avatar/upload/route.ts            (await enforceRateLimit)
frontend/src/app/api/admin/recursos/upload/route.ts          (await enforceRateLimit)
frontend/src/app/api/mensajes/attach/route.ts                (await enforceRateLimit)
frontend/package.json                                        (+@upstash/redis,ratelimit,@playwright/test,@axe-core/playwright + scripts)
frontend/.env.example                                        (+UPSTASH_* + PLAYWRIGHT_*)
.gitignore                                                   (+ e2e artifacts)
docs/05_operations/TESTING_CHECKLIST.md                      (§4 + §4B)
docs/00_project_control/PENDIENTES_Y_CHECKLIST.md            (este bloque)
docs/02_reports/INFORME_HITO_15_POST_LAUNCH.md               (nuevo informe)
```

### 11.3 Secrets nuevos que hay que rellenar en Vercel antes de activar el rate-limit distribuido

- [ ] `UPSTASH_REDIS_REST_URL` (Production/Preview) — dominio HTTPS del Redis Upstash.
- [ ] `UPSTASH_REDIS_REST_TOKEN` (Production/Preview) — token de sólo REST.

Sin estas variables el módulo cae automáticamente al *rate limiter in-memory* (el mismo que lleva en producción toda la semana), por lo que no bloquea el go-live.

### 11.4 Checks de ingeniería

- [x] `npx tsc --noEmit` → **0 errors**.
- [x] `npm run build` → ✅ (49 rutas, middleware 86.5 kB, first-load shared 155 kB — sin regresión frente a Hito 14).
- [x] Solo 1 warning ESLint restante (`<img>` en `ChatPanel.tsx:458`, adjuntos dinámicos — justificado, no se puede usar `next/image` sin `width/height` fijos).
- [x] Migración `0037` compatible con contenido mixto (plaintext legacy + ciphertext nuevo) gracias al helper `_app_try_decrypt`.
- [x] Realtime del chat probado a nivel de contrato: `chat_enviar_mensaje` devuelve `body` plaintext al autor; `chat_descifrar_mensaje` sirve al receptor vía canal `postgres_changes`.
