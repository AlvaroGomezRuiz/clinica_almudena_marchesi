-- 0060_recordatorios_24h_y_48h_separados.sql
-- -----------------------------------------------------------------------------
-- Añade enum + columna `reminder_48h` y restaura la RPC 24h (ventana 23h–25h).
-- *No* definir aquí la RPC 48h que compara con `reminder_48h`: en PostgreSQL un
-- valor de enum recién añadido con ALTER TYPE no puede usarse en la misma
-- transacción (55P04) — la función va en 0061.
-- -----------------------------------------------------------------------------

alter type public.email_type add value if not exists 'reminder_48h';

alter table public.notificaciones_prefs
  add column if not exists reminder_48h boolean not null default true;

comment on column public.notificaciones_prefs.reminder_24h is
  'Recibir email recordatorio ~24h antes del inicio (ventana 23h-25h).';
comment on column public.notificaciones_prefs.reminder_48h is
  'Recibir email recordatorio ~48h antes del inicio (ventana 47h-49h).';

-- ~24h antes: DROP + CREATE (retorno `email` text, no `citext`).
drop function if exists public.citas_pendientes_recordatorio_24h();

create function public.citas_pendientes_recordatorio_24h()
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
    and c.inicio between (now() + interval '23 hours') and (now() + interval '25 hours')
    and coalesce(np.reminder_24h, true) = true
    and not exists (
      select 1 from public.emails_log el
       where el.cita_id = c.id
         and el.email_type = 'reminder_24h'
         and el.status in ('sent', 'pending')
    );
$$;

revoke all on function public.citas_pendientes_recordatorio_24h() from public, anon, authenticated;

comment on function public.citas_pendientes_recordatorio_24h() is
  'Citas en ventana 23h–25h: recordatorio ~24h; tipo reminder_24h.';
