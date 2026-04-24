-- =============================================================================
-- 0047_plpgsql_outparam_ambiguity_recurso_factura.sql
-- -----------------------------------------------------------------------------
-- Causa raíz de errores "que nunca se arreglan" en producción:
-- 1) asignar_recurso_admin: RETURNS TABLE (display_name text) crea variable OUT
--    implícita "display_name". La sentencia
--    `select display_name into v_display from profiles` es 42702 (ambiguo)
--    frente a la columna profiles.display_name.
-- 2) datos_factura: mismas colisiones entre nombres OUT y columnas en
--    RETURN QUERY → Postgres 42804 "structure of query does not match...".
-- Fix: #variable_conflict use_column (como 0045 en chat) + calificar la
-- lectura del perfil con alias.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) asignar_recurso_admin — calificar columna (defensa en profundidad)
-- ---------------------------------------------------------------------------
create or replace function public.asignar_recurso_admin(
  p_recurso_id  uuid,
  p_paciente_id uuid
)
returns table (
  asignacion_id   uuid,
  ya_existia      boolean,
  paciente_user_id uuid,
  display_name     text,
  titulo_recurso   text,
  tipo_recurso     text
)
language plpgsql
security definer
set search_path = public
as $function$
#variable_conflict use_column
declare
  v_uid        uuid := auth.uid();
  v_is_admin   boolean;
  v_existing   uuid;
  v_asig_id    uuid;
  v_recurso    public.recursos%rowtype;
  v_paciente   public.pacientes%rowtype;
  v_user_id    uuid;
  v_display    text;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select (role = 'admin') into v_is_admin from public.profiles where id = v_uid;
  if not v_is_admin then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select * into v_recurso from public.recursos
    where id = p_recurso_id and activo = true;
  if not found then
    raise exception 'recurso_not_found' using errcode = 'P0002';
  end if;

  select * into v_paciente from public.pacientes where id = p_paciente_id and activo = true;
  if not found then
    raise exception 'paciente_not_found' using errcode = 'P0002';
  end if;

  v_user_id := v_paciente.user_id;
  if v_user_id is not null then
    select pr.display_name into v_display
      from public.profiles pr
     where pr.id = v_user_id;
  end if;

  select id into v_existing
    from public.recurso_asignaciones
   where recurso_id = p_recurso_id and paciente_id = p_paciente_id;

  if v_existing is not null then
    update public.recurso_asignaciones
       set activo = true
     where id = v_existing and activo = false;
    return query select v_existing, true, v_user_id, v_display, v_recurso.titulo, v_recurso.tipo::text;
    return;
  end if;

  insert into public.recurso_asignaciones (recurso_id, paciente_id, assigned_by, activo)
       values (p_recurso_id, p_paciente_id, v_uid, true)
   returning id into v_asig_id;

  return query select v_asig_id, false, v_user_id, v_display, v_recurso.titulo, v_recurso.tipo::text;
end;
$function$;

-- ---------------------------------------------------------------------------
-- 2) datos_factura — pragma use_column en el cuerpo
-- ---------------------------------------------------------------------------
create or replace function public.datos_factura(p_pago_id uuid)
returns table (
  numero_factura     text,
  fecha_factura      timestamptz,
  moneda             text,
  importe_centimos   int,
  metodo             text,
  descripcion        text,
  cita_inicio        timestamptz,
  servicio_nombre    text,
  bono_nombre        text,
  bono_sesiones      int,
  paciente_nombre    text,
  paciente_email     text,
  paciente_user_id   uuid
)
language plpgsql
security definer
set search_path = public
as $function$
#variable_conflict use_column
declare
  v_pago record;
  v_allowed boolean := false;
begin
  select p.id, p.paciente_id, p.fecha_pago, p.estado, p.moneda,
         p.importe_centimos, p.metodo, p.descripcion, p.cita_id, p.bono_id,
         p.numero_factura
    into v_pago
    from public.pagos p
   where p.id = p_pago_id;

  if not found then
    raise exception 'pago_no_encontrado' using errcode = 'PGRST';
  end if;

  select (public.is_admin() or pac.user_id = auth.uid())
    into v_allowed
    from public.pacientes pac
   where pac.id = v_pago.paciente_id;

  if not coalesce(v_allowed, false) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if v_pago.estado <> 'completado' then
    raise exception 'pago_no_completado' using errcode = 'PGRST';
  end if;

  if v_pago.numero_factura is null then
    v_pago.numero_factura :=
      public._asignar_numero_factura(v_pago.id, v_pago.fecha_pago);
  end if;

  return query
  select
    v_pago.numero_factura,
    v_pago.fecha_pago,
    v_pago.moneda,
    v_pago.importe_centimos::int,
    v_pago.metodo,
    v_pago.descripcion,
    c.inicio,
    s.nombre,
    sbono.nombre,
    bp.sesiones_totales,
    coalesce(prf.display_name, prf.email)  as paciente_nombre,
    prf.email,
    pac.user_id
  from public.pacientes pac
  left join public.profiles prf on prf.id = pac.user_id
  left join public.citas c      on c.id = v_pago.cita_id
  left join public.servicios s  on s.id = c.servicio_id
  left join public.bonos_pacientes bp on bp.id = v_pago.bono_id
  left join public.servicios sbono    on sbono.id = bp.servicio_id
  where pac.id = v_pago.paciente_id
  limit 1;
end;
$function$;
