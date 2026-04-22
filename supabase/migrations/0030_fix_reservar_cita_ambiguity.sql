-- ============================================================================
-- 0030_fix_reservar_cita_ambiguity.sql
-- ----------------------------------------------------------------------------
-- BUGFIX CRÍTICO (detectado 22-abr-2026 · hito 14 E2E test):
--   `public.reservar_cita` declaraba `estado cita_estado` en su RETURN TABLE.
--   Dentro del cuerpo PL/pgSQL ese identificador `estado` es una variable OUT
--   implícita → colisiona con `bonos_pacientes.estado` y `citas.estado` en las
--   subconsultas, disparando ERROR 42702 "column reference 'estado' is
--   ambiguous" en CADA intento de reserva de cita por parte de un paciente.
--
--   Impacto: 100% de reservas fallaban silenciosamente en el portal paciente.
--   Fix: aliasar `bonos_pacientes` como `bp` y calificar todas las columnas.
-- ============================================================================

create or replace function public.reservar_cita(p_servicio_id uuid, p_slot_inicio timestamp with time zone)
returns table(cita_id uuid, estado cita_estado, consumio_bono boolean)
language plpgsql
security definer
set search_path to 'public'
as $function$
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

  -- FIX 0030: aliasar bonos_pacientes como bp para evitar colisión con la
  -- columna OUT `estado` de la RETURN TABLE.
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
