-- ============================================================================
-- 0089_activar_bono.sql
-- ----------------------------------------------------------------------------
-- 1. Añade `precio_centimos` a `bonos_pacientes` para recordar el precio 
--    cuando un bono es asignado manualmente con descuento y queda "pendiente_pago".
-- 2. Actualiza `bono_asignar_manual` para guardar este valor.
-- 3. Crea `preparar_checkout_activar_bono` para Payment Intents.
-- 4. Modifica `procesar_pago_stripe` para activar el bono existente.
-- ============================================================================

begin;

-- 1. Añadir precio_centimos a bonos_pacientes
alter table public.bonos_pacientes
  add column if not exists precio_centimos int;

-- Backfill: para bonos existentes
update public.bonos_pacientes bp
   set precio_centimos = coalesce(
         (select importe_centimos from public.pagos p where p.bono_id = bp.id and p.estado = 'completado' limit 1),
         (select s.precio_centimos * bp.sesiones_totales from public.servicios s where s.id = bp.servicio_id)
       )
 where precio_centimos is null;

alter table public.bonos_pacientes
  alter column precio_centimos set not null;


-- 2. Modificar bono_asignar_manual para que guarde precio_centimos
create or replace function public.bono_asignar_manual(
  p_paciente_id            uuid,
  p_servicio_id            uuid,
  p_sesiones               int,
  p_metodo                 text,
  p_importe_centimos       int,
  p_validez_dias           int default 180,
  p_notas                  text default null,
  p_excluir_facturacion    boolean default false
)
returns table (
  bono_id uuid,
  pago_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin_id       uuid := auth.uid();
  v_is_admin       boolean;
  v_paciente_ok    boolean;
  v_servicio_ok    boolean;
  v_bono_id        uuid;
  v_pago_id        uuid;
  v_fecha_exp      date;
  v_metadata       jsonb;
  v_es_regalo      boolean;
  v_bono_estado    public.bono_estado;
  v_bono_activo    boolean;
begin
  if v_admin_id is null then
    raise exception 'bono_asignar_manual: no autenticado' using errcode = '42501';
  end if;

  select exists (
    select 1 from public.profiles p
     where p.id = v_admin_id and p.role = 'admin'
  ) into v_is_admin;

  if not v_is_admin then
    raise exception 'bono_asignar_manual: requiere rol admin' using errcode = '42501';
  end if;

  if p_metodo not in ('tarjeta', 'bizum', 'transferencia', 'regalo', 'efectivo', 'klarna') then
    raise exception 'bono_asignar_manual: metodo "%" inválido', p_metodo
      using errcode = '22023';
  end if;

  if p_sesiones is null or p_sesiones < 1 or p_sesiones > 100 then
    raise exception 'bono_asignar_manual: sesiones debe estar entre 1 y 100'
      using errcode = '22023';
  end if;

  if p_importe_centimos is null or p_importe_centimos < 0 then
    raise exception 'bono_asignar_manual: importe_centimos no puede ser negativo'
      using errcode = '22023';
  end if;

  select exists (select 1 from public.pacientes where id = p_paciente_id and activo = true)
    into v_paciente_ok;
  if not v_paciente_ok then
    raise exception 'bono_asignar_manual: paciente no existe o inactivo'
      using errcode = 'P0002';
  end if;

  select exists (select 1 from public.servicios where id = p_servicio_id and activo = true)
    into v_servicio_ok;
  if not v_servicio_ok then
    raise exception 'bono_asignar_manual: servicio no existe o inactivo'
      using errcode = 'P0002';
  end if;

  v_fecha_exp := case
    when p_validez_dias is not null and p_validez_dias > 0
      then (current_date + p_validez_dias)
    else null
  end;

  v_es_regalo := (p_metodo in ('regalo', 'efectivo'));
  v_bono_estado := case when v_es_regalo then 'activo'::public.bono_estado else 'pendiente_pago'::public.bono_estado end;
  v_bono_activo := v_es_regalo;

  insert into public.bonos_pacientes (
    paciente_id, servicio_id, sesiones_totales, sesiones_consumidas,
    estado, fecha_compra, fecha_expiracion, activo, precio_centimos
  ) values (
    p_paciente_id, p_servicio_id, p_sesiones, 0,
    v_bono_estado, now(), v_fecha_exp, v_bono_activo, p_importe_centimos
  )
  returning id into v_bono_id;

  v_metadata := jsonb_build_object(
    'origen',           'manual',
    'creado_por',       v_admin_id,
    'notas',            coalesce(p_notas, ''),
    'sesiones',         p_sesiones,
    'validez_dias',     p_validez_dias,
    'pre_bono',         not v_es_regalo
  );

  if v_es_regalo then
    insert into public.pagos (
      paciente_id, bono_id,
      importe_centimos, moneda, estado,
      metodo, metadata,
      fecha_pago, activo,
      excluir_de_facturacion
    ) values (
      p_paciente_id, v_bono_id,
      greatest(p_importe_centimos, 1), 'EUR', 'completado',
      p_metodo, v_metadata,
      now(), true,
      p_excluir_facturacion or p_importe_centimos = 0 or p_metodo = 'regalo'
    )
    returning id into v_pago_id;
  end if;

  perform public.append_auditoria(
    v_admin_id,
    'bono_asignar_manual',
    'bonos_pacientes',
    v_bono_id::text,
    jsonb_build_object(
      'paciente_id',      p_paciente_id,
      'servicio_id',      p_servicio_id,
      'sesiones',         p_sesiones,
      'metodo',           p_metodo,
      'importe_centimos', p_importe_centimos,
      'pre_bono',         not v_es_regalo,
      'excluir_facturacion', p_excluir_facturacion or p_importe_centimos = 0 or p_metodo = 'regalo',
      'pago_id',          v_pago_id,
      'notas',            coalesce(p_notas, '')
    )
  );

  return query select v_bono_id, v_pago_id;
end
$$;


-- 3. Crear RPC preparar_checkout_activar_bono
create or replace function public.preparar_checkout_activar_bono(
  p_bono_paciente_id uuid,
  p_user_id uuid
) returns table (
  bono_paciente_id uuid,
  nombre text,
  descripcion text,
  sesiones integer,
  importe_centimos integer,
  email text,
  display_name text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_paciente_id uuid;
  v_bono_record record;
  v_profile record;
  v_servicio record;
begin
  select id into v_paciente_id
  from public.pacientes
  where user_id = p_user_id
  and activo = true;

  if not found then
      raise exception 'preparar_checkout_activar_bono: paciente no existe o inactivo' using errcode = '42501';
  end if;

  select
      bp.id,
      bp.servicio_id,
      bp.sesiones_totales,
      bp.precio_centimos,
      bp.estado
  into v_bono_record
  from public.bonos_pacientes bp
  where bp.id = p_bono_paciente_id
    and bp.paciente_id = v_paciente_id;

  if not found then
      raise exception 'preparar_checkout_activar_bono: bono no encontrado o no pertenece al paciente';
  end if;

  if v_bono_record.estado != 'pendiente_pago' then
      raise exception 'preparar_checkout_activar_bono: bono no está pendiente de pago';
  end if;

  select s.nombre, s.descripcion into v_servicio
  from public.servicios s
  where s.id = v_bono_record.servicio_id;

  select pr.email, pr.display_name into v_profile
  from public.profiles pr
  where pr.id = p_user_id;

  return query select
      v_bono_record.id,
      'Activación Bono ' || v_servicio.nombre as nombre,
      v_servicio.descripcion,
      v_bono_record.sesiones_totales,
      v_bono_record.precio_centimos,
      v_profile.email,
      v_profile.display_name;
end;
$$;

revoke all on function public.preparar_checkout_activar_bono(uuid, uuid) from public, anon, authenticated;
grant execute on function public.preparar_checkout_activar_bono(uuid, uuid) to service_role;


-- 4. Actualizar procesar_pago_stripe para soportar activar_bono
create or replace function public.procesar_pago_stripe(
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
) returns table (
  pago_id           uuid,
  cita_confirmada   boolean,
  bono_creado       boolean,
  bono_id           uuid,
  ya_procesado      boolean,
  cita_afectada_id  uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_pago_id              uuid;
  v_paciente_id          uuid;
  v_cita_estado          public.cita_estado;
  v_cita_afectada_id     uuid;
  v_bono_creado          boolean := false;
  v_bono_id              uuid := null;
  v_cita_confirmada      boolean := false;
  v_kind                 text;
  v_bono_config          record;
  v_bono_activar_id      uuid;
  v_servicio_id          uuid;
  v_slot_inicio          text;
begin
  if exists (select 1 from public.pagos where stripe_event_id = p_stripe_event_id) then
    return query select
      p.id, false, false, p.bono_id, true, p.cita_id
      from public.pagos p
      where stripe_event_id = p_stripe_event_id;
    return;
  end if;

  v_paciente_id := public.ensure_paciente_para_pago(p_user_id);
  v_kind := p_metadata->>'kind';

  if v_kind = 'cita' then
    v_cita_afectada_id := p_cita_id;
    v_servicio_id := (p_metadata->>'servicio_id')::uuid;
    v_slot_inicio := p_metadata->>'slot_inicio';

    if v_cita_afectada_id is null and v_servicio_id is not null and v_slot_inicio is not null then
      insert into public.citas (
        paciente_id, servicio_id, inicio, fin,
        estado, notas_admin, activo
      ) values (
        v_paciente_id,
        v_servicio_id,
        v_slot_inicio::timestamptz,
        v_slot_inicio::timestamptz + ((select duracion_minutos from public.servicios where id = v_servicio_id) || ' minutes')::interval,
        'confirmada',
        'Pago directo Payment Element',
        true
      ) returning id into v_cita_afectada_id;
      
      v_cita_confirmada := true;
    elsif v_cita_afectada_id is not null then
      select estado into v_cita_estado
      from public.citas
      where id = v_cita_afectada_id and paciente_id = v_paciente_id;

      if v_cita_estado = 'bloqueo_temporal' then
        update public.citas
           set estado = 'confirmada'
         where id = v_cita_afectada_id;
        v_cita_confirmada := true;
      end if;
    end if;

  elsif v_kind = 'bono' then
    if p_bono_config_id is null then
      raise exception 'procesar_pago_stripe: kind=bono pero bono_config_id nulo';
    end if;

    select * into v_bono_config
    from public.bonos_config
    where id = p_bono_config_id;

    if not found then
      raise exception 'procesar_pago_stripe: bono_config_id no existe';
    end if;

    insert into public.bonos_pacientes (
      paciente_id, servicio_id, sesiones_totales, sesiones_consumidas,
      estado, fecha_compra, fecha_expiracion, activo, precio_centimos
    ) values (
      v_paciente_id,
      v_bono_config.servicio_id,
      v_bono_config.sesiones,
      0,
      'activo',
      now(),
      case
        when v_bono_config.validez_dias is not null and v_bono_config.validez_dias > 0
          then (current_date + v_bono_config.validez_dias)
        else null
      end,
      true,
      v_bono_config.precio_centimos
    ) returning id into v_bono_id;

    v_bono_creado := true;

  elsif v_kind = 'activar_bono' then
    v_bono_activar_id := (p_metadata->>'bono_paciente_id')::uuid;

    if v_bono_activar_id is null then
      raise exception 'procesar_pago_stripe: kind=activar_bono pero bono_paciente_id nulo';
    end if;

    update public.bonos_pacientes
       set estado = 'activo',
           activo = true,
           fecha_compra = now()
     where id = v_bono_activar_id
       and paciente_id = v_paciente_id
       and estado = 'pendiente_pago'
     returning id into v_bono_id;

    if v_bono_id is null then
      -- Podría haber sido ya activado por otro pago paralelo
      v_bono_id := v_bono_activar_id;
    else
      v_bono_creado := true; -- Lo marcamos como creado para que dispare el email de confirmación
    end if;

  else
    raise exception 'procesar_pago_stripe: kind "%" desconocido', v_kind;
  end if;

  insert into public.pagos (
    paciente_id, cita_id, bono_id,
    stripe_event_id, stripe_session_id, stripe_payment_intent,
    importe_centimos, moneda, estado, metodo, metadata,
    fecha_pago, activo
  ) values (
    v_paciente_id,
    v_cita_afectada_id,
    v_bono_id,
    p_stripe_event_id,
    p_stripe_session_id,
    p_stripe_payment_intent,
    p_importe_centimos,
    p_moneda,
    'completado',
    coalesce(p_metodo, 'tarjeta'),
    p_metadata,
    now(),
    true
  ) returning id into v_pago_id;

  perform public.append_auditoria(
    v_paciente_id,
    'pago_stripe_completado',
    'pagos',
    v_pago_id::text,
    jsonb_build_object(
      'stripe_event_id', p_stripe_event_id,
      'importe_centimos', p_importe_centimos,
      'cita_id', v_cita_afectada_id,
      'bono_id', v_bono_id,
      'kind', v_kind
    )
  );

  return query select
    v_pago_id, v_cita_confirmada, v_bono_creado, v_bono_id, false, v_cita_afectada_id;

end;
$$;

revoke all on function public.procesar_pago_stripe(text, text, text, text, uuid, uuid, uuid, int, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.procesar_pago_stripe(text, text, text, text, uuid, uuid, uuid, int, text, text, jsonb) to service_role;

commit;
