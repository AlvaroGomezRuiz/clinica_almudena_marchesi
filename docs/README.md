# Documentación del repositorio

Todo el material en **Markdown** vive bajo `docs/` en la **raíz del monorepo** (no bajo `frontend/`). Código: `frontend/`; Supabase: `supabase/`; guía de arranque: `supabase/BOOTSTRAP.md`.

## Propósito

Reunir **estado de proyecto**, **auditorías técnicas**, **informes de negocio**, **ingeniería**, **diseño** y **operación** (Sentry, Stripe, checklists). No es marketing: hechos, fechas y límites conocidos.

## Cómo leerlo (orden práctico)

| # | Ruta | Qué aporta |
|---|------|------------|
| 1 | `00_proyecto/linea-base-producto.md` | Qué entrega el producto hoy |
| 2 | `00_proyecto/estado-y-pendientes.md` | Bloqueos, dominio, variables, checklist operativo |
| 3 | `00_proyecto/cronologia.md` | Hitos técnicos |
| 4 | `03_ingenieria/arquitectura-tecnica.md` | Cómo está cableado el sistema hoy |
| 5 | `01_auditorias/arquitectura.md` | Mapa, stack y decisiones (auditoría) |
| 6 | `01_auditorias/backend.md` | Postgres, RPC, Edge Functions |
| 7 | `01_auditorias/frontend.md` | Next.js, rutas, servicios, E2E |
| 8 | `01_auditorias/base-de-datos.md` | Migraciones y tablas (catálogo) |
| 9 | `01_auditorias/seguridad-rgpd.md` | Cumplimiento y riesgos |
| 10 | `02_informes/ejecutivo-cliente.md` | Informe de negocio (clínica) |
| 11 | `02_informes/valor-reposicion-software.md` | Valor de reposición (ingeniería) |
| 12 | `05_operaciones/checklist-produccion.md` | **Un solo checklist:** operación, QA staging, E2E, go-live |
| 13 | `03_ingenieria/geo-y-seo.md` | SEO/GEO. Auditoría local: carpeta **`.GEO/`** (si está en el clon); ver `cronologia` Hito 16. |

## Mapa de carpetas

| Carpeta        | Contenido principal |
|----------------|----------------------|
| `00_proyecto/` | Línea base, estado, cronología, costes (sin duplicar informes) |
| `01_auditorias/` | `arquitectura`, `backend`, `frontend`, `base-de-datos`, `seguridad-rgpd` |
| `02_informes/`   | `ejecutivo-cliente`, `valor-reposicion-software` |
| `03_ingenieria/` | Técnica, diagramas, SEO, roadmap, estructura `src/` |
| `04_diseno/`     | Sistema visual |
| `05_operaciones/`| Sentry, Stripe, alertas, SEPA, **checklist unificado** |

## Criterio editorial

- Si algo **contradice** al **código** o a **Supabase**, gana el repositorio y se abre **issue/PR** para bajar el doc.
- **Tablas y listas:** alineación visual; una sola “fuente de verdad” por concepto.
- **Gastos** (Cursor, dominio): `00_proyecto/costes-herramientas.md`.
- Nombres de fichero: **kebab-case** en español.

## Mantenimiento

Tras un cambio de producto: `estado-y-pendientes.md` y, si aplica, línea en `cronologia.md`. Tras reordenar `docs/`: actualizar este fichero y `README.md` de la raíz.
