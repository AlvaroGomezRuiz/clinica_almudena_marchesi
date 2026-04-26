-- 0061_citas_pendientes_recordatorio_48h.sql
-- -----------------------------------------------------------------------------
-- Debe ir **después** de 0060: usa el valor de enum `reminder_48h` en el cuerpo
-- de la función; en otra transacción ya no aplica 55P04.
-- -----------------------------------------------------------------------------

create or replace function public.citas_pendientes_recordatorio_48h()
returns table (
  cita_id       uuid,
  paciente_id   uuid,
  user_id       uuid,
  email         text,
  display_name  text,
  servicio      text,
  inicio        timestamptz,
  duracion_min  int
)
language sql
security definer
set search_path = public
stable
as $$
  select
    c.id            as cita_id,
    c.paciente_id,
    pr.id           as user_id,
    pr.email::text,
    pr.display_name,
    s.nombre        as servicio,
    c.inicio,
    s.duracion_minutos as duracion_min
  from public.citas c
  join public.pacientes pa on pa.id = c.paciente_id
  join public.profiles  pr on pr.id = pa.user_id
  join public.servicios s  on s.id = c.servicio_id
  left join public.notificaciones_prefs np on np.user_id = pr.id
  where c.activo = true
    and c.estado = 'confirmada'
    and c.inicio between (now() + interval '47 hours') and (now() + interval '49 hours')
    and coalesce(np.reminder_48h, true) = true
    and not exists (
      select 1 from public.emails_log el
       where el.cita_id = c.id
         and el.email_type = 'reminder_48h'
         and el.status in ('sent', 'pending')
    );
$$;

comment on function public.citas_pendientes_recordatorio_48h() is
  'Citas en ventana 47h–49h: recordatorio ~48h; tipo reminder_48h.';

revoke all on function public.citas_pendientes_recordatorio_48h() from public, anon, authenticated;
