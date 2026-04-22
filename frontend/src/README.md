# Estructura `src/` (Frontend)

## `app/`
Rutas de Next.js (App Router).  
- `app/(public)/`: páginas públicas con `PublicHeader`/`PublicFooter`.
- `app/admin/`, `app/portal/`: zonas autenticadas.
- `app/api/`: rutas server.
- `app/robots.ts`, `app/sitemap.ts`, `app/manifest.ts`: metadata routes.

## `components/`
UI y composición.
- `components/ui/`: primitives (shadcn + utilidades).
- `components/layout/`: header/footer/nav.
- `components/landing/`, `components/sections/`: piezas de marketing.
- `components/auth/`, `components/admin/`, `components/payments/`: features.

## `services/`
Server Actions agrupadas por dominio (llaman a Supabase RPCs y Edge Functions vía `@supabase/ssr`).

## `contracts/`
Interfaces TypeScript para tipos de dominio compartidos dentro del frontend.

## `lib/`
Constantes y helpers puros (sin React). Incluye `lib/supabase/` con clientes server/browser/middleware y `lib/security/` con rate-limit y validación binaria.

