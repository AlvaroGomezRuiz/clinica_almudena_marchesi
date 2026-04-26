# Auditoría del frontend (Next.js 14)

> **Fecha:** 2026-04-26 · **Raíz de build:** `frontend/` (Vercel root directory = `frontend`).  
> **Versiones (package):** `next@^14.2.35`, `react@18`, `@supabase/ssr@^0.10.2`, `@sentry/nextjs@^8`, Playwright, `@upstash/ratelimit`, Tailwind, Radix, `next-themes`.  
> **Líneas de código (orden de magnitud):** conteo recursivo `*.ts`/`*.tsx` bajo `frontend/src` ≈ **28k líneas** (herramienta PowerShell; rutas con `[id]` pueden requerir escapar en conteos básicos).

---

## 1. Resumen ejecutivo

| Dimensión | Dato aproximado (repo) | Comentario |
|-----------|------------------------|------------|
| Páginas / rutas `app/**/page.tsx` | 64 ficheros (incl. duplicados de casing en el FS) | Algunas rutas dinámicas `admin/.../ver/[id]`, `portal/.../ver/[id]`, `print` |
| Server actions / servicios | 20 módulos bajo `src/services/` | Dominio: `admin`, `auth`, `citas`, `mensajes`, `pagos`, `portal`, `notificaciones`, `recursos` |
| API routes (Route Handlers) | Bajo `src/app/api/.../route.ts` | Facturación export, factura PDF, avatares, recursos, adjuntos chat, signout |
| Componentes | >100 bajo `components/` | Incluye `ui/`, `admin/`, `portal/`, `chat/`, `landing/`, `layout/` |
| Pruebas E2E | `frontend/e2e/*.spec.ts` | Scripts: `test:e2e`, `test:e2e:smoke`, `test:e2e:cierre`, `test:e2e:a11y` |

**Veredicto:** estructura **App Router** coherente, **RSC por defecto**, islas cliente para agenda extensa, chat, pagos y formularios complejos. Hardening de **CSP y cabeceras** en `next.config.js`; **middleware** para refresh de sesión Supabase y **RBAC** por prefijo de ruta.

---

## 2. Árbol lógico de `src/app/`

> No se copia el árbol de FS completo: las **ramas** son las que definen el producto.

| Segmento | Rutas (patrón) | Rol |
|----------|----------------|-----|
| `(public)/` | `page`, `enfoque`, `servicios`, `sobre-mi`, `contacto`, legales, `login`, `registro-paciente`, `pagos` (legacy redirect) | Anónimo o auth mixta |
| `admin/` | `agenda`, `pacientes`, `pacientes/[id]`, `pacientes/alta`, `print`, `facturacion`, `mensajes`, `recursos`, `configuracion` | `admin` (middleware) |
| `portal/` | `bienvenida`, `citas`, `citas/reservar`, `pagos`, `mensajes`, `recursos`, `recursos/ver/[id]`, `ajustes` | `paciente` |
| `auth/` | `callback`, `forgot-password`, `reset` | Flujos Supabase |
| `api/` | `admin/...`, `portal/...`, `mensajes/attach`, `auth/signout` | Server sin UI, con rate limit |
| Raíz | `sitemap`, `robots`, `manifest`, `sentry-check`, `llms.txt`, `ai/*` (meta/AI) | SEO, diagnóstico, descubrimiento |

**Layout:** `app/layout.tsx` (global), `(public)/layout`, `admin/layout`, `portal/layout` — comprobar que metadatos y theming sigan a `buildPublicPageMetadata` y `next-themes` según rama pública.

---

## 3. `src/services/` (Server Actions y acoplamiento a RPC)

| Módulo / dominio | Ficheros | Responsabilidad |
|------------------|----------|-----------------|
| `admin/actions.ts` | Varios `*` | Orquestación admin (no listar aquí cada export: ver código) |
| `admin/ficha-actions.ts` | Ficha, campos cifrados, timeline | Pasa por RPC cifrado |
| `admin/citas-admin-actions.ts` | Operaciones de cita en admin | Coherente con 0046+ |
| `citas/actions.ts` | Reserva de paciente | `reservar_cita`, flujo pago |
| `pagos/actions.ts` | Bonos, intents, resúmenes | Conecta a Edge `stripe-*` y webhooks resultantes vía DB |
| `mensajes/actions.ts` + `fetch-adjuntos.ts` | Chat y adjuntos | Cifrado + Realtime |
| `auth/actions.ts` | Registro, login, MFA, reset | Flujos documentados en checklist |
| `recursos/actions.ts` + `portal/recursos-actions.ts` | CRUD y descargas | Aligned con buckets |
| `notificaciones/actions.ts` | Prefs y email | Coherente con `notificaciones_prefs` |
| `admin/pacientes-actions.ts`, `notas-cita-actions.ts`, `agenda-actions.ts`, `cuenta-actions.ts` | Entidades | Ver tipos y RLS |

**Regla de estilo del repo:** validar entradas en el borde (Zod o equivalente) antes de `rpc()`.

---

## 4. Componentes de mayor peso (complejidad / superficie de bug)

| Componente | Ruta aprox. | Notas |
|------------|------------|--------|
| `AgendaClient.tsx` | `components/admin/agenda/` | Gran cantidad de estado; vista semana/día/mes |
| `ChatPanel.tsx` | `components/chat/` | Optimistic UI, descifrado vía RPC en eventos, adjuntos, audio |
| `SlotPicker.tsx` | `components/booking/` | Reglas de modalidad y bono |
| `PortalShell` + `SidebarNav` | `components/portal-shell/` | Navegación, gate de bienvenida, tema |
| `AsignarBonoManualButton` / facturación | `admin/facturacion` | Alineado con `0057` y `bono_asignar_manual` |
| Páginas legales | `app/(public)/*` | `buildPublicPageMetadata`, JSON-LD, versiones legales |

---

## 5. Seguridad en el edge del front

| Mecanismo | Ubicación | Descripción |
|-----------|-----------|-------------|
| Rate limit | `lib/security/rate-limit.ts` + API routes | Upstash o memoria / instancia |
| Validación de adjuntos | `lib/security/file-validation.ts` + `attach` route | Magic bytes, tamaño |
| Geo (opcional) | `lib/security/geo-gate.ts` | Alineado a `GEO_ENFORCE` |
| Sanitizado de errores al usuario | `lib/formatUserFacingError.ts` | No filtrar existencia de emails, etc. |
| Sentry | `lib/sentry.ts` | Scrub PII en `beforeSend` |

---

## 6. Tests y calidad

| Tipo | Comando / ubicación |
|------|----------------------|
| E2E | `npm --prefix frontend run test:e2e` (ver `playwright.config`) |
| A11y | `test:e2e:a11y` (axe) |
| Build | `npm run build` en `frontend` |

**Lista maestra de casos (manual y automáticos):** `docs/05_operaciones/checklist-produccion.md` **Parte B y C**.

---

## 7. Documentos de ingeniería relacionados

| Documento | Uso |
|-----------|-----|
| `docs/03_ingenieria/estructura-frontend-src.md` | Mapa de carpetas |
| `docs/03_ingenieria/geo-y-seo.md` | Metadatos, JSON-LD, `.GEO/` local |
| `docs/00_proyecto/linea-base-producto.md` | Alcance de producto |

*Este informe se actualiza cuando cambie de forma estructural el árbol bajo `frontend/src/app` o el patrón RSC/Client.*
