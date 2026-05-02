-- ============================================================================
-- 0084_pendiente_pago_estado.sql
-- ----------------------------------------------------------------------------
-- Añade 'pendiente_pago' al enum cita_estado y bono_estado.
-- Citas pendiente_pago: creadas por admin cuando paciente no tiene saldo.
-- Bonos pendiente_pago: pre-bonos asignados por admin que esperan pago.
-- ============================================================================

-- Añadir pendiente_pago a cita_estado si no existe
do $$
begin
  if not exists (
    select 1 from pg_enum
    join pg_type on pg_enum.enumtypid = pg_type.oid
    where pg_type.typname = 'cita_estado' and pg_enum.enumlabel = 'pendiente_pago'
  ) then
    alter type public.cita_estado add value 'pendiente_pago';
  end if;
end
$$;

-- Añadir pendiente_pago a bono_estado si no existe
do $$
begin
  if not exists (
    select 1 from pg_enum
    join pg_type on pg_enum.enumtypid = pg_type.oid
    where pg_type.typname = 'bono_estado' and pg_enum.enumlabel = 'pendiente_pago'
  ) then
    alter type public.bono_estado add value 'pendiente_pago';
  end if;
end
$$;

-- Citas pendiente_pago NO bloquean la agenda para otros pacientes
-- (ya manejado en obtener_cuadricula_reserva: solo confirmada/completada bloquean)
-- Pero SÍ bloquean el slot para que no haya doble booking:
-- → Se mantiene el constraint de exclusión existente que cubre activo=true.
-- → Al cancelar un pendiente_pago por falta de pago, se pone activo=false.

comment on type public.cita_estado is
  'bloqueo_temporal | confirmada | completada | cancelada | no_asistio | pendiente_pago';

comment on type public.bono_estado is
  'activo | agotado | expirado | cancelado | pendiente_pago';
