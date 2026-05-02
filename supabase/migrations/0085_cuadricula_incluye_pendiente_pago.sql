-- ============================================================================
-- 0085_cuadricula_incluye_pendiente_pago.sql
-- ----------------------------------------------------------------------------
-- Las citas pendiente_pago deben bloquear el slot para evitar doble booking.
-- Actualiza obtener_cuadricula_reserva para incluirlas como bloqueantes.
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
set search_path = public, pg_temp
as $$
declare
  v_dur    int;
  v_wd     smallint := extract(dow from p_fecha)::smallint;
  v_h_ini  time;
  v_h_fin  time;
  v_cap    time;
  v_step   interval := interval '30 minutes';
  v_now    timestamptz := now();
  v_day_ini timestamptz;
  v_day_fin timestamptz;
  v_bloqueo_dia boolean := public.dia_bloqueado_por_plantilla(p_fecha);
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

  v_cap := public.plantilla_cap_hora_fin_rejilla(p_fecha);
  if v_cap is not null and v_cap < v_h_fin then
    v_h_fin := v_cap;
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
      not v_bloqueo_dia
      and c.slot_ini > v_now
      and public.plantilla_permite_slot_reserva(p_fecha, p_zona, c.slot_ini, c.slot_fn)
      and not exists (
        select 1
          from public.citas ci
         where ci.activo = true
           and ci.estado in ('confirmada', 'completada', 'pendiente_pago')
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
  'Rejilla del día: permite_reserva false por citas confirmada/completada/pendiente_pago o bloqueos.';

revoke all on function public.obtener_cuadricula_reserva(date, uuid, text) from public;
grant execute on function public.obtener_cuadricula_reserva(date, uuid, text) to authenticated;

alter function public.obtener_cuadricula_reserva(date, uuid, text)
  set search_path = public, pg_temp;
