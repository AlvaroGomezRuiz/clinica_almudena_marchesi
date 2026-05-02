-- ============================================================================
-- 0086_auto_confirmar_cita_pendiente_pago.sql
-- ----------------------------------------------------------------------------
-- Función trigger que se ejecuta después de insertar un pago completado.
-- Si el paciente tiene citas en estado pendiente_pago, consume una sesión
-- (del bono recién comprado o del pago suelta) y confirma la cita.
-- Prioridad: sueltas primero, luego bonos grandes.
-- ============================================================================

create or replace function public.auto_confirmar_citas_pendiente_pago()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cita       record;
  v_bono       record;
  v_paciente_id uuid;
begin
  -- Solo actuar sobre pagos completados
  if new.estado <> 'completado' then
    return new;
  end if;

  v_paciente_id := new.paciente_id;
  if v_paciente_id is null then
    return new;
  end if;

  -- Buscar citas pendiente_pago del paciente, ordenadas por fecha (la más próxima primero)
  for v_cita in
    select c.id, c.servicio_id, c.inicio
      from public.citas c
     where c.paciente_id = v_paciente_id
       and c.estado = 'pendiente_pago'
       and c.activo = true
       and c.inicio > now()
     order by c.inicio asc
  loop
    -- Verificar si el paciente tiene saldo para este servicio
    select bp.id, bp.sesiones_totales, bp.sesiones_consumidas
      into v_bono
      from public.bonos_pacientes bp
     where bp.paciente_id = v_paciente_id
       and bp.servicio_id = v_cita.servicio_id
       and bp.estado = 'activo'
       and bp.activo = true
       and bp.sesiones_consumidas < bp.sesiones_totales
     order by bp.sesiones_totales asc, bp.fecha_compra asc
     limit 1;

    if v_bono.id is not null then
      -- Consumir sesión del bono
      update public.bonos_pacientes
         set sesiones_consumidas = sesiones_consumidas + 1,
             estado = case
               when sesiones_consumidas + 1 >= sesiones_totales then 'agotado'::public.bono_estado
               else estado
             end
       where id = v_bono.id;

      -- Confirmar la cita
      update public.citas
         set estado = 'confirmada',
             updated_at = now()
       where id = v_cita.id;
    end if;
  end loop;

  return new;
end;
$$;

-- Trigger en la tabla pagos
drop trigger if exists trg_auto_confirmar_citas_pendiente on public.pagos;

create trigger trg_auto_confirmar_citas_pendiente
  after insert on public.pagos
  for each row
  when (new.estado = 'completado')
  execute function public.auto_confirmar_citas_pendiente_pago();

comment on function public.auto_confirmar_citas_pendiente_pago() is
  'Trigger: tras pago completado, busca citas pendiente_pago del paciente y las confirma consumiendo sesión.';
