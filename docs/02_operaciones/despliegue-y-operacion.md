# Despliegue y operación

> Última actualización: 2026-04-27

## Infraestructura

| Servicio    | Proveedor      | Región          | Uso                           |
|-------------|----------------|-----------------|-------------------------------|
| Frontend    | Vercel         | `fra1` (UE)     | Next.js SSR + CDN             |
| Base datos  | Supabase       | `eu-central-1`  | Postgres + Auth + Storage     |
| Pagos       | Stripe         | UE              | PCI-compliant, sin PAN propio |
| Email       | Resend         | UE              | Transaccional con DKIM        |
| Monitoring  | Sentry         | UE              | Errores + performance         |
| Rate limit  | Upstash Redis  | Global (opt.)   | Límites distribuidos          |

---

## Variables de entorno

### Vercel (Production + Preview)

| Variable                             | Tipo           | Notas                              |
|--------------------------------------|----------------|------------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`           | Pública        | URL del proyecto Supabase          |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`      | Pública        | Protegida por RLS                  |
| `SUPABASE_SERVICE_ROLE_KEY`          | **Server only**| NUNCA exponer al cliente           |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Pública        | `pk_live_...` en producción        |
| `NEXT_PUBLIC_SENTRY_DSN`             | Pública        | DSN del proyecto Sentry            |
| `SENTRY_AUTH_TOKEN`                  | Server only    | Upload de source maps              |
| `NEXT_PUBLIC_APP_URL`                | Pública        | `https://ampsicologia.es`          |

### Supabase Edge Functions (Secrets)

| Secret                       | Uso                                     |
|------------------------------|-----------------------------------------|
| `STRIPE_SECRET_KEY`          | `sk_live_...` para producción           |
| `STRIPE_WEBHOOK_SECRET`      | `whsec_...` del endpoint configurado    |
| `RESEND_API_KEY`             | Token de Resend (`re_...`)              |
| `RESEND_FROM_EMAIL`          | Remitente con dominio verificado        |
| `CRON_SECRET`                | Autenticación del cron de recordatorios |
| `SENTRY_DSN`                 | Observabilidad de Edge Functions        |
| `FRONTEND_URL`               | `https://ampsicologia.es`               |
| `FACTURA_EMISOR_*`           | Datos fiscales para PDF de facturas     |

---

## Deploy

```bash
cd frontend
vercel deploy --prod
```

### Edge Functions

```bash
supabase functions deploy send-email --project-ref <ref>
supabase functions deploy stripe-webhook --project-ref <ref>
supabase functions deploy cron-recordatorios-24h --project-ref <ref>
```

---

## Checklist go-live

### Seguridad

- [ ] `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` solo en Production secrets
- [ ] MFA obligatorio para admin
- [ ] Supabase Auth rate limits revisados
- [ ] Backups automáticos activos (PITR)
- [ ] Rotación de keys documentada (cada 90 días)

### Stripe

- [ ] Pasar de test a live: rotar `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`
- [ ] Webhook endpoint configurado con eventos: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `payment_intent.succeeded`, `payment_intent.payment_failed`
- [ ] Verificar dominio en Resend (SPF/DKIM/DMARC)

### Datos

- [ ] Ejecutar `0028_retirar_seed_demo.sql` para purgar datos de prueba
- [ ] Crear usuarios reales con credenciales fuertes
- [ ] Verificar que `app_encryption_ready()` devuelve `true`

### DNS

- [ ] Dominio apuntando a Vercel
- [ ] Dominio añadido en Supabase Auth redirect URLs
- [ ] SMTP personalizado configurado en Supabase Auth
- [ ] `FRONTEND_URL` actualizado en Edge Secrets

### Monitoreo

- [ ] Sentry: reglas de alerta configuradas
- [ ] UptimeRobot o equivalente contra `/functions/v1/health`

---

## Rotación de secretos

> Si cualquier secret se expone en chat, PR, screenshot o log: **rotar inmediatamente**.

| Secret                        | Dónde rotar                            |
|-------------------------------|----------------------------------------|
| `SUPABASE_SERVICE_ROLE_KEY`   | Supabase Dashboard → API               |
| `STRIPE_SECRET_KEY`           | Stripe Dashboard → API Keys            |
| `STRIPE_WEBHOOK_SECRET`       | Stripe Dashboard → Webhooks            |
| `RESEND_API_KEY`              | Resend Dashboard → API Keys            |
| `APP_ENCRYPTION_KEY`          | Supabase Vault (requiere re-cifrado)   |

