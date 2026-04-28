# Clínica Almudena Marchesi — Plataforma digital

Sitio público + portal paciente + panel admin con reserva online, pagos Stripe, chat en tiempo real y gestión clínica cifrada.

**Stack:** Next.js 14 (App Router) en Vercel + Supabase (Postgres, Auth, Realtime, Storage, Edge Functions).

---

## Arquitectura

```
┌──────────────┐    HTTPS    ┌──────────────────────┐   RLS + RPC   ┌───────────────────────┐
│  Navegador   │────────────▶│ Vercel · Next.js 14  │──────────────▶│ Supabase (eu-central) │
│  (usuario)   │◀────────────│  App Router + SSR    │◀──────────────│ Postgres + Auth + Rt  │
└──────────────┘   Cookies   └──────────────────────┘    WebSocket  └───────────────────────┘
                                      ▲
                         Stripe webhook │
                         (vía Edge Fn)  │
```

---

## Estructura del monorepo

```
almudena/
├─ frontend/                    # Next.js 14 app (Vercel)
│  └─ src/
│     ├─ app/                   # Rutas: (public), /admin, /portal, /api
│     ├─ components/            # UI: chat, booking, auth, pagos, portal-shell
│     ├─ lib/supabase/          # Clientes: server, browser, middleware, env, types
│     └─ services/              # Server Actions por dominio
├─ supabase/
│  ├─ migrations/               # 0001..0066 (SQL, append-only)
│  ├─ functions/                # Edge Functions (Deno): send-email, stripe-*, health, rgpd
│  └─ BOOTSTRAP.md              # Setup paso a paso
├─ docs/                        # Documentación del producto (ver docs/README.md)
├─ .gitignore
└─ README.md                    # Este archivo
```

---

## Puesta en marcha local

```bash
cd frontend
npm install
cp .env.example .env.local    # Editar con tus URLs + keys
npm run dev                   # → http://localhost:3000
```

---

## Variables de entorno

| Variable                              | Entorno       | Notas                                        |
|---------------------------------------|---------------|----------------------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`            | Todas         | Pública, visible en bundle                   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`       | Todas         | Protegida por RLS                            |
| `SUPABASE_SERVICE_ROLE_KEY`           | Server only   | **NUNCA** exponer al cliente                 |
| `NEXT_PUBLIC_APP_URL`                 | Todas         | `https://ampsicologia.es`                    |
| `STRIPE_SECRET_KEY`                   | Server (Edge) | `sk_test_` en pruebas, `sk_live_` en prod    |
| `STRIPE_WEBHOOK_SECRET`              | Server (Edge) | `whsec_` del endpoint configurado             |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`  | Todas         | Debe coincidir con `STRIPE_SECRET_KEY`       |

> **Rotación:** si cualquier secret se expone en un chat, PR o log, **rótalo inmediatamente**.

---

## Seguridad

| Capa                    | Implementación                                                         |
|-------------------------|------------------------------------------------------------------------|
| Geo-gate                | **Solo España, Portugal y Andorra.** Resto del mundo bloqueado en Edge |
| Auth                    | Cookies httpOnly, MFA TOTP, middleware RBAC                            |
| RLS                     | Todas las tablas con RLS. Paciente solo ve sus datos                   |
| Cifrado                 | AES-256-GCM (pgcrypto + Vault). Blind index HMAC-SHA256                |
| Auditoría               | Hash-chain tamper-evident + registro de revelación de PII              |
| CSP                     | `strict-dynamic`, `frame-ancestors 'none'`, HSTS 2 años                |
| Rate limiting           | Upstash Redis distribuido (fallback en memoria)                        |
| File validation         | Magic bytes contra MIME declarado. Path traversal bloqueado            |

---

## Deploy

```bash
cd frontend
vercel deploy --prod
```

Vercel detecta push a la rama `frontend` y despliega automáticamente.

---

## Documentación

Toda la documentación está en `docs/`. Ver `docs/README.md` para el índice.

| Documento                                      | Contenido                        |
|------------------------------------------------|----------------------------------|
| `docs/00_producto/producto.md`                 | Módulos y funcionalidades        |
| `docs/01_tecnico/arquitectura-y-seguridad.md`  | 6 capas de seguridad + SEO/GEO   |
| `docs/01_tecnico/base-de-datos.md`             | Migraciones y tablas             |
| `docs/02_operaciones/despliegue-y-operacion.md`| Variables, deploy, checklist     |
| `docs/03_cliente/informe-ejecutivo.md`         | Informe para la titular          |

---

## Licencia

Código propietario. © Clínica Almudena Marchesi Fernández. Todos los derechos reservados.
