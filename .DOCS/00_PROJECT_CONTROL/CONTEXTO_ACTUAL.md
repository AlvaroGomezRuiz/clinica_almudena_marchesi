# CONTEXTO_ACTUAL — clinica_almudena

## Estado Técnico (baseline actual)

- **FASE 1 — COMPLETADA**:
  - **Seguridad**: secretos movidos a `.env` / `.env.example`; Sentry sin PII por defecto (`send_default_pii` desactivado).
  - **Estructura Frontend**: `PublicHeader` existente y layout reparado.
  - **Tipado Apex (TS)**: eliminación de `any` en middleware/actions críticos con type guards.
  - **SEO + A11y base**: `robots.ts`, `sitemap.ts`, foco visible (`:focus-visible`) restablecido.
  - **Reporte**: `DOCS/REPORTE_EJECUCION_FASE1.md`.

- **FASE 2 — COMPLETADA**:
  - **Cifrado Fernet (SQLAlchemy TypeDecorator)**: tipos cifrados en DB para campos sensibles.
  - **Blind Indexes (HMAC)**: eventos para índices ciegos en `Paciente`.
  - **Contratos estrictos**: Pydantic v2 (extra forbid) + equivalentes TypeScript en frontend.
  - **API de citas**: router v1 con anti-solape y protección JWT.
  - **Puente TS**: `FRONTEND/src/contracts/citas.ts` + cliente `FRONTEND/src/services/citas.ts`.
  - **Plan/guía**: `DOCS/PLAN_FASE_2.md`.

## Reglas vigentes (Cursor `.mdc`)

Rutas detectadas en el repo:

- `cursor/rules/backend_master.mdc.mdc`
- `cursor/rules/frontend_master.mdc`
- `cursor/rules/typescript_strict.mdc`

Nota: existe una regla con doble extensión (`.mdc.mdc`); se considera vigente mientras esté en `cursor/rules/`.

## Skills instaladas (agentes)

Skills detectadas en `.agents/skills/*`:

- `accessibility`
- `frontend-design`
- `shadcn`
- `skill-creator`
- `ui-ux-pro-max`

## Próximo paso (dirección aprobada a nivel de plan)

**Rediseño total de Landing y Portal** con enfoque high-end:

- **Documento maestro**: `DOCS/REINVENCION_VISUAL.md` (plan “Premium Zen”).
- **Objetivo inmediato**: ejecutar el rediseño con **Shadcn + Framer Motion** y estética tipo “Obsidian Assembly” (UI premium, espaciosa, con micro-interacciones).
- **Restricción no negociable**: no romper **contratos API / seguridad / tipado** ya consolidados en Fase 2.

## Variables críticas (recordatorio operativo)

**Los `.env` ya están configurados manualmente**. Puntos clave:

- **Infra (Docker/MySQL)**: `c:\dev\almudena\.env`
  - `MYSQL_ROOT_PASSWORD`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`
- **Backend**: `c:\dev\almudena\BACKEND\.env`
  - `DATABASE_URL`
  - `ENCRYPTION_KEY` (Fernet)
  - `BLIND_INDEX_KEY` (HMAC bidx)
  - `SECRET_KEY`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`
  - `SENTRY_DSN`, `SENTRY_SEND_DEFAULT_PII`
- **Frontend**: `c:\dev\almudena\FRONTEND\.env.local`
  - `NEXT_PUBLIC_API_URL`

Política: **no introducir nuevas variables** sin necesidad; si aparece un requerimiento nuevo, primero se lista y se justifica.

