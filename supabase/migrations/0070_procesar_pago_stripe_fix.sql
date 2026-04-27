-- ============================================================================
-- 0070_procesar_pago_stripe_fix.sql
-- ----------------------------------------------------------------------------
-- La migración 0068 reescribió procesar_pago_stripe omitiendo la columna
-- `descripcion` en el INSERT → error de constraint → Stripe quedaba
-- en "Procesando..." indefinidamente porque el webhook devolvía 500 y
-- Stripe no completaba la transacción.
--
-- Esta migración restaura el INSERT correcto (con descripcion) y mantiene
-- el uso de ensure_paciente_para_pago() para usuarios sin ficha clínica.
-- ============================================================================

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
)
returns table (
  pago_id         uuid,
  cita_confirmada boolean,
  bono_creado     boolean,
  bono_id         uuid,
  ya_procesado    boolean
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
begin
  -- 1. Idempotencia: ¿ya procesamos este evento?
  select p.id
    into v_existing_pago_id
    from public.pagos p
   where p.stripe_event_id = p_stripe_event_id
   limit 1;

  if v_existing_pago_id is not null then
    return query
    select v_existing_pago_id, false, false, null::uuid, true;
    return;
  end if;

  -- 2. Obtener (o crear) paciente_id — no falla aunque no haya ficha clínica
  v_paciente_id := public.ensure_paciente_para_pago(p_user_id);

  if v_paciente_id is null then
    raise exception 'paciente_not_found_ni_creado' using errcode = 'P0002';
  end if;

  -- 3. Descripción del pago (igual que 0050)
  v_descripcion := null;
  if p_bono_config_id is not null then
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

  -- 4. Insert pago con descripcion (columna requerida, omitida en 0068)
  insert into public.pagos (
    paciente_id, cita_id, bono_id,
    stripe_event_id, stripe_session_id, stripe_payment_intent, stripe_customer_id,
    importe_centimos, moneda, estado, metodo, descripcion, metadata,
    fecha_pago
  ) values (
    v_paciente_id, p_cita_id, null,
    p_stripe_event_id, p_stripe_session_id, p_stripe_payment_intent, p_stripe_customer_id,
    p_importe_centimos, coalesce(p_moneda, 'EUR'), 'completado',
    p_metodo, v_descripcion, coalesce(p_metadata, '{}'::jsonb),
    now()
  )
  returning id into v_pago_id;

  -- 5a. Pago de cita: confirmar (solo si sigue en bloqueo_temporal)
  if p_cita_id is not null then
    update public.citas c
       set estado = 'confirmada', updated_at = now()
     where c.id = p_cita_id
       and c.estado = 'bloqueo_temporal'
       and c.activo = true;
    v_cita_ok := found;
  end if;

  -- 5b. Pago de bono: crear bonos_pacientes
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
  select v_pago_id, v_cita_ok, (v_bono_id is not null), v_bono_id, false;
end;
$fn$;

revoke all on function public.procesar_pago_stripe(
  text, text, text, text, uuid, uuid, uuid, int, text, text, jsonb
) from public, anon, authenticated;
