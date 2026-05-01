-- ============================================================================
-- 0080_reserva_solo_tras_pago_o_bono.sql
-- ----------------------------------------------------------------------------
-- Objetivo: no más «pre-reservas» (filas citas en bloqueo_temporal). Una cita
-- solo existe si el paciente paga (Stripe) o consume un bono en el mismo flujo.
--
-- 1. Cancela prereservas antiguas (bloqueo_temporal) para liberar la vista.
-- 2. `reservar_cita` solo inserta cuando hay bono activo → confirmada.
-- 3. `preparar_checkout_cita_slot` valida servicio+slot para Payment Element sin cita previa.
-- 4. `obtener_cuadricula_reserva` alinea con `obtener_disponibilidad`: solo citas
--    confirmada/completada bloquean huecos (no bloqueo_temporal).
-- 5. `procesar_pago_stripe`: si metadata trae servicio_id+slot_inicio (kind=cita),
--    inserta cita confirmada + pago en el mismo flujo; devuelve `cita_afectada_id`.
--    Mantiene rama legacy `p_cita_id` + bloqueo_temporal → confirmada.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. Limpieza de prereservas huérfanas
-- ---------------------------------------------------------------------------
update public.citas
   set estado = 'cancelada',
       activo = false,
       updated_at = now()
 where estado = 'bloqueo_temporal'
   and activo = true;

-- ---------------------------------------------------------------------------
-- 1. reservar_cita — solo con bono (sin bono → excepción clara)
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

  if not found then
    raise exception 'reserva_requiere_bono_o_pago'
      using errcode = 'check_violation',
            message = 'Sin bono activo para este servicio: completa el pago en el paso siguiente (no se crea cita hasta confirmar).';
  end if;

  begin
    insert into public.citas (paciente_id, servicio_id, inicio, fin, estado)
      values (v_paciente_id, p_servicio_id, p_slot_inicio, v_slot_fin, 'confirmada'::public.cita_estado)
      returning id into v_new_id;
  exception when exclusion_violation then
    raise exception 'slot_ocupado' using errcode = 'unique_violation';
  end;

  update public.bonos_pacientes bp
     set sesiones_consumidas = bp.sesiones_consumidas + 1,
         estado = case
           when bp.sesiones_consumidas + 1 >= bp.sesiones_totales then 'agotado'::public.bono_estado
           else bp.estado
         end
   where bp.id = v_bono.id;

  return query select v_new_id, 'confirmada'::public.cita_estado, true;
end;
$function$;

revoke all on function public.reservar_cita(uuid, timestamptz) from public;
grant execute on function public.reservar_cita(uuid, timestamptz) to authenticated;

alter function public.reservar_cita(uuid, timestamptz)
  set search_path = public, pg_temp;

-- ---------------------------------------------------------------------------
-- 2. preparar_checkout_cita_slot — validación para PI sin fila en citas
-- ---------------------------------------------------------------------------
create or replace function public.preparar_checkout_cita_slot(
  p_servicio_id uuid,
  p_slot_inicio timestamptz,
  p_user_id     uuid
)
returns table (
  inicio           timestamptz,
  servicio_nombre  text,
  importe_centimos int,
  email            text,
  display_name     text
)
language plpgsql
security definer
set search_path to public, extensions
as $fn$
declare
  v_paciente_id uuid;
  v_dur         int;
  v_slot_fin    timestamptz;
  v_fecha_madrid date;
begin
  select pr.email::text, pr.display_name
    into email, display_name
    from public.profiles pr
   where pr.id = p_user_id;
  if not found then
    return;
  end if;

  select id into v_paciente_id
    from public.pacientes
   where user_id = p_user_id
   limit 1;
  if v_paciente_id is null then
    v_paciente_id := public.ensure_paciente_para_pago(p_user_id);
  end if;
  if v_paciente_id is null then
    return;
  end if;

  select s.duracion_minutos, s.nombre, s.precio_centimos
    into v_dur, servicio_nombre, importe_centimos
    from public.servicios s
   where s.id = p_servicio_id and s.activo = true;
  if v_dur is null then
    return;
  end if;

  if p_slot_inicio <= now() then
    return;
  end if;

  v_slot_fin := p_slot_inicio + make_interval(mins => v_dur);
  v_fecha_madrid := (p_slot_inicio at time zone 'Europe/Madrid')::date;

  if public.dia_bloqueado_por_plantilla(v_fecha_madrid) then
    return;
  end if;

  if not public.plantilla_permite_slot_reserva(
    v_fecha_madrid,
    'Europe/Madrid',
    p_slot_inicio,
    v_slot_fin
  ) then
    return;
  end if;

  if exists (
    select 1
      from public.citas ci
     where ci.activo = true
       and ci.estado in ('confirmada', 'completada')
       and tstzrange(ci.inicio, ci.fin, '[)')
           && tstzrange(p_slot_inicio, v_slot_fin, '[)')
  ) then
    return;
  end if;

  if exists (
    select 1
      from public.agenda_bloqueos ab
     where ab.activo = true
       and tstzrange(ab.inicio, ab.fin, '[)')
           && tstzrange(p_slot_inicio, v_slot_fin, '[)')
  ) then
    return;
  end if;

  return query
  select
    p_slot_inicio,
    servicio_nombre,
    importe_centimos,
    email,
    display_name;
end;
$fn$;

revoke all on function public.preparar_checkout_cita_slot(uuid, timestamptz, uuid) from public, anon, authenticated;

comment on function public.preparar_checkout_cita_slot(uuid, timestamptz, uuid) is
  'Contexto para Payment Element: valida servicio+slot y perfil; no crea fila en citas.';

-- ---------------------------------------------------------------------------
-- 3. obtener_cuadricula_reserva — huecos ocupados solo por citas firmes
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
    ) as permite_reserva
    from candidatos c
   where c.slot_ini > v_now
   order by c.slot_ini;
end;
$$;

comment on function public.obtener_cuadricula_reserva(date, uuid, text) is
  'Rejilla del día: permite_reserva false solo por citas confirmada/completada o bloqueos (no pre-reservas).';

revoke all on function public.obtener_cuadricula_reserva(date, uuid, text) from public;
grant execute on function public.obtener_cuadricula_reserva(date, uuid, text) to authenticated;

alter function public.obtener_cuadricula_reserva(date, uuid, text)
  set search_path = public, pg_temp;

-- ---------------------------------------------------------------------------
-- 4. procesar_pago_stripe — cita desde metadata slot + columna cita_afectada_id
-- ---------------------------------------------------------------------------
-- No usar solo CREATE OR REPLACE: si cambia RETURNS TABLE, Postgres 42P13.
drop function if exists public.procesar_pago_stripe(
  text, text, text, text, uuid, uuid, uuid, int, text, text, jsonb
);

create function public.procesar_pago_stripe(
  p_stripe_event_id       text,
  p_stripe_session_id     text,
  p_stripe_payment_intent text,
  p_stripe_customer_id    text,
  p_user_id               uuid,
  p_cita_id               uuid,
  p_bono_config_id        uuid,
  p_importe_centimos      int,
  p_moneda                text,
  p_metodo                text,
  p_metadata              jsonb
)
returns table (
  pago_id            uuid,
  cita_confirmada    boolean,
  bono_creado        boolean,
  bono_id            uuid,
  ya_procesado       boolean,
  cita_afectada_id   uuid
)
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_existing_pago_id uuid;
  v_paciente_id      uuid;
  v_cita_ok          boolean := false;
  v_bono_id          uuid;
  v_pago_id          uuid;
  v_descripcion      text;
  v_cita_afectada    uuid;
  v_use_slot         boolean := false;
  v_slot_servicio    uuid;
  v_slot_inicio      timestamptz;
  v_dur              int;
  v_slot_fin         timestamptz;
  v_fecha_madrid     date;
  v_meta_uid         text;
begin
  select p.id
    into v_existing_pago_id
    from public.pagos p
   where p.stripe_event_id = p_stripe_event_id
   limit 1;

  if v_existing_pago_id is not null then
    return query
    select v_existing_pago_id, false, false, null::uuid, true, null::uuid;
    return;
  end if;

  v_paciente_id := public.ensure_paciente_para_pago(p_user_id);

  if v_paciente_id is null then
    raise exception 'paciente_not_found_ni_creado' using errcode = 'P0002';
  end if;

  v_meta_uid := nullif(trim(coalesce(p_metadata->>'user_id', '')), '');
  if v_meta_uid is not null and v_meta_uid <> p_user_id::text then
    raise exception 'stripe_metadata_user_mismatch' using errcode = 'check_violation';
  end if;

  v_use_slot := (
    p_cita_id is null
    and p_bono_config_id is null
    and coalesce(p_metadata->>'kind', '') = 'cita'
    and (p_metadata ? 'servicio_id')
    and (p_metadata ? 'slot_inicio')
  );

  if v_use_slot then
    v_slot_servicio := (p_metadata->>'servicio_id')::uuid;
    v_slot_inicio := (p_metadata->>'slot_inicio')::timestamptz;

    select s.duracion_minutos into v_dur
      from public.servicios s
     where s.id = v_slot_servicio and s.activo = true;
    if v_dur is null then
      raise exception 'servicio_invalido_en_metadata' using errcode = 'no_data_found';
    end if;

    if v_slot_inicio <= now() then
      raise exception 'slot_en_pasado_metadata' using errcode = 'check_violation';
    end if;

    v_slot_fin := v_slot_inicio + make_interval(mins => v_dur);
    v_fecha_madrid := (v_slot_inicio at time zone 'Europe/Madrid')::date;

    if public.dia_bloqueado_por_plantilla(v_fecha_madrid) then
      raise exception 'dia_bloqueado_metadata' using errcode = 'check_violation';
    end if;

    if not public.plantilla_permite_slot_reserva(
      v_fecha_madrid,
      'Europe/Madrid',
      v_slot_inicio,
      v_slot_fin
    ) then
      raise exception 'slot_fuera_plantilla_metadata' using errcode = 'check_violation';
    end if;

    perform pg_advisory_xact_lock(
      hashtextextended(
        coalesce(p_metadata->>'servicio_id', '') || '|' || coalesce(p_metadata->>'slot_inicio', ''),
        0
      )
    );

    if exists (
      select 1
        from public.citas ci
       where ci.activo = true
         and ci.estado in ('confirmada', 'completada')
         and tstzrange(ci.inicio, ci.fin, '[)')
             && tstzrange(v_slot_inicio, v_slot_fin, '[)')
    ) then
      raise exception 'slot_ocupado_tras_cobro' using errcode = 'unique_violation';
    end if;

    if exists (
      select 1
        from public.agenda_bloqueos ab
       where ab.activo = true
         and tstzrange(ab.inicio, ab.fin, '[)')
             && tstzrange(v_slot_inicio, v_slot_fin, '[)')
    ) then
      raise exception 'slot_bloqueado_agenda_tras_cobro' using errcode = 'check_violation';
    end if;

    begin
      insert into public.citas (paciente_id, servicio_id, inicio, fin, estado)
        values (
          v_paciente_id,
          v_slot_servicio,
          v_slot_inicio,
          v_slot_fin,
          'confirmada'::public.cita_estado
        )
        returning id into v_cita_afectada;
    exception when exclusion_violation then
      raise exception 'slot_ocupado_tras_cobro' using errcode = 'unique_violation';
    end;

    v_cita_ok := true;

    select ('Cita — ' || s.nombre)
      into v_descripcion
      from public.servicios s
     where s.id = v_slot_servicio;
  elsif p_bono_config_id is not null then
    select
      (bc.nombre
        || ' · ' || bc.sesiones::text
        || ' sesiones'
        || case
            when bc.validez_dias is not null
              then ' · vence a los ' || bc.validez_dias::text || ' días'
            else ''
          end)
      into v_descripcion
      from public.bonos_config bc
     where bc.id = p_bono_config_id;
  elsif p_cita_id is not null then
    select ('Cita — ' || s.nombre)
      into v_descripcion
      from public.citas  c
      join public.servicios s on s.id = c.servicio_id
     where c.id = p_cita_id;
  end if;

  insert into public.pagos (
    paciente_id, cita_id, bono_id,
    stripe_event_id, stripe_session_id, stripe_payment_intent, stripe_customer_id,
    importe_centimos, moneda, estado, metodo, descripcion, metadata,
    fecha_pago
  ) values (
    v_paciente_id,
    case when v_use_slot then v_cita_afectada else p_cita_id end,
    null,
    p_stripe_event_id, p_stripe_session_id, p_stripe_payment_intent, p_stripe_customer_id,
    p_importe_centimos, coalesce(p_moneda, 'EUR'), 'completado',
    p_metodo, coalesce(v_descripcion, 'Pago'), coalesce(p_metadata, '{}'::jsonb),
    now()
  )
  returning id into v_pago_id;

  if p_cita_id is not null and not v_use_slot then
    update public.citas c
       set estado = 'confirmada', updated_at = now()
     where c.id = p_cita_id
       and c.estado = 'bloqueo_temporal'
       and c.activo = true;
    v_cita_ok := found;
    if v_cita_ok then
      v_cita_afectada := p_cita_id;
    end if;
  end if;

  if p_bono_config_id is not null then
    insert into public.bonos_pacientes (
      paciente_id, servicio_id, sesiones_totales, sesiones_consumidas,
      estado, fecha_compra, fecha_expiracion, activo
    )
    select
      v_paciente_id, bc.servicio_id, bc.sesiones, 0,
      'activo', now(),
      case
        when bc.validez_dias is not null then (current_date + bc.validez_dias)
        else null
      end,
      true
    from public.bonos_config bc
   where bc.id = p_bono_config_id
    returning id into v_bono_id;

    if v_bono_id is not null then
      update public.pagos p set bono_id = v_bono_id where p.id = v_pago_id;
    end if;
  end if;

  return query
  select v_pago_id, v_cita_ok, (v_bono_id is not null), v_bono_id, false, v_cita_afectada;
end;
$fn$;

revoke all on function public.procesar_pago_stripe(
  text, text, text, text, uuid, uuid, uuid, int, text, text, jsonb
) from public, anon, authenticated;

grant execute on function public.preparar_checkout_cita_slot(uuid, timestamptz, uuid) to service_role;
