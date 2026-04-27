# Refinamientos de la app (26-abr-2026)

> **Qué es esto:** registro de **ajustes y refinamientos** de producto sobre la línea base (`linea-base-producto.md`). No redefine el alcance del MVP; documenta mejoras de UX, accesibilidad, coherencia horaria y limpieza de datos de prueba.

## Resumen ejecutivo

| Área | Cambio |
|------|--------|
| **Agenda admin (semana)** | Rejilla alineada con **Europe/Madrid**; alturas en px compartidas; franja visual **09:00–21:00**; móvil muestra **nombre** del paciente en la pastilla (detalle en sheet); tablet/desktop con contenido **centrado** y enlace a ficha desde `md+`. |
| **Horario y reservas** | Ventana de inicio de sesión **09:00–21:59** (Madrid) validada en servidor; horarios L–V en base alineados con RPC; migración **0064** (ver abajo). |
| **Web pública** | Tarjetas de pilares (`PhilosophySection`) y metodología (`/enfoque`): **sin iconos**, **título centrado**, cuerpo debajo. |
| **Portales (admin / paciente)** | Menú móvil: **portal a `document.body`**, panel **opaco** y textos **tinta en claro / blanco en oscuro** (`EditorialMobileNav`, `MobileNavDrawer`, `PublicMobileDrawer`); selector de tema segmentado acoplado al modo resuelto. |

## Rutas y código de referencia

- Agenda: `frontend/src/components/admin/agenda/AgendaClient.tsx`
- Hora Madrid + rejilla: `frontend/src/lib/agenda/madrid-wall-clock.ts`, `agenda-week-grid-constants.ts`
- Ventana reservable: `frontend/src/lib/clinic/madrid-booking-window.ts` — usada en `frontend/src/services/citas/actions.ts` (`reservarCitaAction`) y `frontend/src/services/admin/citas-admin-actions.ts`
- Menú móvil: `frontend/src/components/layout/MobileNavDrawer.tsx`, `PublicMobileDrawer.tsx`, `EditorialMobileNav.tsx`
- Público: `frontend/src/components/sections/PhilosophySection.tsx`, `frontend/src/app/(public)/enfoque/page.tsx`

## Base de datos (Supabase)

- **`0064_horario_clinica_09_22_y_limpieza_citas_fuera_franja.sql`**
  - Actualiza `horarios_clinica` (L–V activos): `hora_inicio` 09:00, `hora_fin` 22:00 (extremo usado por `generate_series` en `obtener_disponibilidad` / `obtener_cuadricula_reserva`).
  - **Elimina** filas de `citas` con `activo = true` cuyo `inicio` en **Europe/Madrid** quede fuera de **09:00–21:59** (datos de prueba erróneos).

**Operación:** tras merge, ejecutar migración en el proyecto enlazado (`supabase db push` o flujo CI acordado). Revisar en staging si existían citas reales fuera de franja antes del despliegue.

## Accesibilidad (WCAG)

- El fallo principal corregido en esta ronda: **texto claro sobre panel que se veía claro** (overlay semitransparente + `text-white` fijo). Solución: **fondos opacos** por tema (`bg-canvas` / `dark:bg-[#0a0908]`) y **tokens** `text-ink` / `dark:text-white` en componentes compartidos del drawer.
- Un **pase completo** de auditoría automática (axe / Lighthouse en rutas públicas + portal + admin) sigue siendo recomendable como tarea aparte.

## Relación con otros documentos

- Estado operativo y checklist: `estado-y-pendientes.md`, `05_operaciones/checklist-produccion.md`
- Hitos técnicos: `cronologia.md` (entrada **Hito 22**)
- Índice general: `docs/README.md`
- Refinamientos posteriores (27-abr-2026): **`refinamientos-app-2026-04-27.md`** (Hito 23)
