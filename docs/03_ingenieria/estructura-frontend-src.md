# Estructura de `frontend/src/`

Convención del árbol principal del cliente Next.js.

## `app/`

Rutas del App Router.

- `app/(public)/` — Páginas públicas, cabecera y pie de landing.
- `app/admin/`, `app/portal/` — Zonas autenticadas por rol.
- `app/api/` — Route Handlers (servidor).
- `app/robots.ts`, `sitemap.ts`, `manifest.ts` — Rutas de metadatos.

## `components/`

- `components/ui/` — Primitivas y piezas reutilizables.
- `components/layout/` — Cabecera, pie, navegación.
- `components/landing/`, `components/sections/` — marketing.
- `components/auth/`, `components/admin/`, `components/pagos/`, `components/portal/`, `components/chat/`, etc. — Dominio de producto.

## `services/`

Server Actions y llamadas a Supabase (RPC, Edge) desde el servidor. Organización por dominio (citas, pagos, mensajes, etc.).

## `contracts/`

Tipos e interfaces de dominio compartidos en el front.

## `lib/`

Utilidades y constantes sin UI: `lib/supabase/` (clientes server/browser/middleware, env, tipos), `lib/security/` (rate limit, validación de ficheros, geo), SEO, clínica, etc.
