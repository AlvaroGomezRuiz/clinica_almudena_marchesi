-- ============================================================================
-- 0074 — Rejilla de reserva: no mostrar cola de huecos imposibles por duración
--
-- Si la plantilla activa deja exactamente UNA franja `libre: true` para ese
-- weekday ISO, el fin del día para `generate_series` se acota a la hora_fin
-- de esa franja (p. ej. 21:00). Así no aparecen botones 20:00 / 20:30 que
-- nunca podrían cumplir sesiones largas (p. ej. 75 min) sin confundirlos con
-- huecos bloqueados por otra cita.
--
-- Si hay 0 o >1 franjas `libre: true` ese día, no se acota (misma rejilla que
-- horarios_clinica; `plantilla_permite_slot_reserva` sigue filtrando).
-- ============================================================================

create or replace function public.plantilla_cap_hora_fin_rejilla(p_fecha date)
returns time
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with iso as (
    select extract(isodow from p_fecha)::smallint as d
  ),
  apl as (
    select hp.items
    from public.agenda_plantilla_aplicaciones apa
    join public.horario_plantillas hp on hp.id = apa.plantilla_id
    where apa.activo
      and hp.activo
      and not hp.bloquea_dia_completo
      and p_fecha between apa.fecha_desde and apa.fecha_hasta
      and jsonb_typeof(hp.items) = 'array'
      and jsonb_array_length(hp.items) > 0
  ),
  elems as (
    select
      (jx.elem->>'weekday')::smallint as wd,
      (jx.elem->>'hora_inicio')::time as t0,
      (jx.elem->>'hora_fin')::time as t1,
      coalesce((jx.elem->>'libre')::boolean, false) as lib
    from apl a
    cross join lateral jsonb_array_elements(
      coalesce(a.items, '[]'::jsonb)
    ) as jx(elem)
  ),
  day_elems as (
    select e.t1, e.lib
    from elems e
    cross join iso i
    where e.wd = i.d
  ),
  agg as (
    select count(*) filter (where lib = true)::bigint as cnt_true,
           max(t1) filter (where lib = true) as mx_true
    from day_elems
  )
  select case
    when (select cnt_true from agg) = 1 then (select mx_true from agg)
    else null::time
  end;
$$;

comment on function public.plantilla_cap_hora_fin_rejilla(date) is
  'Si hay exactamente una franja libre:true en plantillas activas para ese día ISO, devuelve su hora_fin; si no, NULL.';

revoke all on function public.plantilla_cap_hora_fin_rejilla(date) from public;
grant execute on function public.plantilla_cap_hora_fin_rejilla(date) to authenticated;

alter function public.plantilla_cap_hora_fin_rejilla(date)
  set search_path = public, pg_temp;

-- ---------------------------------------------------------------------------
-- obtener_disponibilidad
-- ---------------------------------------------------------------------------

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
begin
  if public.dia_bloqueado_por_plantilla(p_fecha) then
    return;
  end if;

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
  select c.slot_ini, c.slot_fn
    from candidatos c
   where c.slot_ini > v_now
     and public.plantilla_permite_slot_reserva(p_fecha, p_zona, c.slot_ini, c.slot_fn)
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
  'Slots libres: horarios_clinica (acotado si plantilla = una sola franja libre) + plantillas + citas + bloqueos.';

revoke all on function public.obtener_disponibilidad(date, uuid, text) from public;
grant execute on function public.obtener_disponibilidad(date, uuid, text) to authenticated;

alter function public.obtener_disponibilidad(date, uuid, text)
  set search_path = public, pg_temp;

-- ---------------------------------------------------------------------------
-- obtener_cuadricula_reserva
-- ---------------------------------------------------------------------------

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
  'Rejilla del día: misma acotación de fin de día que obtener_disponibilidad cuando la plantilla define una sola franja libre.';

revoke all on function public.obtener_cuadricula_reserva(date, uuid, text) from public;
grant execute on function public.obtener_cuadricula_reserva(date, uuid, text) to authenticated;

alter function public.obtener_cuadricula_reserva(date, uuid, text)
  set search_path = public, pg_temp;
