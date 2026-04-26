-- ============================================================================
-- 0056 — Disponibilidad: solo citas confirmadas/completadas ocultan el hueco
--
-- Los pre-bloqueos (bloqueo_temporal, pago pendiente) NO reducen la lista de
-- slots en obtener_disponibilidad: el hueco sigue visible hasta confirmación.
-- La integridad anti-solape sigue garantizada por la EXCLUDE citas_no_solape
-- (bloqueo_temporal + confirmada + completada) al insertar vía reservar_cita.
-- ============================================================================

create or replace function public.obtener_disponibilidad(
  p_fecha       date,
  p_servicio_id uuid,
  p_zona        text default 'Europe/Madrid'
)
returns table (
  slot_inicio timestamptz,
  slot_fin    timestamptz
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
  select c.slot_ini, c.slot_fn
    from candidatos c
   where c.slot_ini > v_now
     and not exists (
       select 1
         from public.citas ci
        where ci.activo = true
          and ci.estado in ('confirmada', 'completada')
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
   order by c.slot_ini;
end;
$$;

comment on function public.obtener_disponibilidad(date, uuid, text) is
  'Slots libres: excluye solapes con citas confirmada/completada y agenda_bloqueos. '
  'No excluye bloqueo_temporal (pre-pago): la EXCLUDE en citas evita doble reserva al insertar.';

revoke all on function public.obtener_disponibilidad(date, uuid, text) from public;
grant execute on function public.obtener_disponibilidad(date, uuid, text) to authenticated;
