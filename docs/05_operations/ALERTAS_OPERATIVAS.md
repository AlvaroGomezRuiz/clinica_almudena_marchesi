# Alertas operativas — Clínica Almudena Marchesi

> **Objetivo**: que ningún fallo crítico (pago, email, webhook, disponibilidad) pase desapercibido más de 5 minutos, sin añadir ruido ni exponer PII.

Este documento complementa [`SENTRY.md`](./SENTRY.md) y describe:

1. Alertas Sentry (código técnico).
2. Alertas operativas (Stripe → email al paciente / admin).
3. Monitores externos (uptime, healthcheck, rate limits).
4. Matriz de responsabilidad (quién debe actuar).

---

## 1. Alertas Sentry

La configuración técnica (tags, ignoreErrors, source maps, etc.) está en [`SENTRY.md`](./SENTRY.md). Para el go-live se dejan **configuradas y activas** al menos estas 5 reglas en `Sentry → Alerts → Create alert`:

| # | Nombre | Condición | Ventana | Umbral | Destino | Criticidad |
|---|---|---|---|---|---|---|
| 1 | **Stripe webhook fallando** | `tags.area = stripe-webhook AND level = error` | 5 min | `≥ 1 evento` | Email Almudena + Álvaro | 🔴 Crítico |
| 2 | **PaymentIntent creación falla** | `tags.area = payments AND tags.operation = create_payment_intent` | 15 min | `≥ 3 eventos` | Email Álvaro | 🔴 Crítico |
| 3 | **Invoice PDF roto** | `tags.area = invoice-pdf AND level = error` | 10 min | `≥ 3 eventos` | Email Álvaro | 🔴 Crítico |
| 4 | **Error rate global (client)** | `platform = javascript AND environment = production` | 10 min | `≥ 50 eventos` | Email Álvaro | 🟠 Grave |
| 5 | **RGPD export roto** | `tags.area = rgpd AND level = error` | 24 h | `≥ 1 evento` | Email Almudena + Álvaro | 🟠 Grave |
| 6 | **Cifrado clínico falla** | `tags.area = admin-sensitive AND level = error` | 5 min | `≥ 1 evento` | Email Álvaro | 🔴 Crítico |
| 7 | **Cualquier Edge Function >5 err/min** | `tags.runtime = deno` | 1 min | `≥ 5 eventos` | Email Álvaro | 🟠 Grave |

Estas reglas viven en Sentry (no en código). Documentadas aquí para que al rotar la cuenta se puedan recrear idénticas.

---

## 2. Alertas operativas (Stripe)

### 2.1 Pago fallido → email al paciente

**Trigger**: webhook Stripe recibe `payment_intent.payment_failed` o `checkout.session.async_payment_failed`.

**Flujo actual** (`supabase/functions/stripe-webhook/index.ts`):

1. Se marca `pagos.estado = 'fallido'` en la transacción correspondiente.
2. La cita asociada queda **sin confirmar** (estado `pendiente_pago`).
3. Se dispara email `pago_fallido` al paciente (template Resend) con CTA "Reintentar pago" apuntando a `/portal/pagos`.
4. Si `estado = 'fallido'` persiste >24 h: trigger de limpieza libera el slot de la cita (RPC `liberar_cita_pago_fallido`).

**Checklist go-live**:

- [ ] Template Resend `pago_fallido` publicado.
- [ ] Probar en staging con tarjeta `4000 0000 0000 0002` (Stripe → always declines).
- [ ] Verificar que llega el email al paciente (Resend dashboard → Logs).
- [ ] Verificar que no llega un segundo email si Stripe reintenta automáticamente (idempotencia por `stripe_events.event_id`).

### 2.2 Pago fallido → notificación a admin

Además del email al paciente, se envía un email a **Almudena** con:
- ID de la cita.
- Estado actual (`pendiente_pago`).
- Enlace profundo a `/admin/pacientes/<id>` (no a la cita, para no filtrar metadata en el email).

Esto permite seguimiento manual si el paciente no reintenta en 24 h.

---

## 3. Alertas operativas (Resend)

### 3.1 Rebote + queja → desactivar preferencia

**Trigger**: webhook Resend (`email.bounced` o `email.complained`).

**Flujo** (`supabase/functions/resend-webhook/index.ts`):

1. Valida firma Svix (HMAC-SHA256, `RESEND_WEBHOOK_SECRET`).
2. Inserta evento en `email_logs` con `estado = 'bounced' | 'complained'`.
3. Si >2 bounces consecutivos al mismo destinatario en 30 días → desactiva `notificaciones_prefs.email = false` para ese paciente.
4. Si `complained = true` una sola vez → desactiva inmediatamente (RGPD Art. 21).

**Checklist go-live**:

- [ ] Webhook Resend configurado (URL: `https://<project>.supabase.co/functions/v1/resend-webhook`, secret guardado).
- [ ] Activar eventos `email.bounced` y `email.complained` en dashboard Resend.
- [ ] Verificar con dirección test `bounce@simulator.amazonses.com` (Resend sandbox).

### 3.2 Rate limit >80 % cuota

Resend plan gratuito = 100 emails/día. Queremos alerta antes de quedarnos sin cuota.

- Monitor externo (p. ej. healthchecks.io con cron custom) llama a Resend API `GET /emails?limit=1` y extrae `X-RateLimit-Remaining` del header.
- Si `remaining < 20` → ping a Slack/Email Álvaro.
- Al escalar a plan `Pro` (50k/mes) este check pasa a mensual.

---

## 4. Uptime / healthcheck externo

### 4.1 Edge Function `health` (nueva)

Endpoint público: `GET https://<project>.supabase.co/functions/v1/health`.

Devuelve:
```json
{
  "ok": true,
  "status": "healthy",
  "checks": {
    "database": { "ok": true, "latency_ms": 42 },
    "encryption_ready": { "ok": true }
  },
  "ts": "2026-04-22T12:00:00Z"
}
```

- `database.ok` → conectividad + query trivial.
- `encryption_ready.ok` → `public.app_encryption_ready()` (vault contiene `app_encryption_key`).
- HTTP 200 si todo ok; 200 con `status: "degraded"` si solo DB; 503 si nada responde.

### 4.2 Monitor externo recomendado

| Proveedor | Plan | Notas |
|---|---|---|
| **UptimeRobot** | Free | Hasta 50 monitores, ping cada 5 min. Ideal para un proyecto pequeño. |
| **healthchecks.io** | Free | Útil para verificar que el **cron diario** se ejecutó (ping desde `cron-recordatorios-24h`). |
| **BetterStack** | Free 10 mon. | Mejor UI, incidencias, status page pública. |

**Sugerencia**: UptimeRobot con 2 monitores:
1. `https://amclinicapsicologia.es` → espera 200.
2. `https://<project>.supabase.co/functions/v1/health` → espera 200 con `"status":"healthy"` en el body.

Si el monitor 2 empieza a devolver `"status":"degraded"` durante >15 min → alerta por email.

### 4.3 Cron recordatorios → ping

Al final de `cron-recordatorios-24h` se debe hacer un `fetch` a `https://hc-ping.com/<uuid>` (healthchecks.io) para confirmar que el cron corrió. Si no llega el ping a las 08:05 (con margen 5 min), healthchecks avisa por email.

> **Pendiente**: añadir este fetch al final de la edge function después de provisionar healthchecks.io. Hoy el cron queda monitorizado solo por los logs de Supabase.

---

## 5. Matriz de responsabilidad

| Alerta | Notificación a | Acción esperada | SLA |
|---|---|---|---|
| Stripe webhook error | Álvaro (email) | Revisar Sentry → ver event_type → hotfix si rompe flujo | 1 h |
| Pago fallido paciente | Paciente (email) + Almudena (email) | Paciente: reintenta. Almudena: monitoriza 24 h. | N/A |
| Invoice PDF roto | Álvaro | Revisar Sentry → parche en `invoice-pdf` | 4 h |
| RGPD export roto | Álvaro + Almudena | Álvaro arregla. Almudena informa al titular (RGPD 1 mes máx). | 24 h |
| Email bounced/quejado | Sistema (automático) | Preferencia desactivada. Ningún humano actúa. | Instantáneo |
| Uptime `/health` degraded | Álvaro | Revisar `app_encryption_ready()` → vault. | 15 min |
| Uptime `/health` down | Álvaro + Almudena | Incident: Supabase down → status.supabase.com | 15 min |
| Cifrado clínico falla | Álvaro | **CRÍTICO**: pausar escrituras admin, revisar vault. | 5 min |

---

## 6. Checklist de activación (pre-launch)

- [ ] Desplegar edge function `health` (`supabase functions deploy health`).
- [ ] Crear monitor UptimeRobot sobre `/functions/v1/health`.
- [ ] Crear cuenta healthchecks.io, obtener UUID, añadir ping al final de `cron-recordatorios-24h`.
- [ ] Crear las 7 reglas de Sentry descritas en §1.
- [ ] Configurar destinatarios de alertas Sentry (Almudena + Álvaro).
- [ ] Configurar webhook Resend (eventos `email.bounced`, `email.complained`).
- [ ] Publicar template `pago_fallido` en Resend.
- [ ] Probar el flujo "pago fallido" con tarjeta `4000 0000 0000 0002`.
- [ ] Verificar que Almudena recibe el email de notificación admin.
- [ ] Probar el webhook Resend con `bounce@simulator.amazonses.com`.

---

## 7. Contactos

| Rol | Persona | Email | Notas |
|---|---|---|---|
| Propietaria | Almudena Marchesi Fernández | contacto@amclinicapsicologia.es *(pendiente dominio)* | Solo alertas críticas y cambios operativos. |
| Técnico | Álvaro | (configurable en `CONTACTOS.md`) | Alertas técnicas, Sentry, incidencias. |
| Hosting | Supabase | support@supabase.io | status.supabase.com |
| Pagos | Stripe | support@stripe.com | dashboard.stripe.com → Support |
| Email | Resend | support@resend.com | status.resend.com |
