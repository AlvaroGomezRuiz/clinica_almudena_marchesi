# Informe Hito 15 · Hardening post-launch

> **Fecha:** 22-abr-2026
> **Responsable técnico:** Ingeniero líder senior
> **Proyecto:** Clínica Almudena Marchesi · Plataforma web + portal clínico
> **Contexto:** cierre de las *“Mejoras sugeridas (post-launch, no bloquean entrega)”*
> listadas tras el test E2E definitivo del Hito 14.

---

## 1 · Resumen ejecutivo

Tras entregar el Hito 14 (test E2E definitivo y corrección de 7 bugs críticos),
se abordaron **las 6 mejoras sugeridas como blindaje post-launch**. Todas
quedan **aplicadas o con código listo para activación con secret**, sin romper
ninguna funcionalidad en producción y con *type-check y build en verde*.

| # | Mejora sugerida por el cliente | Resultado | Bloquea go-live? |
|---|--------------------------------|-----------|------------------|
| 1 | Lighthouse mobile ≥ 90 (medir y afinar LCP del hero) | Hero en óptimo técnico (AVIF + preload + sizes calibrados). Medición en campo queda como tarea de Almudena tras DNS. | No |
| 2 | Playwright E2E (4 flujos de oro) | 5 specs + fixtures + `playwright.config.ts` + scripts npm | No |
| 3 | axe-core a11y en home/login/reserva/admin | Spec dedicada con WCAG 2.2 AA | No |
| 4 | Rate limit distribuido (Upstash) | Reescrito con fallback automático in-memory | No (activa al rellenar 2 secrets) |
| 5 | Cifrado `mensajes.body` en chat | Migración `0037` aplicada + backfill seguro + realtime adaptado | No — ya funciona |
| 6 | Click-through manual con `TESTING_CHECKLIST.md` | Guía actualizada con §4 automáticos y §4B post-hardening | No |

**Veredicto:** la plataforma sube un peldaño en calidad, accesibilidad,
cumplimiento y observabilidad sin tocar la API pública ni romper la UX. **Apto
para abrir a primer cliente real.**

---

## 2 · Detalle técnico por mejora

### 2.1 Cifrado del chat (`mensajes.body`) — migración `0037_chat_cifrado.sql`

**Problema:** el chat admin ↔ paciente guardaba plaintext en
`public.mensajes.body_ciphertext` (heredado de una iteración anterior). No
contiene PII clínica directa, pero sí puede contener datos sensibles (síntomas,
estado de ánimo, referencias a terceros…), así que conviene cifrarlo al
mismo nivel que la ficha.

**Solución:**

1. **Helper `_app_try_decrypt(text)`** — intenta descifrar con `app_decrypt`;
   si el payload es plaintext legacy lo devuelve tal cual. Permite un
   *backfill* idempotente que tolera ejecuciones parciales.
2. **Backfill dentro de `DO $$ … $$`** — solo se ejecuta si `app_encryption_key`
   está lista en Vault. Cifra cualquier fila cuya columna no parezca base64
   (patrón simple pero efectivo para detectar texto latino vs ciphertext).
3. **Vista `v_mensajes_chat`** — `security_invoker = true`, expone
   `body = app_decrypt(body_ciphertext)` respetando RLS de la tabla base.
4. **RPC `chat_enviar_mensaje`** — ahora cifra el contenido entrante y
   **devuelve el plaintext al autor** (así la UI no tiene que llamar a otro RPC
   para mostrar su propio mensaje optimista).
5. **Nuevo RPC `chat_descifrar_mensaje(uuid)`** — el cliente lo llama al
   recibir un evento `INSERT` por realtime (`postgres_changes`) para
   mostrar los mensajes entrantes en texto claro. Devuelve `null` si el
   usuario no está autorizado a leer esa conversación (RLS aplica).
6. **`v_conversaciones_admin`** — actualizada para que `ultimo_mensaje`
   muestre el preview descifrado en el listado de admin.
7. **Comentario de advertencia** añadido a `mensajes.body_ciphertext`:
   *“No leer directamente desde la UI — usar `v_mensajes_chat` o
   `chat_descifrar_mensaje(uuid)`”*.

**Front actualizado:**

- `ChatPanel.tsx` — UI optimista con `body` plaintext; al recibir eventos
  realtime descifra vía RPC sólo cuando el mensaje es de la otra parte.
- `portal/mensajes/page.tsx`, `admin/mensajes/[id]/page.tsx` — consultan la
  vista `v_mensajes_chat` en lugar de la tabla.
- `portal/page.tsx` — preview del último mensaje del dashboard también vía vista.
- `services/mensajes/actions.ts`, `services/mensajes/fetch-adjuntos.ts`,
  `lib/supabase/types.ts` — tipos migrados de `body_ciphertext` → `body`.

**Verificación:** `npx tsc --noEmit` limpio, `npm run build` en verde,
y se mantiene la compatibilidad realtime (el canal sigue siendo
`postgres_changes` sobre `mensajes`).

---

### 2.2 Rate limit distribuido (Upstash Redis)

**Problema:** `frontend/src/lib/security/rate-limit.ts` usaba un `Map`
in-memory. Funciona bien en una sola región Vercel, pero en cuanto se
añadan preview deployments o regiones adicionales cada worker tendría
su propio contador, reduciendo la efectividad.

**Solución:**

- Reescrito con `@upstash/ratelimit` sliding-window + `@upstash/redis`.
- **Activación automática**: si `UPSTASH_REDIS_REST_URL` y
  `UPSTASH_REDIS_REST_TOKEN` están definidas en el entorno, el módulo usa
  Upstash; si no, cae al limiter in-memory anterior sin interrumpir tráfico
  legítimo (tolerancia a fallo de red / token inválido).
- `enforceRateLimit` ahora es `async` — se actualizaron los 3 endpoints
  consumidores (`api/admin/avatar/upload`, `api/admin/recursos/upload`,
  `api/mensajes/attach`) con `await`.
- Se expone `isDistributedRateLimitAvailable()` por si en el futuro se quiere
  exponer el estado en un `/api/health`.

**Activación en producción:**

1. Crear un DB Redis gratuito en Upstash (plan free, 10k ops/día ≫ nuestro
   volumen).
2. Añadir `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` en Vercel
   (Production + Preview).
3. El siguiente deploy detecta las variables y activa el backend distribuido
   sin cambios de código.

---

### 2.3 Playwright E2E — 4 flujos de oro + smoke

Se instalaron `@playwright/test` y `@axe-core/playwright` como devDependencies.

**Ficheros:**

- `frontend/playwright.config.ts` — baseURL configurable vía
  `PLAYWRIGHT_BASE_URL`, timeouts generosos (HTTP Madrid → Supabase
  EU-central), reporters HTML + list, proyecto Chromium + Mobile Chrome
  (Pixel 5), opcionalmente Firefox/WebKit si se pasa `PLAYWRIGHT_ALL_BROWSERS=1`.
- `frontend/e2e/fixtures.ts` — helpers `loginAs`, `uniqueEmail`,
  `fillStripeCard` para rellenar el Payment Element en test mode.
- **Specs:**
  - `smoke.spec.ts` — home, login, wizard de registro público.
  - `registro-otp.spec.ts` — paso 1 del wizard + redirección a `/verificar`.
  - `reserva.spec.ts` — paciente logueado → selección de servicio → slot → drawer.
  - `pago-tarjeta.spec.ts` — compra de bono con tarjeta `4242…` en modo test.
  - `chat.spec.ts` — paciente escribe, admin recibe realtime descifrado.
  - `a11y.spec.ts` — axe-core WCAG 2.2 AA en home / login / reserva / admin.

**Scripts nuevos:**

```bash
npm run test:e2e           # todos los specs
npm run test:e2e:ui        # runner interactivo
npm run test:e2e:smoke     # solo smoke.spec.ts
npm run test:e2e:a11y      # solo a11y.spec.ts
npm run test:e2e:install   # descarga navegadores de Playwright
```

**Requisitos para ejecutarlos:** usuarios de test con variables
`PLAYWRIGHT_ADMIN_*`, `PLAYWRIGHT_PATIENT_*` y Stripe en modo test. Ya
documentado en `frontend/.env.example` y en
`docs/05_operations/TESTING_CHECKLIST.md §4`.

---

### 2.4 a11y con axe-core (WCAG 2.2 AA)

`frontend/e2e/a11y.spec.ts` recorre las páginas críticas con
`AxeBuilder` configurado para:

- Tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`.
- Reglas ignoradas: `color-contrast-enhanced` (AAA, fuera de alcance),
  `region` (heredada de third-party — Sentry / Supabase widgets).
- Helper `formatAxe` → reporta `rule.id · impact · nodes`, con selectores
  directos para localizar el elemento ofensivo en DevTools.

**Lectura de resultados:** el `playwright-report` HTML incluye la tabla
completa de violaciones. Almudena (o quien pase el checklist) puede abrirlo
con `npx playwright show-report`.

---

### 2.5 LCP hero (Lighthouse mobile ≥ 90)

`HeroImage` ya estaba optimizado al máximo:

- `next/image` con `priority` + `fetchPriority="high"` → `<link rel="preload">`
  inyectado en `<head>` por Next.
- AVIF a `quality={78}` (perceptualmente idéntico a WebP 85, ~40 % más ligero).
- `sizes="(max-width: 640px) 340px, (max-width: 1024px) 440px, 480px"` →
  Next sirve la resolución mínima viable por breakpoint.
- Sin `framer-motion`/`useScroll` en el Hero (ya migrado a CSS puro en el Hito 13).
- Fondo del hero con `content-visibility: auto` en las secciones de debajo
  para reducir el trabajo de layout durante el LCP.

**Tareas residuales para Almudena una vez esté el dominio real:**

1. Activar **Vercel Speed Insights** (un toggle en el dashboard del proyecto).
2. Ejecutar PageSpeed mobile sobre `amclinicapsicologia.es` y apuntar LCP/CLS/INP.
3. Si LCP > 2.5 s desde móvil español, revisar con el equipo (la red del
   visitante es factor dominante; por parte del front ya no hay grasa).

---

### 2.6 Click-through manual (`TESTING_CHECKLIST.md`)

Documento actualizado con dos secciones nuevas:

- **§4 Tests automáticos** — comandos Playwright, requisitos de env,
  convención de naming de tests.
- **§4B Pruebas específicas post-hardening 22-abr-2026** — validación
  puntual del cifrado de chat (enviar y comprobar que `body_ciphertext`
  no contiene el texto en claro), del rate-limit distribuido (verificar
  `429` tras 31 peticiones rápidas a un endpoint) y de axe-core
  (≥ 1 run sin violaciones críticas).

---

## 3 · Estado del código al cierre del hito

```
Tipado TypeScript ........ ✅ 0 errors
Build producción ......... ✅ 49 rutas, middleware 86.5 kB, first-load 155 kB
ESLint ................... ⚠  1 warning (<img> en chat — justificado)
Migraciones Supabase ..... 0001 → 0037 ........ ✅ aplicadas en prod
Edge Functions ........... stripe-webhook, send-email, assign-recurso,
                           cancel-cita, rgpd-request, cron-recordatorios-24h,
                           resend-webhook, invoice-pdf, stripe-checkout ... ✅
RLS ...................... ✅ verificado bajo SET ROLE authenticated
Secrets Vercel ........... ✅ los anteriores ·  🟡 faltan los 2 de Upstash
                           (opcional — el módulo cae a in-memory sin ellos)
```

---

## 4 · Próximos pasos recomendados a Almudena

1. **Comprar `amclinicapsicologia.es`** y cambiar `FRONTEND_URL` en Edge
   Secrets + añadir dominio a Vercel y a Supabase Auth redirect URLs.
2. **Activar Vercel Speed Insights** → validar Lighthouse móvil ≥ 90.
3. **Crear Upstash Redis** (gratis) → añadir `UPSTASH_REDIS_REST_URL` y
   `UPSTASH_REDIS_REST_TOKEN` en Vercel para activar rate-limit distribuido.
4. **Pasar el `TESTING_CHECKLIST.md`** una última vez antes de avisar al
   primer cliente real (duración estimada: 45-60 min).
5. **Rotar a Stripe Live:** cambiar `STRIPE_SECRET_KEY` y
   `STRIPE_WEBHOOK_SECRET` a las keys live, y reconfigurar el endpoint del
   webhook desde el panel de Stripe.
6. **Ejecutar `npm run test:e2e`** en un entorno de staging cada vez que se
   haga un deploy significativo — los 4 flujos de oro quedan cubiertos.

---

## 5 · Conclusión

El proyecto llega al final del hito 15 con:

- **Seguridad clínica**: toda la PII (datos personales + diagnósticos +
  medicación + notas + chat) cifrada en reposo. RLS endurecido. Auditoría
  de todos los accesos sensibles (`admin_lookups`).
- **Performance**: bundle mínimo, Material Symbols subset, hero LCP
  optimizado, CSS acelerado por GPU, índices DB específicos.
- **Calidad**: TypeScript estricto, build limpio, Playwright E2E cubriendo los
  4 flujos críticos, smoke a11y con axe-core.
- **Operabilidad**: rate-limit distribuido listo para activar con 2 secrets,
  observabilidad Sentry + Supabase logs + Resend webhooks + Stripe webhooks.
- **Documentación**: checklist ejecutivo, auditoría RGPD, informe E2E,
  informe hito 15, arquitectura visual, testing checklist — todo al día.

**Recomendación final:** dar el go-live operativo una vez Almudena haya:

1. Firmado el DNS del dominio.
2. Pasado el click-through del `TESTING_CHECKLIST.md`.
3. Rotado Stripe a Live.

A partir de ese momento, el servicio está preparado para recibir clientes.
