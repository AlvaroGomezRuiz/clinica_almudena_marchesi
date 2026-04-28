-- ============================================================================
-- 0075 — Jueves: cierre 21:30 (tope); última reserva pareja 75 min a las 20:00
--
-- Objetivo operativo:
--   * `horarios_clinica` jueves (weekday 4): hora_fin 21:30 (antes 22:00 L–V).
--   * Plantilla `DISPONIBILIDAD SOLO JUEVES` (si existe): franja libre jueves
--     hora_fin 21:30 para que slot 20:00–21:15 cumpla plantilla_permite.
--
-- Matemática: Terapia de pareja 75 min → último inicio en rejilla 30 min = 20:00
-- (termina 21:15). 20:30 + 75 min = 21:45 > 21:30 → no reservable.
-- ============================================================================

begin;

update public.horarios_clinica
   set hora_fin = time '21:30',
       updated_at = now()
 where weekday = 4
   and activo = true;

update public.horario_plantillas hp
   set items = sub.new_items,
       updated_at = now()
  from (
    select
      hp2.id,
      jsonb_agg(
        case
          when (elem->>'weekday')::smallint = 4
               and coalesce((elem->>'libre')::boolean, false)
          then jsonb_set(elem, '{hora_fin}', '"21:30"'::jsonb, false)
          else elem
        end
        order by idx
      ) as new_items
      from public.horario_plantillas hp2,
           jsonb_array_elements(hp2.items) with ordinality as t(elem, idx)
     where hp2.nombre = 'DISPONIBILIDAD SOLO JUEVES'
     group by hp2.id
  ) sub
 where hp.id = sub.id;

commit;
