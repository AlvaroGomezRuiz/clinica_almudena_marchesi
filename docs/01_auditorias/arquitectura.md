# Auditoria de Arquitectura Global

> **Alcance**: revision end-to-end del monorepo clinica-almudena.
> **Fecha**: 2026-04-21. **Nota 2026-04-23**: arquitectura unificada en Supabase; sin `backend/` en repo. Ver `docs/00_proyecto/cronologia.md` (hitos 14–17).
> **Metodologia**: inspeccion estatica de codigo, migraciones, Edge Functions, RLS, Sentry y flujos Stripe; contraste con estado real desplegado (Vercel + Supabase `koxsikkobjlycqqfstye`).
> **Resultado**: **VERDE** (listo para pre-produccion tras rotacion de credenciales + alta de dominio).

---

## 1. Mapa del sistema

```
   Navegador  ──HTTPS──▶  Vercel (Next.js 14 SSR+RSC)  ──RLS+RPC──▶  Supabase Postgres
       │                         │                                          │
       │                         └── Server Actions ──▶ Edge Functions ─────┤
       │                                                    │               │
       ▼                                                    ▼               ▼
   Stripe Checkout                                     Resend (email)   supabase_vault
     + Payment                                         Sentry (obs.)    (clave AES-256)
      Element

   ~~FastAPI `backend/`~~ retirado del repo (hito 14); lock-in mitigado por Postgres
   estandar + Edge exportables.
```

## 2. Stack canonico

| Capa               | Tecnologia                                  | Estado     |
|--------------------|---------------------------------------------|------------|
| UI                 | Next.js 14 App Router + React 18 + Tailwind | produccion |
| Auth               | Supabase Auth (cookies httpOnly via `@supabase/ssr`) | produccion |
| Datos              | Supabase Postgres + RLS + pgcrypto + vault  | produccion |
| Realtime           | Supabase Realtime (WebSocket)               | produccion |
| Storage            | Supabase Storage (bucket firmas, recursos)  | produccion |
| Pagos              | Stripe Payment Element (embebido) + webhook | produccion (test) |
| Email              | Resend + Edge Function `send-email`         | produccion |
| Errores            | Sentry (frontend + edge) sin PII            | produccion |
| Backend opcional   | FastAPI 0.115 + SQLAlchemy 2.0 + Alembic    | stand-by   |

## 3. Principios arquitectonicos respetados

1. **Separacion estricta** publico / admin / portal paciente (rutas, middleware, RLS).
2. **Cero negocio en UI**: toda logica escribe via Server Action → RPC o Edge Function.
3. **Fail-fast**: variables criticas validadas al arranque (`getSupabaseEnv`, `_app_encryption_key`).
4. **Idempotencia bulletproof**: `pagos.stripe_event_id UNIQUE`, RPC `procesar_pago_stripe` detecta dup.
5. **Zero Trust**: no existe ruta que confie en un rol enviado por el cliente; `is_admin()` resuelve desde `profiles.role` con `SECURITY DEFINER`.
6. **Defense in depth**: 4 capas (Transport → Headers → Auth → RLS → Cifrado columna).

## 4. Analisis de decisiones clave

| Decision                                               | Justificacion                                          | Trade-off aceptado                                   |
|--------------------------------------------------------|--------------------------------------------------------|------------------------------------------------------|
| Supabase en lugar de FastAPI desplegado                | RLS + Realtime + Auth + Edge en una sola plataforma, 0 ops | Vendor lock-in parcial mitigado por SQL estandar    |
| `pgcrypto + vault` en vez de `pgsodium`                | `pgsodium` oficialmente en deprecacion por Supabase    | Menor throughput que libsodium (no critico a esta escala) |
| Payment Element embebido vs Checkout hosted            | UX premium, no redirect, mantiene contexto de reserva   | Mas codigo cliente (Stripe Elements + iframe)       |
| Blind index HMAC-SHA256 en vez de hash simple          | Permite busqueda exacta sin desanonimizar             | Determinista ⇒ vulnerable a enumeracion si se filtra el HMAC key |
| Sentry via HTTP envelope (no SDK en Edge)              | `@sentry/deno` no estable en runtime Supabase         | Sin breadcrumbs automaticos; tags manuales           |
| Next.js 14 (no 15/16)                                  | Estabilidad, soporte amplio, Cache Components no requerido | Sin PPR ni `'use cache'`; migrable en Q2 2026 |
| Stripe `automatic_payment_methods=true`                | Activa wallets (Apple/Google Pay, Bizum, Klarna) sin config | Pequenos cambios en UI (Payment Element ajusta altura) |

## 5. Capas y responsabilidades

### 5.1 Cliente (navegador)
- Solo lee endpoints `NEXT_PUBLIC_*` (URL + anon key Supabase).
- No tiene acceso a `SERVICE_ROLE_KEY`, `STRIPE_SECRET`, `RESEND_API_KEY`.
- Todas las mutaciones pasan por Server Actions (serializadas, validables, cacheables).

### 5.2 Vercel (Server)
- Middleware Next.js: refresh de sesion Supabase + RBAC por prefijo de ruta.
- Server Actions: puente autenticado cliente → RPC/EF.
- Sentry con `beforeSend` scrubbing PII (email, DNI, telefono, IBAN).

### 5.3 Supabase
- **Postgres**: schema `public` + RLS, `extensions` con pgcrypto, `vault` con master key.
- **Auth**: email/password + MFA TOTP opcional; validacion passphrase >= 12 chars client-side.
- **Edge Functions**: Deno runtime. 10 funciones. Todas con `wrapEdgeHandler` → Sentry.
- **Realtime**: publication `supabase_realtime` con replica identity full en `citas`, `mensajes`, `pagos`.
- **Storage**: buckets `recursos` (signed URL 5 min), `firmas-rgpd` (private), `avatares` (public).

### 5.4 Stripe
- Cuenta de la clinica (`clinica.almudena.marchesi@outlook.com`).
- Webhook: 4 eventos activos (`checkout.session.completed`, `checkout.session.async_payment_succeeded`, `payment_intent.succeeded`, `payment_intent.payment_failed`).
- Modo test confirmado; pendiente rotacion a live tras go-live.

## 6. Telemetria y observabilidad

| Evento                     | Captura                      | Destino       |
|----------------------------|------------------------------|---------------|
| Error en Server Action     | `captureClinicalError`       | Sentry (frontend) |
| Error en Edge Function     | `wrapEdgeHandler` + rethrow  | Sentry (edge) |
| Pago confirmado            | `INSERT public.pagos`        | Postgres      |
| Email enviado              | `INSERT public.emails_log`   | Postgres      |
| Consulta PII descifrada    | `INSERT public.auditoria` con hash-chain | Postgres |
| Rate limit hit             | middleware / Supabase Auth   | Sentry (warning) |

## 7. Riesgos residuales y mitigaciones

| Riesgo                                  | Probabilidad | Impacto | Mitigacion actual                                                | Pendiente              |
|-----------------------------------------|--------------|---------|------------------------------------------------------------------|------------------------|
| Credenciales demo (`Almudena2026!`)     | alta         | alta    | Documentado en `docs/00_proyecto/estado-y-pendientes.md` como pre-producción  | rotar antes de go-live |
| Dominio `resend.dev`                    | media        | media   | Funcional en test; deliverability baja en prod                   | esperar dominio clinica |
| Password leak check (HIBP)              | baja         | media   | Plan Pro Supabase requerido; complejidad 12+ chars mitiga       | aceptado               |
| Migracion 0025 (drop plaintext)         | baja         | media   | Triggers auto-encrypt cubren escrituras nuevas                   | aplicar tras QA cliente |
| Backup Postgres                         | media        | alta    | Supabase plan Free = 7 dias retention, sin PITR                 | evaluar Pro en Q2      |
| Rate limit email Resend                 | baja         | media   | 3.000 mails/mes plan Free; alerta cuando >80%                    | pendiente alert        |

## 8. Top 5 wins arquitectonicos

1. **Cifrado de columna con vault**: clave maestra nunca en `.env`, solo en `supabase_vault` cifrado.
2. **Hash-chain de auditoria**: tabla `auditoria` con `hash_integridad` = SHA-256 encadenado ⇒ tamper-evident.
3. **Triggers auto-encrypt**: escritura plaintext → ciphertext automatico en `paciente_diagnosticos`, `paciente_medicacion`, `citas_notas_paciente`. Imposible olvidarse.
4. **Idempotencia de webhook**: `UNIQUE (stripe_event_id)` + `procesar_pago_stripe` devuelve `ya_procesado:true` → Stripe puede reintentar 72h sin generar duplicados.
5. **Fingerprint determinista en Sentry**: eventos agrupados por `[area, event_type, entity_id]` ⇒ alertas accionables, no ruido.

## 9. Deuda tecnica catalogada

| Item                                                    | Severidad | Ubicacion                                           |
|---------------------------------------------------------|-----------|-----------------------------------------------------|
| ~~Carpeta `backend/` sin despliegue~~                   | —         | **Eliminada** (hito 14); riesgo cerrado.           |
| `0008_seed_demo.sql` con usuarios demo                  | media     | `supabase/migrations/0008_seed_demo.sql`           |
| `stripe-checkout` redundante tras migracion a Payment Element | baja      | `supabase/functions/stripe-checkout/`              |
| Falta integration tests E2E (Playwright)                | media     | `frontend/` (sin suite)                            |
| Rotacion vault `app_encryption_key` no automatizada     | media     | procedimiento manual (documentar en runbook)       |

## 10. Veredicto

Arquitectura **production-ready**. El codigo sigue principios SOLID, KISS, defensa en profundidad y GDPR-by-default. Los bloqueadores restantes son **operacionales** (dominio, NIF, rotacion credenciales), no tecnicos.

No se detecta anti-patron estructural ni codigo muerto critico. La separacion frontend ⇄ backend esta limpia. El cifrado en reposo cumple Articulo 32 RGPD ("medidas apropiadas"). La auditoria hash-chain cumple Ley 41/2002 Articulo 17 (integridad historia clinica).

**Recomendacion**: proceder a go-live tras ejecutar el checklist de rotacion documentado en `docs/00_proyecto/estado-y-pendientes.md` seccion 6.
