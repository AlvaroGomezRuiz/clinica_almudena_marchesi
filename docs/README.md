# Documentación del repositorio

## Propósito de esta carpeta

Centralizar **contexto de proyecto**, **auditorías puntuales**, **informes**, **diseño**, **ingeniería** y **operación**. No es un blog de marketing: los informes mezclan estado “snapshot” (fecha en el propio archivo) con referencias al código.

## Criterio editorial (imparcial)

- Se describe **qué hay**, **qué falló** y **qué quedó pendiente** sin vender la idea de que “es la mejor app del mundo”.
- Tampoco se minimiza el trabajo: hay **RLS**, **cifrado**, **pagos** y **salud**; eso implica rigor y deuda técnica normal.
- Si un documento contradice al código, **manda el código**; abrir issue o PR para alinear el markdown.

## Fechas de referencia

- **7 de abril de 2026:** inicio registrado del **ciclo de entrega actual** en este repositorio (ver `00_proyecto/cronologia.md`, Hito 0).
- Los archivos de auditoría con fecha **2026-04-21** u otras son **fotos** de ese día; no implican que todo siga igual sin revisar.

## Gastos directos anotados (no son el “valor” del software)

Tabla viva en **`00_proyecto/costes-herramientas.md`** (Cursor Pro **21,41 €**, dominio **ampsicologia.es** **8,41 €**, total **29,82 €** en la versión actual de la tabla).

## Mapa de carpetas (después de la reorganización de abril 2026)

| Carpeta | Contenido |
|---------|-----------|
| **`00_proyecto/`** | Cronología, estado y pendientes, costes, plan de remediación QA, verificación por fases. |
| **`01_auditorias/`** | Revisiones por dominio (arquitectura, backend, frontend, base de datos, seguridad/RGPD). Lectura longitudinal: empezar por `arquitectura.md` si llegas nuevo. |
| **`02_informes/`** | Textos para cliente u operación (ejecutivo, E2E, hito 15, reporte de ejecución, valor de reposición del código). |
| **`03_ingenieria/`** | Arquitectura técnica viva, diagramas, GEO/SEO, roadmap. |
| **`04_diseno/`** | Sistema visual. |
| **`05_operaciones/`** | Sentry, testing, alertas, Stripe SEPA. |

## Lectura sugerida (orden práctico)

1. `00_proyecto/estado-y-pendientes.md` — fuente viva de bloqueos y checklist.
2. `03_ingenieria/arquitectura-tecnica.md` — cómo está montado el sistema hoy.
3. `02_informes/ejecutivo-cliente.md` — resumen para negocio (no técnico profundo).
4. `01_auditorias/seguridad-rgpd.md` — riesgos y cumplimiento.
5. `05_operaciones/testing-checklist.md` — verificación manual/automática antes de cambios sensibles.

## Convención de nombres

- Carpetas: prefijo numérico + nombre en **español** (`00_proyecto`, `01_auditorias`, …).
- Ficheros: **kebab-case** en español (ej. `estado-y-pendientes.md`), salvo que el nombre histórico sea cita obligada en un contrato.

## Mantenimiento

- Tras cada hito relevante: actualizar **`estado-y-pendientes.md`** y una línea en **`cronologia.md`** si cambia la línea de tiempo.
- Tras mover o renombrar archivos: actualizar enlaces en **`README.md`** (raíz del repo) y en este índice.
