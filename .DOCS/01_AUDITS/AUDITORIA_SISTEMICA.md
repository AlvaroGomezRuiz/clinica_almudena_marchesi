# AUDITORÍA SISTÉMICA 360° — `clinica_almudena` (Nivel Dios)

## Mapa Mental (Mermaid) — Interconexión + Flujo de datos + Zonas críticas

```mermaid
mindmap
  root((clinica_almudena))
    FRONTEND (Next.js 14 / App Router)
      Rutas públicas
        "/"
        "/enfoque"
        "/servicios"
        "/contacto"
      Rutas privadas
        "/login"
        "/registro-paciente"
        "/portal/*"
        "/dashboard/*"
        "/admin/*"
      Middleware de seguridad
        CSP + headers
        Gate pago (access-status)
        Sliding session refresh
      UI/UX
        Tailwind v3 (tokens custom)
        Material Symbols (Google Fonts import)
      SEO/IA (déficit)
        Sin sitemap/robots
        Metadata mínima
        Sin Schema.org JSON-LD
      A11y (riesgo)
        Focus styles rotos (global CSS)
        Iconografía sin aria-hidden sistemático
    BACKEND (FastAPI)
      API v1
        /auth
          login
          refresh (sliding)
          admin/status
          admin/verify-totp
          register/start
          register/verify-otp
        /pacientes
        /citas
        /pagos
        /stripe
        /facturas
        /mensajes
        /recursos
      Seguridad
        JWT + sesiones DB (jti)
        MFA (TOTP)
        Rate limiting (slowapi)
        CORS (localhost)
        Sentry (PII ON) ⚠️
      Datos clínicos
        Cifrado Fernet (ENCRYPTION_KEY) ⚠️
      Scripts (alto riesgo)
        Credenciales hardcodeadas + prints
    DB (MySQL 8)
      docker-compose
        Passwords en claro ⚠️
      SQLAlchemy + Alembic
    Flujo de datos (alto nivel)
      Navegador --> FRONTEND middleware --> BACKEND /api/v1/* --> MySQL
    Áreas críticas (prioridad)
      Seguridad/Secretos
      SEO/Indexabilidad + citabilidad IA
      A11y + focus/teclado
      Tipado estricto (no any) + contratos FE<->BE
      Performance (fonts remotas / CSP / imágenes / cache)
```

```mermaid
flowchart LR
  U[Usuario / Navegador] -->|GET /ruta| N[Next.js App Router]
  N -->|middleware.ts: CSP + auth gate| MW[Middleware]
  MW -->|si necesita estado pago/admin| AS[GET /api/v1/pagos/access-status]
  MW -->|si token medio consumido| RF[POST /api/v1/auth/refresh]
  N -->|RSC/Client components| UI[Render UI]
  UI -->|axios/fetch| API[FastAPI /api/v1/*]
  API -->|SQLAlchemy| DB[(MySQL 8)]
  API -->|Sentry (send_default_pii=true)| SN[(Sentry)]

  classDef red fill:#ffebee,stroke:#b71c1c,color:#000;
  classDef amber fill:#fff8e1,stroke:#f57f17,color:#000;
  classDef green fill:#e8f5e9,stroke:#1b5e20,color:#000;

  class AS,RF,API,DB,SN red;
  class MW amber;
  class UI green;
```

## Semáforo de Estado (Rojo / Amarillo / Verde)

- **Seguridad (Backend + Infra)**: **ROJO**
  - **Secretos expuestos**: `docker-compose.yml` contiene `MYSQL_ROOT_PASSWORD`, `MYSQL_USER`, `MYSQL_PASSWORD` en claro (y trivial).
  - **Credenciales hardcodeadas**: scripts (`BACKEND/scripts/rebuild_system.py`) imprimen credenciales y contienen contraseñas embebidas.
  - **PII a Sentry**: `BACKEND/main.py` activa `send_default_pii=True` (inaceptable por defecto en clínica: riesgo RGPD/LOPD).
  - **Cifrado mal validado**: `ENCRYPTION_KEY` solo se valida como “no vacío”; Fernet exige key base64url 32 bytes. Esto es bomba de arranque o, peor, falsa sensación de seguridad.

- **Cumplimiento de Reglas Apex (TS estricta)**: **AMARILLO → ROJO si se tolera deuda**
  - **`any` presente** (prohibido por estándar): `FRONTEND/src/app/dashboard/page.tsx`, `FRONTEND/src/middleware.ts`, `FRONTEND/src/services/auth/*`, `FRONTEND/src/app/admin/layout.tsx`.
  - **Backend**: `typing.Any` usado en `BACKEND/schemas/stripe_schema.py` (tolerable si se encapsula con validación estricta; ahora no lo está).

- **Arquitectura Frontend (Zenith)**: **AMARILLO**
  - **Import roto / estructura inconsistente**: `FRONTEND/src/app/layout.tsx` importa `@/components/public/PublicHeader` pero ese archivo **no existe** en `src/components` (build debería fallar).
  - **Config de API inconsistente**: `FRONTEND/src/services/axios.ts` usa `baseURL: 'http://localhost:8000'` hardcode; el middleware usa `BACKEND_API_URL` con fallback distinto. Señal de configuración frágil.

- **SEO + Citabilidad IA (“geo_seo_claude”)**: **ROJO**
  - **No hay `robots.txt` ni `sitemap`** (no existen en `public/` ni `src/app/*`).
  - **Metadata mínima**: las páginas revisadas solo definen `title`. Sin `description`, `openGraph`, `twitter`, `alternates/canonical`, `robots`, `keywords` (si aplica).
  - **Sin Schema.org JSON-LD**: cero rastros de `application/ld+json`.
  - **“geo_seo_claude”**: no hay artefacto local referenciable (no encontrado en codebase). Resultado: la auditoría SEO/IA queda limitada a evidencias del repo.

- **Accesibilidad (WCAG 2.2 / a11y)**: **ROJO**
  - **Focus visible roto**: `globals.css` aplica `input:focus, textarea:focus { outline-none ring-0 ... }` sin alternativa `:focus-visible`. Esto destruye navegabilidad por teclado (WCAG 2.4.7 / 2.4.11).
  - **Links placeholder**: múltiples `href="#"` (legal/avisos) = foco inútil, confusión, mala semántica.
  - **Iconografía**: `material-symbols-outlined` frecuente; falta patrón global `aria-hidden="true"` cuando el icono es decorativo.

- **Performance (CWV / UX)**: **AMARILLO**
  - **Fonts via `@import`** en CSS (`globals.css`) desde Google Fonts: penaliza rendimiento/TTFB/FOIT/privacidad; además tensiona CSP.
  - **CSP**: en `FRONTEND/src/middleware.ts` `script-src 'unsafe-inline'` (y en dev `'unsafe-eval'`). Es una concesión razonable en dev, pero en prod se debería poder endurecer (y auditar dependencias).
  - **Imágenes remotas**: se usan `next/image` con `priority` y assets externos; correcto técnicamente, pero requiere control de LCP (evidencia de exceso de imágenes “editorial” en above-the-fold).

- **Conversión (CRO / funnel)**: **AMARILLO**
  - **CTA principal** existe (“Reserva tu primera cita”), pero hay fricción: portal/registro obligatorio se comunica como “búnker” (copy potente pero puede espantar a perfiles no técnicos).
  - **Legal**: enlaces vacíos (no llevan a páginas reales) reduce confianza.
  - **Precios**: `CLINIC_SESSION_PRICE_LABEL` oculta precio en producción (`— €`). Esto puede bajar conversión si el público espera claridad.

## Top 5 Critical Fixes (máximo impacto inmediato)

1) **Eliminar secretos hardcodeados y rotar credenciales**
   - Sustituir passwords en `docker-compose.yml` por variables (`.env` fuera de git).
   - Rotar **ya**: MySQL root/user, cualquier `ADMIN_PASSWORD/PACIENTE_PASSWORD` embebido en scripts.

2) **RGPD/LOPD: Sentry sin PII por defecto**
   - Cambiar `send_default_pii` a `false` y definir scrubbing/allowlist explícita.
   - Prohibir logging de datos clínicos. Auditar `logger.info` y cualquier payload en errores.

3) **A11y: restaurar foco visible y navegación teclado**
   - Revertir el “no outline” global o moverlo a `:focus`/`:focus-visible` correcto.
   - Añadir patrón `sr-only`/labels; eliminar `href="#"` o reemplazar por rutas reales.

4) **SEO/IA: indexabilidad + entidad local (Madrid/Moncloa)**
   - Añadir `robots.txt`, `sitemap.xml` o `src/app/sitemap.ts`, `src/app/robots.ts`.
   - Implementar `Metadata` completa (description, OG, canonical, robots) y **Schema.org**:
     - `LocalBusiness`/`MedicalBusiness` (según legalidad), `Person` (Almudena), `WebSite`, `WebPage`, `FAQPage` si aplica.

5) **Tipado/contratos FE↔BE: exterminio de `any`**
   - Reemplazar casts `as any` por `unknown` + type guards (o Zod ya disponible en frontend).
   - Definir DTOs compartidos (aunque sea duplicado por ahora) para `access-status`, `admin/status`, login/register responses.

## Roadmap @superpowers (3 fases)

### Fase 1 — Estructura (blindaje de base)
- **Secretos y configuración**: `.env` real para docker-compose y backend; eliminar hardcodes; rotación.
- **Build integrity**: arreglar imports rotos (`PublicHeader` inexistente) y normalizar el “API baseURL” (una sola fuente de verdad).
- **Observabilidad segura**: Sentry sin PII; niveles de logs por entorno.

### Fase 2 — Lógica (contratos + seguridad de verdad)
- **Contratos**: tipado estricto en frontend (0 `any`), validación de respuestas.
- **Cifrado**: validar `ENCRYPTION_KEY` en arranque (formato Fernet), fail-fast real; no devolver “[DATOS CORRUPTOS…]” como valor silencioso en flujos críticos.
- **Auth**: unificar parsing JWT; evitar lógica duplicada en middleware vs layouts.

### Fase 3 — Pulido Visual (consistencia + UX Apple-grade)
- **Design system**: consolidar tokens (ya existen) y estandarizar componentes (ideal: introducir shadcn/ui si se decide).
  - Actualmente **no hay `components.json`**, así que no hay shadcn instalado: hoy es UI “a mano” (inconsistente y caro de mantener).
- **A11y premium**: estados de foco, roles correctos, labels persistentes, errores accesibles, target size.
- **Performance**: sacar Google Fonts de `@import`, definir estrategia de fonts, revisar LCP/CLS, limpiar CSP para prod.

## Evidencia (archivos y hallazgos clave)

- **Secretos en claro**: `docker-compose.yml`
- **PII a Sentry**: `BACKEND/main.py` (`send_default_pii=True`)
- **Hardcoded creds**: `BACKEND/scripts/rebuild_system.py` (contraseñas + prints)
- **Tipado roto (`any`)**:
  - `FRONTEND/src/app/dashboard/page.tsx`
  - `FRONTEND/src/middleware.ts`
  - `FRONTEND/src/services/auth/actions.ts`
  - `FRONTEND/src/services/auth/registerActions.ts`
  - `FRONTEND/src/app/admin/layout.tsx`
- **SEO incompleto**:
  - No existen `public/robots.txt`, `public/sitemap.xml`, `src/app/sitemap.ts`, `src/app/robots.ts`
  - Sin JSON-LD en frontend
- **A11y foco**: `FRONTEND/src/app/globals.css` (elimina outline sin alternativa)
- **Import roto**: `FRONTEND/src/app/layout.tsx` importa `@/components/public/PublicHeader` inexistente

