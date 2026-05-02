-- ============================================================================
-- 0090_activar_bono_fix.sql
-- ----------------------------------------------------------------------------
-- Fixes type mismatch in preparar_checkout_activar_bono where profiles.email
-- is citext but function returns table defined it as text.
-- ============================================================================

begin;

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
      ('Activación Bono ' || v_servicio.nombre)::text as nombre,
      v_servicio.descripcion::text,
      v_bono_record.sesiones_totales,
      v_bono_record.precio_centimos,
      v_profile.email::text,
      v_profile.display_name::text;
end;
$$;

commit;
