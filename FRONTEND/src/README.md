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
Acceso a API (fetch/axios) y Server Actions agrupadas por dominio.

## `contracts/`
Interfaces TypeScript para requests/responses compartidos con backend.

## `lib/`
Constantes y helpers puros (sin React).

