-- ============================================================================
-- 0091_activar_bono_auditoria_fix.sql
-- ----------------------------------------------------------------------------
-- Fixes foreign key constraint violation when calling append_auditoria with
-- v_paciente_id instead of p_user_id in procesar_pago_stripe.
-- ============================================================================

begin;

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
    p_user_id, -- FIX: Changed from v_paciente_id to p_user_id
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

commit;
