# Auditoría de arquitectura global (estado al código)

> **Fecha de revisión:** 2026-04-26 · **Repositorio:** monorepo `almudena` (sin carpeta `backend/` en la ruta de producto).  
> **Metodología:** lectura de `frontend/`, `supabase/`, `middleware`, Edge Functions, migraciones y tipos `Database` en `frontend/src/lib/supabase/types.ts`.  
> **Resultado:** arquitectura unificada **Vercel (Next.js) + Supabase (Postgres, Auth, Storage, Realtime, Edge, Vault)**.

---

## 1. Visión de conjunto

| Nivel            | Tecnología principal | Dónde está en el repo |
|------------------|----------------------|------------------------|
| Interfaz         | Next.js **14.2.x** App Router, RSC, React 18, Tailwind | `frontend/src/app/`, `frontend/src/components/` |
| Orquestación BFF | Server Actions, route handlers, middleware | `frontend/src/services/`, `frontend/src/app/api/**/route.ts`, `frontend/src/middleware.ts` |
| Identidad        | Supabase Auth (sesión por cookies) | `frontend/src/lib/supabase/`, `frontend/src/middleware.ts` |
| Datos y reglas   | PostgreSQL, RLS, RPC, triggers, extensiones pgcrypto/vault | `supabase/migrations/*.sql` |
| Integraciones    | Edge Functions (Deno 2) | `supabase/functions/*/` |
| Archivos         | Supabase Storage (buckets) | Políticas en migraciones, uploads en `app/api/.../upload` |
| Tiempo real      | Supabase Realtime | Tablas y vistas publicadas; chat y adjuntos (`0055`+) |
| Pagos            | Stripe (Payment Element, Checkout, webhooks) | Cliente: `components/portal/pagos/`, `lib/stripe/`; servidor: Edge `stripe-*` |
| Email            | Resend | Edge `send-email`, webhooks `resend-webhook` |
| Errores          | Sentry (`@sentry/nextjs` + edge helpers) | `frontend/src/lib/sentry.ts`, `_shared` en functions |

**Flujo lógico:** el navegador nunca recibe claves de servicio ni secretos de Stripe/Resend; las mutaciones pasan por acciones de servidor o rutas que validan sesión, límites de tasa (Upstash o memoria) y, cuando aplica, comprobación de bytes en adjuntos.

---

## 2. Mapa lógico (alto nivel)

```text
                    ┌──────────────────────────────────────────┐
  HTTPS             │  Vercel (Frankfurt)                       │
  (TLS 1.3)  ──────▶│  Next.js: pages, RSC, Server Actions    │
                    │  Middleware: Supabase session + RBAC     │
                    │  API routes: rate limit, firmas, CSV     │
                    └──────┬───────────────────────┬───────────┘
                           │                      │
                           │  JWT (anon) + RLS   │  service role solo servidor
                           ▼                      ▼
                    ┌──────────────────────────────────────────┐
                    │  Supabase (eu-central)                   │
                    │  Postgres 17 · RLS · RPC · pgcrypto    │
                    │  Storage · Realtime · Auth · Vault        │
                    └──────┬───────────────────────┬──────────┘
                           │                      │
              Webhooks     │  pg_cron / actions    │  Signed URLs
                  ┌────────┴────────┐     ┌──────┴──────┐
                  ▼                 ▼     ▼             ▼
            Stripe            Resend   Emails     Edge Functions
            (HMAC verify)     (HMAC)   (SMTP API)  (Deno, Sentry)
```

**Backend “de aplicación”** no vive en un repositorio Python separado: está en **SQL + Edge**. Cualquier referencia histórica a FastAPI en documentación antigua queda invalidada: el tronco del repo refleja solo **Supabase**.

---

## 3. Principios que el código refleja

| Principio | Evidencia concreta |
|----------|---------------------|
| Separación de portales | Prefijos de ruta `/` (público), `/admin` (rol admin), `/portal` (paciente) + `middleware` |
| No confianza en el cliente | Rol efectivo vía `profiles` y RLS; no se acepta `role` desde query |
| Cifrado de PII clínica | `0022`–`0024`, columnas cifradas, búsqueda con blind index (`paciente_buscar_por_campo`) |
| Chat cifrado en almacenamiento | `0037` + `v_mensajes_chat` + `chat_descifrar_mensaje` |
| Idempotencia en pagos | `stripe_events`, deduplicación en webhooks, RPC de procesado |
| Observabilidad sin PII en logs | `beforeSend` Sentry, helpers Edge sin volcar cuerpos sensibles |
| Límites de abuso | `enforceRateLimit` + `UPSTASH_*` opcional, Auth rate limits en Supabase |

---

## 4. Decisiones de arquitectura (con trade-offs)

| Decisión | Ventaja aceptada | Coste o riesgo mitigado |
|----------|------------------|-------------------------|
| Monolito front + BFF en Vercel | Despliegue y DX simples, tipos compartidos | Escala vertical del bundle; mitigado con RSC y code-splitting |
| Supabase como ecosistema | Auth+DB+Storage+EF en un producto | Lock-in de plataforma; SQL estándar y `pg_dump` alivian portabilidad |
| Payment Element + PI | Flujo en contexto, métodos (Apple/Google/Klarna/SEPA) | Más lógica cliente que un Checkout redirigido |
| pgcrypto + vault | Compatible con ruta de migración y soporte Supabase | No libsodium; rendimiento aceptable a la escala clínica |
| Realtime de Supabase en chat y citas | UX inmediata | Complejidad de descifrado y vistas (`0053`–`0055`) |

---

## 5. Seguridad perimetral (referencia)

- **CSP, HSTS, COOP/ CORP, Permissions-Policy:** `frontend/next.config.js` (fuente única, sin duplicar en middleware salvo acuerdos explícitos).
- **CORS** en Edge: listas de orígenes en `_shared` (Vercel previews, dominio de producción).
- **Geo (opcional):** `GEO_ENFORCE` y `lib/security/geo-gate` para restringir jurisdicción de uso si se activa.
- **Detalle de cumplimiento legal:** `docs/01_auditorias/seguridad-rgpd.md`.

---

## 6. Documentos relacionados

| Documento | Contenido |
|-----------|-----------|
| `docs/01_auditorias/backend.md` | Edge Functions, webhooks, patrones Deno |
| `docs/01_auditorias/frontend.md` | Rutas, acciones, componentes, tests E2E |
| `docs/01_auditorias/base-de-datos.md` | Migraciones, RLS, tablas y RPC |
| `docs/03_ingenieria/arquitectura-tecnica.md` | Cómo está cableado hoy (referencia viva) |
| `docs/03_ingenieria/arquitectura-visual.md` | Diagramas Mermaid |

---

*Cualquier número de “páginas” o despliegue exacto: derivar de `next build` y de Vercel, no fijar aquí cifras de bundle que envejecen en días.*
