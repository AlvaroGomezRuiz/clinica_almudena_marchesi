-- ============================================================================
-- 0046_cancelar_cita_48h_sin_reembolso_paciente.sql
-- ----------------------------------------------------------------------------
-- Política solicitada (abr-2026):
--   * Paciente: solo puede cancelar si la cita empieza MÁS de 48h después de
--     now() (es decir: inicio > now() + 48h). Si quedan ≤48h → error 42501.
--   * Paciente: nunca se solicita reembolso automático Stripe; el importe
--     queda gestionado manualmente / como saldo según política de la clínica.
--   * Admin: sin cambio sustantivo (puede forzar; refund Stripe si aplica).
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
  v_refund_flag      boolean := false;
  v_refund_amount    int     := null;
  v_refund_intent    text    := null;
  v_bono_restored    boolean := false;
  v_patient_too_late boolean := false;
  v_display_name     text;
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

    -- Ventana 48h: si quedan 48h o menos hasta el inicio, el paciente no cancela.
    v_patient_too_late := (v_cita.inicio <= now() + interval '48 hours');
    if v_patient_too_late and not p_force then
      raise exception
        'cancelacion_fuera_politica: la cancelación online requiere al menos 48 horas de antelación. Para casos urgentes, escribe a la consulta.'
        using errcode = '42501';
    end if;
  else
    v_patient_too_late := false;
  end if;

  select * into v_pago from public.pagos
    where cita_id = p_cita_id and estado = 'completado' and activo = true
    order by fecha_pago desc limit 1;

  if not found then
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
    -- Reembolso Stripe automático: solo administración (nunca paciente).
    if v_is_admin and v_pago.stripe_payment_intent is not null then
      v_refund_flag   := true;
      v_refund_amount := v_pago.importe_centimos;
      v_refund_intent := v_pago.stripe_payment_intent;
    end if;
  end if;

  update public.citas
     set estado              = 'cancelada',
         activo              = false,
         cancelacion_motivo  = p_motivo,
         cancelacion_by      = v_uid,
         cancelacion_en      = now(),
         updated_at          = now()
   where id = p_cita_id;

  return query select
    true,
    v_refund_flag,
    v_refund_intent,
    v_refund_amount,
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
