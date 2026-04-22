# Pendientes & checklist operativo (fuente de verdad)

> Este documento reemplaza "lo que quedó en el chat". Se actualiza en cada hito.
> **Regla**: nada de secretos en claro aquí (solo nombres de variables y pasos).

Última actualización: migraciones 0012-0024b aplicadas + Edge Functions F5 desplegadas + cifrado cliente migrado + Payment Element embebido + webhook Stripe verificado (200 OK en sandbox).

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

### 3.2 Backend FastAPI
**Decisión**: no se despliega FastAPI. Todo el backend vive en Supabase (Postgres + Edge Functions). Variable no aplicable.

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
- [ ] `/admin/pacientes/[id]` edit inline de campos sensibles → usar `actualizarPacienteSensiblesAction(id, {campo: valor})`.
- [ ] UI para que admin escriba nota post-sesión vía `nota_cita_guardar_cifrada` (ahora mismo sólo escribe el paciente).
- [ ] Búsqueda en `/admin/pacientes` por email/DNI/teléfono usando `buscarPacientePorCampoAction` (blind index).

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
