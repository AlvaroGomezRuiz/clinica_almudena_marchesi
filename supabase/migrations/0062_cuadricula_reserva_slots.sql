-- ============================================================================
-- 0062 — Cuadrícula de huecos con estado (libre / no reservable)
--
-- Devuelve todos los candidatos futuros del día (misma rejilla que genera
-- obtener_disponibilidad) con `permite_reserva`: el hueco solo es reservable
-- si no solapa con cita activa (incl. bloqueo_temporal), ni bloqueos de agenda.
-- El portal puede mostrar los no reservables en gris tachados sin permitir click.
-- ============================================================================

create or replace function public.obtener_cuadricula_reserva(
  p_fecha       date,
  p_servicio_id uuid,
  p_zona        text default 'Europe/Madrid'
)
returns table (
  slot_inicio timestamptz,
  slot_fin    timestamptz,
  permite_reserva boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_dur    int;
  v_wd     smallint := extract(dow from p_fecha)::smallint;
  v_h_ini  time;
  v_h_fin  time;
  v_step   interval := interval '30 minutes';
  v_now    timestamptz := now();
  v_day_ini timestamptz;
  v_day_fin timestamptz;
begin
  select s.duracion_minutos into v_dur
    from public.servicios s
   where s.id = p_servicio_id and s.activo = true;
  if v_dur is null then
    return;
  end if;

  select h.hora_inicio, h.hora_fin into v_h_ini, v_h_fin
    from public.horarios_clinica h
   where h.weekday = v_wd and h.activo = true;
  if v_h_ini is null then
    return;
  end if;

  v_day_ini := (p_fecha::timestamp + v_h_ini) at time zone p_zona;
  v_day_fin := (p_fecha::timestamp + v_h_fin) at time zone p_zona;

  return query
  with candidatos as (
    select gs as slot_ini,
           gs + make_interval(mins => v_dur) as slot_fn
      from generate_series(
             v_day_ini,
             v_day_fin - make_interval(mins => v_dur),
             v_step
           ) gs
  )
  select
    c.slot_ini,
    c.slot_fn,
    (
      c.slot_ini > v_now
      and not exists (
        select 1
          from public.citas ci
         where ci.activo = true
           and ci.estado in ('confirmada', 'completada', 'bloqueo_temporal')
           and tstzrange(ci.inicio, ci.fin, '[)')
               && tstzrange(c.slot_ini, c.slot_fn, '[)')
      )
      and not exists (
        select 1
          from public.agenda_bloqueos ab
         where ab.activo = true
           and tstzrange(ab.inicio, ab.fin, '[)')
               && tstzrange(c.slot_ini, c.slot_fn, '[)')
      )
    ) as permite_reserva
    from candidatos c
   where c.slot_ini > v_now
   order by c.slot_ini;
end;
$$;

comment on function public.obtener_cuadricula_reserva(date, uuid, text) is
  'Rejilla de huecos del día con bandera permite_reserva (incluye ocupados por cita temporal o confirmada).';

revoke all on function public.obtener_cuadricula_reserva(date, uuid, text) from public;
grant execute on function public.obtener_cuadricula_reserva(date, uuid, text) to authenticated;
