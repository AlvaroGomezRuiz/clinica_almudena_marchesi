# Roadmap de Ingenieria

> Tareas tecnicas agrupadas por horizonte temporal.
> Para bloqueos pre-launch operativos (dominio, NIF, etc.) ver `docs/00_project_control/PENDIENTES_Y_CHECKLIST.md`.

---

## Horizonte 1 — Pre-launch (bloquea go-live)

### Infraestructura
- [ ] Aplicar migracion `0026_retirar_seed_demo.sql` (borrar seed demo).
- [ ] Generar indices `0027_index_auditoria_ts` + `0027_index_pagos_fecha`.
- [ ] Crear Edge Function `health` que verifica `app_encryption_ready()` + vault.
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
- [ ] Consolidar `services/payments/` → `services/pagos/` (legacy folder).
- [ ] Consolidar `components/payments/` → `components/pagos/`.
- [ ] Migrar Google Fonts `@import` CSS → `next/font`.
- [ ] `npm run build` con 0 errores + 0 warnings.
- [ ] Lighthouse mobile >= 90 en rutas publicas + portal.

### Verificacion
- [ ] Activar endpoint `/sentry-check` post-deploy.
- [ ] Run `axe-core` en home + portal + admin.
- [ ] Smoke test manual del `TESTING_CHECKLIST.md`.

---

## Horizonte 2 — Primer trimestre post-launch

### UX
- [ ] `/admin/pacientes/[id]` edit inline de campos sensibles via `actualizarPacienteSensiblesAction`.
- [ ] UI admin para escribir notas post-sesion via `nota_cita_guardar_cifrada`.
- [ ] Busqueda `/admin/pacientes` por email/DNI/telefono usando blind index.
- [ ] Agenda admin drag & drop (FullCalendar sobre `v_citas_expandidas`).
- [ ] Cancelacion de cita con reembolso parcial Stripe si aplica.
- [ ] Webhook Resend → auto-desactivar preferencia en bounce/complaint.

### Testing
- [ ] Suite Playwright E2E: booking flow completo + chat + pagos.
- [ ] Test restore DB en staging. Documentar RTO/RPO.

### Observabilidad
- [ ] Alertas Sentry: error rate > 1% en 5 min.
- [ ] Alertas pago fallido via email.
- [ ] Monitor Resend rate limit (>80% quota).
- [ ] Uptime monitoring externo (UptimeRobot o similar).

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

| Item                                              | Severidad | Plan                         |
|---------------------------------------------------|-----------|------------------------------|
| `unsafe-inline` en CSP (Next.js 14 sin nonce)     | Media     | Migrar con Next 15           |
| `mensajes.body` en plaintext dentro de DB         | Media     | Cifrado por conversacion H3  |
| FastAPI stand-by no testeado                       | Baja      | Decision H3                  |
| Seeds demo activos en DB                           | Alta      | Migracion `0026` pre-launch  |
| Sin backups cifrados propios (solo Supabase auto) | Media     | pg_dump cifrado H2           |
