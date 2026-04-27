# Línea base del producto (repositorio actual)

Documento fijo de **qué entrega este repo** en su estado canónico. Detalle operativo: `estado-y-pendientes.md`. Roadmap futuro: `docs/03_ingenieria/roadmap.md`.

## Stack

- **Frontend:** Next.js 14 (App Router), React 18, Tailwind; despliegue Vercel (`frontend/` es root de build en Vercel).
- **Backend:** Supabase (Postgres + RLS, Auth, Storage, Realtime, Edge Functions). Sin servidor de aplicación propio en la ruta crítica.
- **Pagos:** Stripe (Checkout / Payment flow según módulo) + webhooks vía Edge Functions.
- **Email:** Resend desde Edge (`send-email`, crons, plantillas con pie unificado).

## Módulos entregados (visión de producto)

- **Público:** landing, legales, servicios, contacto, registro de paciente (flujo OTP Supabase + RPC cifrada de ficha).
- **Portal paciente:** citas y reservas, pagos y bonos, mensajería en tiempo real, recursos, ajustes, factura PDF cuando aplica, gate de bienvenida según negocio.
- **Panel admin:** agenda, pacientes y ficha clínica, mensajes, recursos, facturación (KPI, CSV, asignación manual de bonos), operaciones cifrada/descifrada según RLS.
- **Seguridad Edge:** Geo opcional (`GEO_ENFORCE`), CSP y cabeceras en `next.config.js`, middleware con sesión Supabase y RBAC, rate limits en API sensibles (upload, adjuntos chat, export CSV, descargas de recursos, factura PDF) con `enforceRateLimit` (Upstash si está configurado).
- **Observabilidad:** Sentry (`@sentry/nextjs`, EU DSN recomendado), ruta de comprobación `/sentry-check` con token.
- **Tests E2E:** Playwright bajo `frontend/e2e/` (smoke, a11y, cierre duro de contratos API, flujos críticos según spec).

## Fuera de alcance en código (hoy)

- Cifrado de binarios de Storage en reposo con política de claves propia (valoración clínica / DPO).
- Sustitución de FastAPI legada: el repositorio ya asume Supabase como backend único.

## Documentación relacionada

| Documento | Uso |
|-----------|-----|
| `refinamientos-app-2026-04-26.md` | **Refinamientos de la app** (26-abr: agenda, horario, móvil, público) |
| `refinamientos-app-2026-04-27.md` | **Refinamientos de la app** (27-abr: auditoría, adjuntos ficha, cancelación agenda, pulido transversal; mismo hilo: avatar menú, slots ocupados reserva, icono info chat) |
| `estado-y-pendientes.md` | Secrets, dominio, checklist vivo |
| `docs/05_operaciones/checklist-produccion.md` | Operación, QA staging, E2E, go-live (un solo documento) |
| `docs/03_ingenieria/geo-y-seo.md` | Geo, metadatos, indexación |
| `docs/01_auditorias/seguridad-rgpd.md` | Cumplimiento y riesgos |
| `docs/02_informes/ejecutivo-cliente.md` | Informe de producto (clínica) |
| `docs/02_informes/valor-reposicion-software.md` | Valor de reposición (ingeniería) |
| `docs/01_auditorias/arquitectura.md` | Arquitectura (auditoría) |
| `docs/01_auditorias/backend.md` | Supabase, RPC, Edge (auditoría) |
| `docs/01_auditorias/frontend.md` | Next.js (auditoría) |
| `docs/01_auditorias/base-de-datos.md` | Base de datos (auditoría) |
