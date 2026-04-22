# Roadmap de Ingenieria

> Tareas tecnicas agrupadas por horizonte temporal.
> Para bloqueos pre-launch operativos (dominio, NIF, etc.) ver `docs/00_project_control/PENDIENTES_Y_CHECKLIST.md`.

---

## Horizonte 1 — Pre-launch (bloquea go-live)

### Infraestructura
- [x] **Migracion `0026_performance_indexes` aplicada (2026-04-22)** — 8 indices compuestos + ANALYZE. Cubre citas, pagos, mensajes, mensajes_adjuntos, stripe_events, profiles.
- [x] **Migracion `0027_ficha_bulk_descifrar`** — RPC `paciente_ficha_sensibles_bulk` que descifra toda la ficha con 1 audit.
- [x] **Migracion `0028_retirar_seed_demo`** — script idempotente listo; pendiente ejecutar justo antes del go-live.
- [x] **Edge Function `health`** — verifica `app_encryption_ready()` + conectividad DB; publica en `config.toml` con `verify_jwt=false` para monitor externo.
- [ ] Rotar master `app_encryption_key` (solo si fue manipulada en dev).

### Stripe
- [ ] Migrar cuenta a modo Live.
- [ ] Rotar `STRIPE_WEBHOOK_SECRET` + `STRIPE_SECRET_KEY`.
- [ ] Confirmar 4 eventos en webhook (checkout.completed, async_payment_succeeded, payment_intent.succeeded, payment_intent.payment_failed).

### Resend
- [ ] Verificar dominio definitivo (SPF/DKIM/DMARC).
- [ ] Cambiar `RESEND_FROM_EMAIL` al dominio propio.
- [ ] Activar webhook de bounce/complaint.

### Frontend cleanup
- [x] **Consolidar `services/payments/` → `services/pagos/`** (eliminado 2026-04-22). La ruta pública `/pagos` redirige a `/citas/nueva`; el legacy llamaba al backend FastAPI deprecado.
- [x] **Consolidar `components/payments/` → `components/pagos/`** (eliminado 2026-04-22). `CheckoutButton` del flujo legacy retirado.
- [x] Google Fonts ya via `next/font` (Cormorant / Outfit / JetBrains Mono). Material Symbols self-hosted en subset local (`/public/fonts/material-symbols-subset.woff2`, 17.9 KB tras ampliar el extractor a 184 iconos).
- [x] `npm run build` con 0 errores (verificado 2026-04-22 tras consolidar pagos). Warn residual: `<img>` en `ChatPanel` para URLs Supabase Storage firmadas (no optimizable por `next/image`, decisión consciente).
- [ ] Lighthouse mobile >= 90 en rutas publicas + portal.

### Verificacion
- [ ] Activar endpoint `/sentry-check` post-deploy.
- [ ] Run `axe-core` en home + portal + admin.
- [ ] Smoke test manual del `TESTING_CHECKLIST.md`.

---

## Horizonte 2 — Primer trimestre post-launch

### UX
- [x] **Edición inline de campos sensibles en `/admin/pacientes/[id]`** — componente `EditableSensitiveField` con `actualizarPacienteSensiblesAction` (RPC `paciente_actualizar_cifrado`).
- [x] **UI admin para notas post-sesión** — componente `NotaSesionAdminEditor` expandible en el timeline de la ficha; descifrado on-demand vía `registro_clinico_descifrar`, guardado vía `nota_cita_guardar_cifrada`.
- [x] **Búsqueda `/admin/pacientes` por email/DNI/teléfono (blind index)** — detección automática de DNI/email/teléfono y lookup vía `paciente_buscar_por_campo` (HMAC).
- [ ] Agenda admin drag & drop (FullCalendar sobre `v_citas_expandidas`).
- [ ] Cancelacion de cita con reembolso parcial Stripe si aplica.
- [ ] Webhook Resend → auto-desactivar preferencia en bounce/complaint.

### Testing
- [ ] Suite Playwright E2E: booking flow completo + chat + pagos.
- [ ] Test restore DB en staging. Documentar RTO/RPO.

### Observabilidad
- [x] **Runbook alertas operativas** documentado en `docs/05_operations/ALERTAS_OPERATIVAS.md` (7 reglas Sentry + pago fallido + Resend + uptime).
- [ ] Activar las 7 reglas Sentry descritas en §1 del runbook (requiere acceso cuenta Sentry).
- [ ] Template Resend `pago_fallido` + prueba con tarjeta de declive.
- [ ] Configurar monitor externo (UptimeRobot/healthchecks.io) contra `/functions/v1/health`.
- [ ] Monitor Resend rate limit (>80% quota).

### Seguridad
- [ ] Pentest externo basico.
- [ ] Runbook rotacion vault key + re-cifrado.
- [ ] DPIA formal (RGPD Art. 35) con abogada.
- [ ] Registro de tratamientos Art. 30.

---

## Horizonte 3 — 6-12 meses

### Mejoras arquitectonicas
- [ ] Cifrado `mensajes.body` E2E con clave por conversacion (Vault secret per-row).
- [ ] Notificaciones push PWA (Web Push API + Service Worker).
- [ ] Migracion a Cache Components Next.js 15/16.
- [ ] Export anonimizado a DB analytics.

### Plan upgrade condicional
- [ ] Supabase Pro si volumen supera limites Free (PITR 7 dias, HIBP password check, 8 GB DB).
- [ ] Vercel Pro si se necesita Web Analytics avanzado.
- [ ] Resend Pro si se superan 3k emails/mes.

### FastAPI stand-by — decision
- [ ] Documentar como contingencia permanente **o** refactorizar + desplegar en Railway/Fly.io.

---

## Horizonte 4 — Largo plazo (>12 meses)

- [ ] Replicacion logica a DB analytics (anonimizacion first).
- [ ] Multi-tenant (si se quieren anadir mas psicologos/clinicas).
- [ ] Mobile app React Native compartiendo contratos TS.
- [ ] Integracion con calendario externo (Google Calendar / Apple Calendar).
- [ ] App nativa para video-sesiones (WebRTC via Supabase Realtime channels).

---

## Deuda tecnica reconocida

| Item                                                    | Severidad | Plan                                  |
|---------------------------------------------------------|-----------|---------------------------------------|
| `unsafe-inline` en CSP (Next.js 14 sin nonce)           | Media     | Migrar con Next 15 (nonce dinamico)   |
| `mensajes.body` en plaintext dentro de DB               | Media     | Cifrado por conversacion H3           |
| FastAPI stand-by no testeado                             | Baja      | Decision H3                           |
| Seeds demo activos en DB                                 | Alta      | Limpieza SQL manual pre-launch        |
| Sin backups cifrados propios (solo Supabase auto)       | Media     | pg_dump cifrado H2                    |
| Rate limiter en memoria (no cross-instance)             | Media     | Upstash/Redis si hay multi-region H2  |
| Magic-bytes no valida video/audio en recursos admin     | Baja      | Solo valida imagenes y PDF            |

---

## Ronda "ultra-performance + seguridad senior" (2026-04-22) — COMPLETADA

Registro de lo entregado en la ultima pasada senior (detalle en `docs/00_project_control/PENDIENTES_Y_CHECKLIST.md` §7):

- CSP unificada en `next.config.js` (elimina duplicacion en middleware).
- Cookies Supabase endurecidas (`hardenCookieOptions()`).
- Rate limiter + magic-bytes en 3 endpoints de upload.
- CSV injection protection en export facturacion.
- Migracion 0026 aplicada (8 indices compuestos).
- Material Symbols self-hosted subset (99.8% menos peso).
- Supabase client singleton en browser.
- Rama git renombrada `FRONTEND` → `frontend` (Vercel Production Branch + Root Directory corregidos).
