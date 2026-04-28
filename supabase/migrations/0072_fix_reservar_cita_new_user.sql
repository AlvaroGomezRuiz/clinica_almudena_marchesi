-- ============================================================================
-- 0072_fix_reservar_cita_new_user.sql
-- ----------------------------------------------------------------------------
-- El usuario final reporta que los pacientes nuevos reciben error al intentar
-- reservar cita por primera vez ("me salia un error que no se podia pagar al momento").
-- Esto se debe a que `reservar_cita` exigia un registro en `pacientes` que no existe
-- hasta que el admin lo crea o hasta que pagan un bono.
--
-- Solucion:
-- Modificar `reservar_cita` para llamar a `ensure_paciente_para_pago(auth.uid())`
-- si el paciente no tiene ficha todavia, igual que se hace para Stripe.
-- ============================================================================

create or replace function public.reservar_cita(p_servicio_id uuid, p_slot_inicio timestamp with time zone)
returns table(cita_id uuid, estado cita_estado, consumio_bono boolean)
language plpgsql
security definer
set search_path to 'public'
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
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;

  -- FIX: Si no hay paciente, crear uno mínimo (placeholder) para poder reservar
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
