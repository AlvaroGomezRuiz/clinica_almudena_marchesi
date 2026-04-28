-- ============================================================================
-- 0073 — Disponibilidad y reserva respetan plantillas de horario activas
--
-- Si hay `agenda_plantilla_aplicaciones` activas en la fecha (con
-- `horario_plantillas` activo y `bloquea_dia_completo = false` e `items`
-- no vacío), los huecos se filtran según el JSON `items` para el weekday
-- ISO (1=lunes … 7=domingo), igual que en el seed de 0014:
--
--   * `libre: true`  → franja permitida (unión); el slot debe caer dentro
--                      de al menos una franja `libre: true`.
--   * `libre: false` → franja prohibida si no hay ningún `libre: true` ese
--                      día en los items (p. ej. plantilla «Anam»); si hay
--                      mezcla, el slot debe estar en algún `true` y no
--                      solapar ningún `false`.
-- Si no hay items para ese weekday en ninguna plantilla aplicable, no se
-- aplica filtro extra (solo `horarios_clinica` + citas + bloqueos).
--
-- `bloquea_dia_completo = true` sigue usando `dia_bloqueado_por_plantilla`:
-- sin huecos en disponibilidad / cuadrícula; `reservar_cita` rechaza.
-- ============================================================================

create or replace function public.plantilla_permite_slot_reserva(
  p_fecha date,
  p_zona text,
  p_slot_ini timestamptz,
  p_slot_fn timestamptz
)
returns boolean
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
    select e.wd, e.t0, e.t1, e.lib
    from elems e
    cross join iso i
    where e.wd = i.d
  ),
  t_ini as (
    select (p_slot_ini at time zone p_zona)::time as t0
  ),
  t_fin as (
    select (p_slot_fn at time zone p_zona)::time as t1
  )
  select case
    when not exists (select 1 from apl) then true
    when not exists (select 1 from day_elems) then true
    when exists (select 1 from day_elems where lib = true) then (
      exists (
        select 1
        from day_elems d
        where d.lib = true
          and (select t0 from t_ini) >= d.t0
          and (select t1 from t_fin) <= d.t1
      )
      and not exists (
        select 1
        from day_elems d
        where d.lib = false
          and (select t0 from t_ini) < d.t1
          and (select t1 from t_fin) > d.t0
      )
    )
    else
      not exists (
        select 1
        from day_elems d
        where d.lib = false
          and (select t0 from t_ini) < d.t1
          and (select t1 from t_fin) > d.t0
      )
  end;
$$;

comment on function public.plantilla_permite_slot_reserva(date, text, timestamptz, timestamptz) is
  'True si el slot (ini/fin en p_zona) cumple plantillas de horario activas en p_fecha.';

revoke all on function public.plantilla_permite_slot_reserva(date, text, timestamptz, timestamptz) from public;
grant execute on function public.plantilla_permite_slot_reserva(date, text, timestamptz, timestamptz) to authenticated;

alter function public.plantilla_permite_slot_reserva(date, text, timestamptz, timestamptz)
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
  'Slots libres: horarios_clinica + plantillas activas (items) + citas confirmada/completada + agenda_bloqueos. '
  'No excluye bloqueo_temporal en lista; día con bloquea_dia_completo sin slots.';

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
  'Rejilla del día: permite_reserva false si plantilla bloquea día completo, items, citas o bloqueos.';

revoke all on function public.obtener_cuadricula_reserva(date, uuid, text) from public;
grant execute on function public.obtener_cuadricula_reserva(date, uuid, text) to authenticated;

alter function public.obtener_cuadricula_reserva(date, uuid, text)
  set search_path = public, pg_temp;

-- ---------------------------------------------------------------------------
-- reservar_cita — defensa en profundidad (misma regla que disponibilidad)
-- ---------------------------------------------------------------------------

create or replace function public.reservar_cita(p_servicio_id uuid, p_slot_inicio timestamp with time zone)
returns table(cita_id uuid, estado cita_estado, consumio_bono boolean)
language plpgsql
security definer
set search_path to 'public', pg_temp
as $function$
declare
  v_uid         uuid := auth.uid();
  v_paciente_id uuid := public.current_paciente_id();
  v_dur         int;
  v_slot_fin    timestamptz;
  v_bono        public.bonos_pacientes%rowtype;
  v_new_estado  public.cita_estado := 'bloqueo_temporal';
  v_consumio    boolean := false;
  v_new_id      uuid;
  v_fecha_madrid date;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;

  if v_paciente_id is null then
    v_paciente_id := public.ensure_paciente_para_pago(v_uid);
  end if;

  if v_paciente_id is null then
    raise exception 'no_paciente_record' using errcode = 'insufficient_privilege';
  end if;

  select duracion_minutos into v_dur
    from public.servicios
   where id = p_servicio_id and activo = true;
  if v_dur is null then
    raise exception 'servicio_no_disponible' using errcode = 'no_data_found';
  end if;

  if p_slot_inicio <= now() then
    raise exception 'slot_en_pasado' using errcode = 'check_violation';
  end if;

  v_slot_fin := p_slot_inicio + make_interval(mins => v_dur);
  v_fecha_madrid := (p_slot_inicio at time zone 'Europe/Madrid')::date;

  if public.dia_bloqueado_por_plantilla(v_fecha_madrid) then
    raise exception 'dia_bloqueado_por_plantilla' using errcode = 'check_violation';
  end if;

  if not public.plantilla_permite_slot_reserva(
    v_fecha_madrid,
    'Europe/Madrid',
    p_slot_inicio,
    v_slot_fin
  ) then
    raise exception 'slot_fuera_plantilla' using errcode = 'check_violation';
  end if;

  select bp.* into v_bono
    from public.bonos_pacientes bp
   where bp.paciente_id = v_paciente_id
     and bp.servicio_id = p_servicio_id
     and bp.estado = 'activo'::public.bono_estado
     and bp.sesiones_consumidas < bp.sesiones_totales
   order by bp.fecha_compra asc
   limit 1;

  if found then
    v_new_estado := 'confirmada';
    v_consumio   := true;
  end if;

  begin
    insert into public.citas (paciente_id, servicio_id, inicio, fin, estado)
      values (v_paciente_id, p_servicio_id, p_slot_inicio, v_slot_fin, v_new_estado)
      returning id into v_new_id;
  exception when exclusion_violation then
    raise exception 'slot_ocupado' using errcode = 'unique_violation';
  end;

  if v_consumio then
    update public.bonos_pacientes bp
       set sesiones_consumidas = bp.sesiones_consumidas + 1,
           estado = case
             when bp.sesiones_consumidas + 1 >= bp.sesiones_totales then 'agotado'::public.bono_estado
             else bp.estado
           end
     where bp.id = v_bono.id;
  end if;

  return query select v_new_id, v_new_estado, v_consumio;
end;
$function$;

revoke all on function public.reservar_cita(uuid, timestamptz) from public;
grant execute on function public.reservar_cita(uuid, timestamptz) to authenticated;

alter function public.reservar_cita(uuid, timestamptz)
  set search_path = public, pg_temp;
