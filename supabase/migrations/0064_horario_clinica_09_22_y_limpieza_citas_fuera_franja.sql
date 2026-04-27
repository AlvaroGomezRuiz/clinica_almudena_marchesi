-- ============================================================================
-- 0064 — Horario clínica L–V 09:00–22:00 (fin de franja para RPC) y limpieza
--         de citas activas con inicio local Madrid fuera de 09:00–21:59.
-- ============================================================================

update public.horarios_clinica
   set hora_inicio = time '09:00',
       hora_fin = time '22:00',
       updated_at = now()
 where weekday between 1 and 5
   and activo = true;

delete from public.citas
 where activo = true
   and (
     ((inicio at time zone 'Europe/Madrid')::time) < time '09:00'
     or ((inicio at time zone 'Europe/Madrid')::time) > time '21:59'
   );
