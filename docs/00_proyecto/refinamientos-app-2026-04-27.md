# Refinamientos de la app (27-abr-2026)

> **Qué es esto:** segunda tanda de **ajustes y refinamientos** sobre la línea base (`linea-base-producto.md`). No redefine el alcance del producto; documenta pulido de UX, correcciones de datos mostrados, flujos administrativos y coherencia RGPD. La tanda anterior sigue en **`refinamientos-app-2026-04-26.md`** (Hito 22).

## Resumen por área

| Área | Ajuste |
|------|--------|
| **Configuración admin → auditoría** | El log de accesos a datos sensibles resuelve el **nombre del paciente** vía `pacientes.id` → `user_id` → `profiles.display_name` (antes se confundía `paciente_id` con `profiles.id`). El enlace a `/admin/pacientes/[id]` ya era correcto; mejora la **coherencia nombre ↔ ficha**. |
| **Ficha paciente → adjuntos** | **Subida** de archivos al bucket privado `paciente-adjuntos` con validación (magic bytes PDF/imagen, OOXML ZIP, OLE legado), **inserción** en `paciente_adjuntos`, **descarga** por URL firmada (solo admin). Componente cliente `PacienteAdjuntosCard`. Rutas: `POST /api/admin/pacientes/[pacienteId]/adjuntos`, `GET /api/admin/pacientes/adjuntos/[adjuntoId]`. |
| **Agenda admin → cancelación** | En el panel de **resumen de cita** (`CitaResumenSheet`) el admin puede **cancelar** citas `confirmada` / `bloqueo_temporal` con el mismo flujo que el portal (`CitaCancelButton`, modo admin, opción forzar reembolso). Tras la RPC `cancelar_cita`, la cita deja de listarse y el **hueco** vuelve a disponibilidad (comportamiento ya definido en backend; la mejora es **descubribilidad y flujo** desde la agenda). |
| **Panel mensajes / UI admin** | Refinamientos de conversación (p. ej. adjuntos visuales, copy “En vivo”, layout Info en móvil) alineados al uso diario del panel. |
| **Calendario / citas** | Comportamiento acotado a citas **pagadas** donde aplica; gestión de **cancelación de slot** y **iconografía** en tarjetas según estado. |
| **Listados admin** | Tablas pacientes/bonos: legibilidad (**zebra**), columna **última cita**, alineación; refinamientos de **biblioteca** (filtros/accesibilidad) donde se tocó el módulo. |
| **Portal / cabecera** | Ajustes de **tipografía cabecera** y botones de acción (p. ej. guardar) en flujos de perfil/configuración. |
| **Pagos y documentación fiscal** | Envío **email** post-pago (Resend) y **PDF de factura** cuando el flujo lo contempla (`receipt-email-action` y cadena asociada). |
| **Reservas** | Aviso / modal cuando la reserva queda **bajo umbral temporal** (p. ej. &lt;48h respecto a política), sin cambiar la regla de negocio ya documentada en `0046`. |
| **Web pública** | Modo claro: **texto legible** (contraste) en bloques que dependían de grises suaves. |
| **Supabase / migraciones** | Corrección de **numeración duplicada**: coexistían dos ficheros `0062_*.sql` (`cuadricula_reserva_slots` y `terapeuta_public_profile`). Solo puede existir **una versión por número** en `schema_migrations`; el `db push` fallaba con `23505` al registrar la segunda. La RPC **`terapeuta_public_profile`** pasó a **`0065_terapeuta_public_profile.sql`** (el contenido SQL es idéntico; solo cambia el prefijo). Tras eso, `supabase db push` aplica **`0065`** sin conflicto. **Regla:** un único prefijo numérico por archivo en `supabase/migrations/`. |

## Código de referencia (principal)

- Auditoría config: `frontend/src/app/admin/configuracion/page.tsx`
- Adjuntos: `frontend/src/components/admin/ficha/PacienteAdjuntosCard.tsx`, `frontend/src/lib/security/paciente-adjunto-validation.ts`, `frontend/src/app/api/admin/pacientes/[pacienteId]/adjuntos/route.ts`, `frontend/src/app/api/admin/pacientes/adjuntos/[adjuntoId]/route.ts`
- Agenda cancelar: `frontend/src/components/admin/agenda/CitaResumenSheet.tsx` + `frontend/src/components/citas/CitaCancelButton.tsx`
- RPC terapeuta (chat): `supabase/migrations/0065_terapeuta_public_profile.sql` (`create or replace function public.terapeuta_public_profile`)

## Relación con otros documentos

- Línea base de producto: `linea-base-producto.md`
- Estado y checklist: `estado-y-pendientes.md`
- Hitos: `cronologia.md` (**Hito 23**)
- Refinamientos previos (26-abr): `refinamientos-app-2026-04-26.md`
