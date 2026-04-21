-- ============================================================================
-- 0004_realtime.sql — Configuración Supabase Realtime
-- ----------------------------------------------------------------------------
-- Habilitar replicación en tablas que necesitan suscripciones en vivo:
--   * citas              — calendario admin + portal paciente
--   * agenda_bloqueos    — bloqueos en calendario
--   * agenda_notas_dia   — notas del día
--   * conversaciones     — contador no leídos, last_message_at
--   * mensajes           — chat live
--   * pagos              — estado de pago en checkout
--   * recurso_asignaciones — marcar completado
-- ============================================================================

alter publication supabase_realtime add table public.citas;
alter publication supabase_realtime add table public.agenda_bloqueos;
alter publication supabase_realtime add table public.agenda_notas_dia;
alter publication supabase_realtime add table public.conversaciones;
alter publication supabase_realtime add table public.mensajes;
alter publication supabase_realtime add table public.pagos;
alter publication supabase_realtime add table public.recurso_asignaciones;

-- Replica identity: necesario para que los eventos de UPDATE/DELETE incluyan
-- los campos necesarios para filtrado client-side.
alter table public.citas                replica identity full;
alter table public.agenda_bloqueos      replica identity full;
alter table public.agenda_notas_dia     replica identity full;
alter table public.conversaciones       replica identity full;
alter table public.mensajes             replica identity full;
alter table public.pagos                replica identity full;
alter table public.recurso_asignaciones replica identity full;
