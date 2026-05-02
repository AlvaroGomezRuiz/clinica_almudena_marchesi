-- ============================================================================
-- 0081_cancelar_sin_reembolso_mini_bono.sql
-- ----------------------------------------------------------------------------
-- Política mayo-2026:
--   * NUNCA se realiza reembolso Stripe automático (ni paciente ni admin).
--   * Al cancelar, si la cita se pagó con bono → restaurar sesión al bono.
--   * Al cancelar, si la cita se pagó con sesión suelta (pago sin bono) →
--     crear mini-bono de 1 sesión del mismo servicio para reutilizar.
--   * Prioridad de consumo al reservar: sueltas (mini-bonos) primero.
--   * Ventana 48h para pacientes: sin cambio.
-- ============================================================================

create or replace function public.cancelar_cita(
  p_cita_id uuid,
  p_motivo  text default null,
  p_force   boolean default false
)
returns table (
  ok                        boolean,
  needs_stripe_refund       boolean,
  stripe_payment_intent     text,
  refund_amount_centimos    int,
  pago_id                   uuid,
  bono_restaurado           boolean,
  email_inicio              timestamptz,
  email_servicio            text,
  email_to_user_id          uuid,
  email_display_name        text
)
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_uid              uuid := auth.uid();
  v_is_admin         boolean;
  v_cita             public.citas%rowtype;
  v_paciente         public.pacientes%rowtype;
  v_profile_id       uuid;
  v_servicio_nombre  text;
  v_bono_id          uuid;
  v_pago             public.pagos%rowtype;
  v_bono_restored    boolean := false;
  v_patient_too_late boolean := false;
  v_display_name     text;
  v_mini_bono_id     uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select (role = 'admin') into v_is_admin
    from public.profiles where id = v_uid;

  select * into v_cita from public.citas where id = p_cita_id for update;
  if not found then
    raise exception 'cita_not_found' using errcode = 'P0002';
  end if;

  if v_cita.activo = false or v_cita.estado = 'cancelada' then
    raise exception 'cita_already_cancelled' using errcode = 'P0004';
  end if;

  select * into v_paciente from public.pacientes where id = v_cita.paciente_id;
  select nombre into v_servicio_nombre from public.servicios where id = v_cita.servicio_id;

  v_profile_id := v_paciente.user_id;
  select display_name into v_display_name from public.profiles where id = v_profile_id;

  if not v_is_admin then
    if v_paciente.user_id is null or v_paciente.user_id <> v_uid then
      raise exception 'forbidden' using errcode = '42501';
    end if;

    v_patient_too_late := (v_cita.inicio <= now() + interval '48 hours');
    if v_patient_too_late and not p_force then
      raise exception
        'cancelacion_fuera_politica: la cancelación online requiere al menos 48 horas de antelación. Para casos urgentes, escribe a la consulta.'
        using errcode = '42501';
    end if;
  else
    v_patient_too_late := false;
  end if;

  -- Buscar pago completado asociado a la cita
  select * into v_pago from public.pagos
    where cita_id = p_cita_id and estado = 'completado' and activo = true
    order by fecha_pago desc limit 1;

  if not found then
    -- Sin pago directo → intentar restaurar sesión de bono
    if v_is_admin or not v_patient_too_late then
      select bp.id into v_bono_id
        from public.bonos_pacientes bp
       where bp.paciente_id = v_cita.paciente_id
         and bp.servicio_id = v_cita.servicio_id
         and bp.sesiones_consumidas > 0
         and bp.activo = true
       order by bp.fecha_compra desc
       limit 1;

      if v_bono_id is not null then
        update public.bonos_pacientes
           set sesiones_consumidas = sesiones_consumidas - 1,
               estado = case
                 when estado = 'agotado' and sesiones_consumidas - 1 < sesiones_totales then 'activo'
                 else estado
               end
         where id = v_bono_id;
        v_bono_restored := true;
      end if;
    end if;
  else
    -- Hay pago completado (sesión suelta) → crear mini-bono de 1 sesión
    -- NUNCA se hace refund Stripe. La sesión se devuelve como crédito.
    if v_is_admin or not v_patient_too_late then
      -- Verificar si el pago estaba vinculado a un bono existente
      if v_pago.bono_id is not null then
        -- El pago era de un bono → restaurar sesión al bono
        update public.bonos_pacientes
           set sesiones_consumidas = sesiones_consumidas - 1,
               estado = case
                 when estado = 'agotado' and sesiones_consumidas - 1 < sesiones_totales then 'activo'
                 else estado
               end
         where id = v_pago.bono_id;
        v_bono_restored := true;
      else
        -- Pago de sesión suelta → crear mini-bono de 1 sesión
        insert into public.bonos_pacientes (
          paciente_id, servicio_id, sesiones_totales, sesiones_consumidas,
          estado, fecha_compra, fecha_expiracion, activo
        ) values (
          v_cita.paciente_id,
          v_cita.servicio_id,
          1,
          0,
          'activo',
          now(),
          null, -- sin expiración para mini-bonos de cancelación
          true
        )
        returning id into v_mini_bono_id;
        v_bono_restored := true;
      end if;
    end if;
  end if;

  -- Marcar la cita como cancelada
  update public.citas
     set estado              = 'cancelada',
         activo              = false,
         cancelacion_motivo  = p_motivo,
         cancelacion_by      = v_uid,
         cancelacion_en      = now(),
         updated_at          = now()
   where id = p_cita_id;

  -- NUNCA needs_stripe_refund — política de no-reembolso
  return query select
    true,
    false,           -- needs_stripe_refund siempre false
    null::text,      -- stripe_payment_intent
    null::int,       -- refund_amount_centimos
    v_pago.id,
    v_bono_restored,
    v_cita.inicio,
    v_servicio_nombre,
    v_profile_id,
    v_display_name;
end;
$function$;

revoke all on function public.cancelar_cita(uuid, text, boolean) from public, anon;
grant execute on function public.cancelar_cita(uuid, text, boolean) to authenticated;
