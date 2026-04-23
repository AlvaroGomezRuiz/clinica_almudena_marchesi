# Sentry — runbook de observabilidad

> **Principio rector**: Sentry existe para saber cuándo algo se rompe **sin ver datos de pacientes**. Cualquier cambio que abra la puerta a PII en eventos debe pasar revisión.

---

## 1. Arquitectura

```
┌─────────────────────────────┐        ┌──────────────────────────────┐
│  Next.js (Vercel)           │        │  Supabase Edge Functions     │
│                             │        │  (Deno runtime)              │
│  - sentry.client.config.ts  │        │                              │
│  - sentry.server.config.ts  │        │  - _shared/sentry.ts         │
│  - sentry.edge.config.ts    │        │    (HTTP envelope directo)   │
│  - instrumentation.ts       │        │                              │
│  - global-error.tsx         │        │  Instrumentado:              │
│  - /sentry-check route      │        │  - stripe-webhook            │
│                             │        │  - stripe-payment-intent     │
│  Tunnel: /monitoring        │        │  - invoice-pdf               │
│  (evita ad-blockers)        │        │  - rgpd-request              │
└──────────────┬──────────────┘        └──────────────┬───────────────┘
               │                                      │
               └────────────── HTTPS ─────────────────┘
                              ▼
                ┌─────────────────────────────┐
                │  Sentry SaaS (EU Frankfurt) │
                │  o4511259694465024          │
                └─────────────────────────────┘
```

- **Región del dato**: EU (Frankfurt). Obligatorio para datos sanitarios.
- **Tres runtimes distintos** del frontend (client / server / edge) + wrapper custom para Deno.
- **Un solo proyecto Sentry** hasta llegar a 50+ pacientes reales. Después escalar a tres proyectos.

---

## 2. Variables de entorno

### Vercel → Settings → Environment Variables

| Variable | Production | Preview | Development | Notas |
|---|---|---|---|---|
| `NEXT_PUBLIC_SENTRY_DSN` | ✅ | ✅ | ⬜ | El mismo DSN en prod y preview. Vacío en local. |
| `SENTRY_DSN` | ✅ | ✅ | ⬜ | Idéntico al anterior; usado server-side. |
| `SENTRY_ORG` | ✅ | ✅ | ⬜ | Ej: `clinica-almudena`. |
| `SENTRY_PROJECT` | ✅ | ✅ | ⬜ | Ej: `almudena-frontend`. |
| `SENTRY_AUTH_TOKEN` | ✅ | ✅ | ⬜ | Genera uno con scope `project:releases` en Sentry → User auth tokens. **Nunca lo pongas en `.env.local`**. |
| `SENTRY_CHECK_TOKEN` | ✅ | ✅ | ⬜ | Token aleatorio (`openssl rand -hex 16`) para proteger `/sentry-check`. |

### Supabase Edge Functions → Dashboard → Edge Functions → Secrets

| Variable | Valor |
|---|---|
| `SENTRY_DSN` | Mismo DSN que frontend |

**No hace falta `SENTRY_AUTH_TOKEN` en Supabase** — el wrapper Deno solo envía eventos, no sube source maps.

---

## 3. Qué capturamos y qué NO

### ✅ Capturamos
- Errores no manejados en server actions, API routes, RSC.
- Errores de render React (vía `global-error.tsx`).
- Fallos en webhooks Stripe (cada `event.type` como fingerprint separado).
- Fallos en generación de factura PDF.
- Fallos en exportación RGPD.
- Fallos en creación de PaymentIntent.
- Mensajes informativos de inconsistencias (p. ej. `pago completado sin numero_factura`).

### ❌ NO capturamos
- IP del usuario (`sendDefaultPii: false`).
- User-agent.
- Cookies ni tokens.
- `Authorization` / `stripe-signature` / `svix-signature` headers.
- Body de requests (redactado globalmente en `beforeSend`).
- Query strings completos (se trunca la URL al pathname).
- Email del usuario (si algún código hace `Sentry.setUser({email: ...})`, el `beforeSend` lo elimina).
- Errores de extensiones del navegador (Chrome, Firefox, Safari).
- Ruido típico del browser (`ResizeObserver`, `NetworkError`, `ChunkLoadError`).

---

## 4. Tags consistentes

Todo evento emitido mediante nuestros helpers lleva estos tags:

| Tag | Valor | Uso |
|---|---|---|
| `area` | `auth` \| `booking` \| `payments` \| `stripe-webhook` \| `invoice-pdf` \| `rgpd` \| `chat` \| `storage` \| `admin-sensitive` \| `edge-function` | Agrupar y filtrar en Sentry. |
| `operation` | String libre (`datos_factura_rpc`, `render_pdf`, `healthcheck`) | Sub-categoría dentro del área. |
| `patient_id` | UUID opaco | Trazabilidad sin PII. |
| `entity_id` | UUID opaco (pago, cita, mensaje) | Correlación con logs de Supabase. |
| `runtime` (Edge) | `deno` | Distinguir EF de Node. |
| `event_type` (Stripe) | `checkout.session.completed`, `payment_intent.succeeded`, ... | Agrupar fallos por tipo de evento. |

---

## 5. Cómo disparar un evento de prueba

### Frontend
1. En Vercel configura `SENTRY_CHECK_TOKEN=<hex>`.
2. Abre `https://tu-dominio/sentry-check?token=<hex>`.
3. Respuesta `{status: "ok"}`.
4. En Sentry → Issues → verás `SentryHealthcheckError` en ~30 s.

### Edge Functions
Desde un cliente autenticado, invoca cualquier EF con payload inválido y observa Sentry.

Alternativa manual vía curl:
```bash
curl -X POST https://<project>.supabase.co/functions/v1/invoice-pdf \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"pago_id":"not-a-uuid"}'
```
Debe devolver 400 **y NO** generar evento Sentry (errores 4xx esperados no se capturan).

Para disparar uno real, usa un `pago_id` que sí exista pero sin permiso del usuario: genera un 403 silencioso sin Sentry. Si quieres un 500, invoca con un pago que tenga datos corruptos.

---

## 6. Alertas recomendadas

Configúralas en Sentry → Alerts → Create alert.

| Nombre | Condición | Destino | Criticidad |
|---|---|---|---|
| **Stripe webhook fallando** | `area:stripe-webhook AND event.level:error` → 1 evento en 5 min | Email Almudena + Álvaro | 🔴 Crítico |
| **Invoice PDF roto** | `area:invoice-pdf AND event.level:error` → 3 eventos en 10 min | Email Almudena + Álvaro | 🔴 Crítico |
| **Cualquier EF con >5 errores/min** | `tags.runtime:deno` → 5 eventos en 1 min | Email Álvaro | 🟠 Grave |
| **RGPD export roto** | `area:rgpd` → 1 evento en 24h | Email Almudena + Álvaro | 🟠 Grave |
| **Error en client** | `platform:javascript AND environment:production` → 50 eventos en 10 min | Email Álvaro | 🟡 Atención |

---

## 7. Source maps

- Los source maps se generan durante `next build`.
- Si `SENTRY_AUTH_TOKEN` está configurado, se **suben** a Sentry en el build.
- Después de subirlos, **se borran automáticamente** (`deleteSourcemapsAfterUpload: true`) → no quedan expuestos en el dominio público.
- Si no hay `AUTH_TOKEN`, los source maps se generan pero no se suben ni se borran. Sentry mostrará stacktraces minificados. Usable pero menos legible.

Para rotar el token: Sentry → Settings → Account → User auth tokens → Create new → scope `project:releases`.

---

## 8. Checklist de privacidad (revisión periódica)

Cada 3 meses, verificar manualmente en Sentry una muestra de 10 eventos:

- [ ] Ningún evento contiene email en `event.user.email`.
- [ ] Ninguna URL contiene query strings (`?id=...`, `?token=...`).
- [ ] Ningún breadcrumb contiene request/response body.
- [ ] Ningún mensaje de error literal incluye DNI, nombre, diagnóstico.
- [ ] Los errores de `chat_enviar_mensaje` no incluyen el contenido del mensaje.

Si algo se filtra, extender `beforeSend` en el config correspondiente.

---

## 9. Runbook: "me llega alerta de Sentry, ¿qué hago?"

1. Abre la issue en Sentry → lee tags `area`, `event_type`, `entity_id`.
2. Usa `entity_id` para buscar en logs de Supabase:
   - Dashboard Supabase → Logs → Edge Functions → filtra por request id / timestamp.
   - Dashboard Supabase → SQL Editor → `select * from pagos where id = '<entity_id>'` (u otra tabla).
3. Revisa el breadcrumb `fetch` / `supabase` justo antes del error.
4. Reproduce en staging con el mismo payload.
5. Si es crítico (Stripe, invoice) → parche rápido en rama `hotfix/...`, merge, deploy.
6. Marca la issue como **Resolved in commit <sha>** en Sentry para que te avise si reaparece.

---

## 10. Cambios en el futuro

**Prohibido**:
- Activar `sendDefaultPii: true`.
- Subir `tracesSampleRate` a más de `0.2` sin revisar impacto de quota y privacidad.
- Activar `replaysSessionSampleRate > 0` sin configurar **también** `maskAllText: true` + auditoría en staging con datos reales.
- Meter `email`, `display_name`, `dni`, `dni_paciente`, `tipo_diagnostico`, `contenido_mensaje`, `nota_clinica` como tag ni como extra.

**Permitido**:
- Añadir nuevas áreas (`ClinicalArea` en `lib/sentry.ts` y `EdgeArea` en `_shared/sentry.ts`).
- Añadir nuevos `event_type` si son enum cerrado (no texto libre).
- Ajustar `ignoreErrors` cuando aparezcan falsos positivos nuevos.
