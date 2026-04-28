-- ============================================================================
-- 0071_remove_bloqueo_temporal_constraint.sql
-- ----------------------------------------------------------------------------
-- El usuario no quiere que las citas en 'bloqueo_temporal' (durante el pago)
-- bloqueen la agenda para otros clientes, ya que si abandonan el pago la hora
-- se queda perdida ("quiero que las horas sean reales 100 por 100").
--
-- Solucion:
-- 1. Eliminar la constraint 'citas_no_solape' actual.
-- 2. Recrearla incluyendo SOLO 'confirmada' y 'completada'.
-- ============================================================================

alter table public.citas drop constraint if exists citas_no_solape;

alter table public.citas
  add constraint citas_no_solape
  exclude using gist (
    tstzrange(inicio, fin) with &&
  ) where (activo = true and estado in ('confirmada', 'completada'));
