-- 0021_security_lints_fix
-- Ajustes de seguridad detectados por Supabase Advisor.
-- (1) Vista v_pacientes_resumen_admin: usar RLS del invocador (no del propietario).
-- (2) Fijar search_path explícito en funciones que aún lo tenían mutable.

begin;

-- (1) Garantizar que la vista aplica RLS del usuario que la consulta.
alter view public.v_pacientes_resumen_admin set (security_invoker = true);

-- (2) search_path fijo en funciones trigger/utilitarias que aún carecían de él.
alter function public.tg_set_updated_at()
  set search_path = public, pg_temp;
alter function public.tg_citas_notas_paciente_touch()
  set search_path = public, pg_temp;
alter function public.tg_pacientes_lock_admin_fields()
  set search_path = public, pg_temp;
alter function public.emails_log_set_dedupe_key()
  set search_path = public, pg_temp;
alter function public.tg_rgpd_requests_touch()
  set search_path = public, pg_temp;
alter function public.dia_bloqueado_por_plantilla(date)
  set search_path = public, pg_temp;

commit;
