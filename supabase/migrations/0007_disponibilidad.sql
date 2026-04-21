-- ============================================================================
-- 0007_disponibilidad.sql — Horario clínica + RPC obtener_disponibilidad
-- ----------------------------------------------------------------------------
-- Fuentes de verdad:
--   * horarios_clinica — franja horaria activa por weekday (0=domingo, 6=sábado)
--   * citas activas (estados: bloqueo_temporal, confirmada, completada)
--   * agenda_bloqueos activos
--
-- RPC `obtener_disponibilidad(fecha, servicio_id, zona)` devuelve slots libres
-- de `duracion_minutos` del servicio, con paso de 30 min, en `Europe/Madrid`
-- por defecto. Complejidad O(slots_del_dia) — ≤ 22 slots para jornada de 11h.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Tabla de horarios (singleton editable por admin)
-- ---------------------------------------------------------------------------
create table if not exists public.horarios_clinica (
  weekday     smallint primary key check (weekday between 0 and 6),
  hora_inicio time     not null,
  hora_fin    time     not null,
  activo      boolean  not null default true,
  updated_at  timestamptz not null default now(),
  constraint horarios_rango_valido check (hora_fin > hora_inicio)
);

insert into public.horarios_clinica (weekday, hora_inicio, hora_fin, activo) values
  (0, '00:00', '00:01', false),
  (1, '09:00', '20:00', true),
  (2, '09:00', '20:00', true),
  (3, '09:00', '20:00', true),
  (4, '09:00', '20:00', true),
  (5, '09:00', '18:00', true),
  (6, '00:00', '00:01', false)
on conflict (weekday) do nothing;

alter table public.horarios_clinica enable row level security;

drop policy if exists horarios_read on public.horarios_clinica;
create policy horarios_read on public.horarios_clinica
  for select using (true);

drop policy if exists horarios_admin_write on public.horarios_clinica;
create policy horarios_admin_write on public.horarios_clinica
  for all using (public.is_admin()) with check (public.is_admin());

grant select on public.horarios_clinica to authenticated;

-- ---------------------------------------------------------------------------
-- 2. RPC: obtener_disponibilidad(fecha, servicio_id, zona)
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
  -- Duración del servicio
  select s.duracion_minutos into v_dur
    from public.servicios s
   where s.id = p_servicio_id and s.activo = true;
  if v_dur is null then
    return;
  end if;

  -- Horario del día
  select h.hora_inicio, h.hora_fin into v_h_ini, v_h_fin
    from public.horarios_clinica h
   where h.weekday = v_wd and h.activo = true;
  if v_h_ini is null then
    return;
  end if;

  -- Bordes en zona local → timestamptz
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
          and ci.estado in ('bloqueo_temporal', 'confirmada', 'completada')
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

revoke all on function public.obtener_disponibilidad(date, uuid, text) from public;
grant execute on function public.obtener_disponibilidad(date, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. RPC: reservar_cita(servicio_id, slot_inicio)
--    - Crea cita en estado bloqueo_temporal si paciente sin bono
--    - Si paciente tiene bono activo con sesiones restantes → confirmada + consume
--    - Devuelve (cita_id, estado, consumio_bono)
--    - La EXCLUDE constraint en citas protege del race-condition
-- ---------------------------------------------------------------------------
create or replace function public.reservar_cita(
  p_servicio_id uuid,
  p_slot_inicio timestamptz
)
returns table (
  cita_id       uuid,
  estado        public.cita_estado,
  consumio_bono boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_paciente_id uuid := public.current_paciente_id();
  v_dur         int;
  v_slot_fin    timestamptz;
  v_bono        public.bonos_pacientes%rowtype;
  v_new_estado  public.cita_estado := 'bloqueo_temporal';
  v_consumio    boolean := false;
  v_new_id      uuid;
begin
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

  -- Bono activo del paciente para este servicio (si existe, consume)
  select * into v_bono
    from public.bonos_pacientes
   where paciente_id = v_paciente_id
     and servicio_id = p_servicio_id
     and estado = 'activo'
     and sesiones_consumidas < sesiones_totales
   order by fecha_compra asc
   limit 1;

  if found then
    v_new_estado := 'confirmada';
    v_consumio   := true;
  end if;

  -- Insert de la cita (puede fallar por citas_no_solape EXCLUDE)
  begin
    insert into public.citas (paciente_id, servicio_id, inicio, fin, estado)
      values (v_paciente_id, p_servicio_id, p_slot_inicio, v_slot_fin, v_new_estado)
      returning id into v_new_id;
  exception when exclusion_violation then
    raise exception 'slot_ocupado' using errcode = 'unique_violation';
  end;

  -- Si consumimos bono, incrementa contador (se auto-marca agotado vía trigger opcional)
  if v_consumio then
    update public.bonos_pacientes
       set sesiones_consumidas = sesiones_consumidas + 1,
           estado = case
             when sesiones_consumidas + 1 >= sesiones_totales then 'agotado'::public.bono_estado
             else estado
           end
     where id = v_bono.id;
  end if;

  return query select v_new_id, v_new_estado, v_consumio;
end;
$$;

revoke all on function public.reservar_cita(uuid, timestamptz) from public;
grant execute on function public.reservar_cita(uuid, timestamptz) to authenticated;
