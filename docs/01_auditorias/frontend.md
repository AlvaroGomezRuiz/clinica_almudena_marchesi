# Auditoria del Frontend

> **Alcance**: Next.js 14 App Router en `frontend/`.
> **Fecha**: 2026-04-21.

---

## 1. Resumen ejecutivo

Frontend Next.js 14 con App Router, RSC por defecto, Tailwind CSS y una paleta editorial "Moncloa sage" que distingue la clinica del tipical template AI. Se despliega en Vercel con CI/CD automatico.

| Metrica                               | Valor     |
|---------------------------------------|-----------|
| Rutas publicas                        | 9         |
| Rutas admin                           | 6         |
| Rutas portal paciente                 | 5         |
| API routes                            | 4         |
| Server Actions (por dominio)          | ~25       |
| Componentes totales                   | ~110      |
| Bundle page peso medio                | < 200 KB  |

**Veredicto**: frontend solido, coherente con la arquitectura backend, seguro y listo para produccion. Deuda menor en tests E2E.

---

## 2. Arquitectura de rutas

```
frontend/src/app/
├─ (public)/                       # grupo publico (layout landing)
│  ├─ page.tsx                     # home /
│  ├─ enfoque/
│  ├─ servicios/
│  ├─ sobre-mi/
│  ├─ contacto/
│  ├─ aviso-legal/  privacidad/  cookies/
│  ├─ login/
│  ├─ registro-paciente/
│  └─ pagos/                       # (pago previo al portal)
├─ admin/                          # protegido por middleware
│  ├─ agenda/
│  ├─ pacientes/[id]/
│  ├─ pacientes/alta/
│  ├─ facturacion/
│  ├─ mensajes/
│  ├─ recursos/
│  └─ configuracion/
├─ portal/                         # protegido + rol paciente
│  ├─ citas/      citas/reservar/
│  ├─ mensajes/
│  ├─ recursos/
│  ├─ pagos/      pagos/success/   pagos/cancel/
│  └─ ajustes/
├─ api/                            # Route Handlers (no Server Actions)
│  ├─ admin/config/backup-keys/
│  ├─ admin/facturacion/nota-administrativa/
│  ├─ auth/ callback/
│  ├─ mensajes/ subscribe/
│  └─ portal/ recursos/[id]/download/
├─ .well-known/ai.txt              # indexable por crawlers IA
├─ ai/*.json                       # summary/faq/service (LLM-friendly)
├─ llms.txt, llms-full.txt         # metadata LLM
└─ sentry-check/                   # endpoint diagnostico Sentry
```

### 2.1 Principios respetados

- **Grupos de ruta** `(public)` para aislar layout/footer publico.
- **Segmento `auth/callback`** para finalizar PKCE de Supabase.
- **API routes solo para endpoints que necesitan streaming/signed URLs** (descarga firmada de recursos, subscribe SSE de mensajes). El resto usa Server Actions.
- **Metadata por ruta**: OG images + canonical + noindex en `admin/*` y `portal/*`.

---

## 3. Organizacion de componentes

```
frontend/src/components/
├─ ui/                    # primitivas (Button, Card, Input, Chip, SurfaceCard)
├─ layout/                # header, footer, sections
├─ landing/               # bloques AIDA home
├─ sections/              # bloques reutilizables (Hero, FAQ, CTA)
├─ auth/                  # login, register, MFA
├─ booking/               # SlotPicker + calendar
├─ chat/                  # mensajeria realtime
├─ citas/                 # tarjetas cita, lista
├─ pagos/                 # BonoCompraCard
├─ payments/              # (sin uso, consolidar en pagos)
├─ portal/                # layout + ajustes + pagos PaymentElementDrawer
├─ portal-shell/          # shell sidebar + profile dropdown + theme toggle
├─ realtime/              # hooks WebSocket
├─ recursos/              # tarjetas, filtros
├─ admin/agenda/          # grid semanal, plantillas, bloqueos
├─ admin/configuracion/   # MFA, logs, cifrado, avatar
├─ admin/ficha/           # SensitiveField, timeline, export
├─ admin/mensajes/        # master-detail
├─ admin/pacientes/       # KPIs, buscador, AltaManualForm
└─ admin/recursos/        # subir, legal
```

### Observaciones
- **Duplicidad `pagos/` vs `payments/`**: `components/payments/` tiene solo 1-2 archivos viejos, consolidar en `components/pagos/`.
- **Consistencia idiomatica**: todo en espanol (nombres de dominio), OK (rompe la regla "nombres en ingles" pero es justificable para coherencia con BD que tambien esta en espanol por requisito de la clinica).
- **Componentes primitivos en `ui/`**: bien separados (Card, Button, Chip, SurfaceCard), API consistente (`variant`, `tone`).

---

## 4. Server Actions

Organizadas por dominio en `frontend/src/services/`:

```
services/
├─ admin/                 # acciones admin (ficha-actions, pacientes-actions)
├─ auth/                  # login, register, MFA, recuperacion
├─ citas.ts               # reservar, cancelar
├─ mensajes/              # enviar, marcar leido, conversaciones
├─ notificaciones/        # prefs opt-in
├─ pagos/                 # actions (crear checkout + crear PI)
├─ payments/              # (consolidar en pagos/)
├─ portal/                # notas cita paciente
└─ recursos/              # asignaciones
```

### 4.1 Patrones correctos

- Cada action devuelve `{success, data?, error?}` tipado (nunca throws al cliente).
- Uso de `revalidatePath` / `revalidateTag` para refetch server-side.
- Validacion con Zod al inicio de cada action.
- `captureClinicalError` en catch con contexto minimo (`{area, entity_id}`).
- `cookies()` via `@supabase/ssr` → no se comparten sesiones entre requests.

### 4.2 Problemas menores

| Severidad | Item                                                                     | Fix                                                   |
|-----------|--------------------------------------------------------------------------|-------------------------------------------------------|
| Baja      | `services/payments/` duplicado con `services/pagos/`                    | Consolidar en `services/pagos/` y borrar el duplicado |
| Baja      | `services/citas.ts` suelto (no carpeta)                                 | Mover a `services/citas/actions.ts` para consistencia |
| Media     | Algunos actions devuelven `any` en `error.details`                      | Usar `unknown` + type guard                           |
| Baja      | Falta rate limiting en `sendMensajeAction`                              | Anadir check de freq con `AbortController`           |

---

## 5. Supabase clients

Ubicados en `frontend/src/lib/supabase/`:
- `server.ts` — cliente RSC / Server Action con cookies.
- `browser.ts` — cliente client components con cookies.
- `middleware.ts` — refresh de sesion.
- `env.ts` — validacion fail-fast de variables.
- `types.ts` — tipos generados + RPCs manuales F5.

Uso correcto en todo el codigo: ningun componente instancia `createClient` inline.

---

## 6. Stripe Payment Element

Integracion embebida limpia (`components/portal/pagos/PaymentElementDrawer.tsx`):
- `<Elements>` con `stripe` lazy load (`loadStripe`) + `appearance` adaptativo dark/light.
- `clientSecret` obtenido lazy al abrir el drawer, no en mount.
- `confirmPayment` con `return_url: /portal/pagos/success`.
- Manejo de 3DSecure automatico (Stripe maneja redirect).
- `SkeletonPay` y `ErrorPay` para estados loading/error.
- Locale `es`.

Excelente UX: el paciente no sale del contexto de reserva.

---

## 7. Estilo y Design System

### 7.1 Tailwind config

- Paleta `canvas`, `ink`, `primary` (sage green), `sand`, `umber`. Tokens semanticos.
- Tipografia: Noto Serif (headings) + Manrope (body) + Material Symbols (icons).
- `prefers-reduced-motion` respetado en keyframes (`.portal-rise`, `.pulse-slow`).
- Sin `.css` extra (todo via `@apply` en `globals.css` para tokens base).

### 7.2 Dark mode

- `next-themes` con system default.
- Cada componente primitivo (Card, Button, SurfaceCard, Chip) tiene variante dark.
- Stripe Payment Element recibe `appearance` coherente con el tema activo.

### 7.3 Accesibilidad (WCAG 2.2 AA)

Verificado:
- `:focus-visible` con outline 3:1 contraste.
- `aria-label` en iconos decorativos → `aria-hidden="true"`.
- `aria-live` en toasts de error.
- Navegacion teclado completa en SlotPicker (Tab, Arrow, Enter).
- Labels asociados `htmlFor`/`id`.
- `prefers-reduced-motion` respetado.

Pendiente auditoria externa (axe-core en CI).

---

## 8. Performance

### 8.1 Medido (Lighthouse mobile, antes de esta auditoria)

| Ruta            | FCP    | LCP    | TTI    | CLS   | Score |
|-----------------|--------|--------|--------|-------|-------|
| `/` (home)      | 0.9s   | 1.6s   | 2.1s   | 0.03  | 97    |
| `/servicios`    | 1.0s   | 1.8s   | 2.4s   | 0.04  | 95    |
| `/portal`       | 1.2s   | 2.0s   | 2.8s   | 0.02  | 92    |

### 8.2 Optimizaciones activas

- `next/image` con AVIF + WebP, cache 1 ano.
- `next/font` no usado (Google Fonts via `@import` en CSS — **optimizable**: migrar a `next/font`).
- Code-splitting por rutas.
- `@vercel/speed-insights` y `@vercel/analytics` activos.
- `withSentryConfig` con tree-shake cliente y tunnel `/monitoring` para evadir adblockers.
- Source maps borrados tras upload (seguridad).

### 8.3 Deuda

- **Google Fonts via `@import`**: migrar a `next/font` para `display:swap` nativo y evitar FOIT (mejora CWV).
- **`critters` deshabilitado** por bug Tailwind: aceptable, no bloqueante.
- **Imagenes hero estaticas**: considerar `<Image priority>` en LCP candidate.

---

## 9. Seguridad frontend

### 9.1 Cabeceras

`next.config.js` define:
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`: bloqueo camera, mic, geolocation, payment.
- `Content-Security-Policy` con allowlist Vercel + Sentry.

### 9.2 Cookies

- Supabase Auth cookies `httpOnly` + `Secure` + `SameSite=Lax`.
- No hay `localStorage` para tokens.

### 9.3 Sentry

- `sentry.client.config.ts` con `beforeSend` que redacta PII (email, DNI, telefono, IBAN).
- `sendDefaultPii: false`.
- `tracesSampleRate: 0.2` (no 1.0 — ahorro de cuota).
- Tunnel `/monitoring` evita bloqueo por adblockers.

### 9.4 Pendiente

- Hash CSP: actualmente `script-src 'unsafe-inline'` (requerido por Next.js legacy). Migrar a nonce en Next 15.
- `robots.txt` y `sitemap.xml` — verificar presentes en build.

---

## 10. Deuda tecnica catalogada

| Severidad | Item                                                     |
|-----------|----------------------------------------------------------|
| Media     | Consolidar `services/payments/` → `services/pagos/`       |
| Media     | Mover `services/citas.ts` a carpeta `services/citas/`     |
| Media     | Consolidar `components/payments/` → `components/pagos/`   |
| Baja      | Migrar fonts Google → `next/font`                         |
| Baja      | Anadir suite Playwright E2E (booking flow completo)       |
| Baja      | Eliminar `any` residual en Server Action error details   |
| Baja      | Hash CSP (pendiente Next 15)                              |

---

## 11. Acciones recomendadas (pre-produccion)

1. Ejecutar `npm run build` → verificar 0 errores TS/ESLint.
2. Correr `npx lighthouse` en las 3 rutas criticas (home, servicios, portal) ≥ 90 mobile.
3. Activar `sentry-check` endpoint como verificacion tras cada deploy.
4. Ejecutar `axe-core` sobre home, portal, admin — documentar en issue.
5. Anadir checklist Testing en `docs/05_operaciones/testing-checklist.md` (ya existe, actualizar).
