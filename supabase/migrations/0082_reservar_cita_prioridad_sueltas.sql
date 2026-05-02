-- ============================================================================
-- 0082_reservar_cita_prioridad_sueltas.sql
-- ----------------------------------------------------------------------------
-- Cambia la prioridad de consumo de bono al reservar cita:
--   Primero consume mini-bonos (sesiones sueltas, sesiones_totales=1) y luego
--   bonos grandes, ordenando por sesiones_totales ASC, fecha_compra ASC.
--   Esto garantiza que las sesiones sueltas recuperadas por cancelación se
--   gastan antes que las sesiones de bonos comprados.
-- ============================================================================

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

  -- Prioridad: sesiones sueltas (mini-bonos, sesiones_totales=1) primero,
  -- luego bonos grandes. Dentro de cada grupo, el más antiguo primero.
  select bp.* into v_bono
    from public.bonos_pacientes bp
   where bp.paciente_id = v_paciente_id
     and bp.servicio_id = p_servicio_id
     and bp.estado = 'activo'::public.bono_estado
     and bp.sesiones_consumidas < bp.sesiones_totales
   order by bp.sesiones_totales asc, bp.fecha_compra asc
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
