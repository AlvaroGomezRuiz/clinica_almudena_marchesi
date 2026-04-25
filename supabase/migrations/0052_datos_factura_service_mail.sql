-- 0052 — RPC interna para generar datos de factura desde Edge (service_role).
-- `datos_factura` exige paciente/admin vía auth.uid(); el webhook usa service_role
-- y no puede llamarla. Solo invocable con JWT role = service_role.

create or replace function public.datos_factura_service_mail(p_pago_id uuid)
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
as $fn$
#variable_conflict use_column
declare
  v_pago   record;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select
    p.id, p.paciente_id, p.fecha_pago, p.estado, p.moneda,
    p.importe_centimos, p.metodo, p.descripcion, p.cita_id, p.bono_id, p.numero_factura
    into v_pago
    from public.pagos p
   where p.id = p_pago_id;

  if not found then
    raise exception 'pago_no_encontrado' using errcode = 'PGRST';
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
    vf.nf::text,
    vf.ff::timestamptz,
    vf.mo::text,
    vf.im::int,
    vf.me::text,
    vf.de::text,
    vf.ci::timestamptz,
    vf.sn::text,
    vf.bn::text,
    vf.bs::int,
    vf.pn::text,
    vf.pe::text,
    vf.pu::uuid
  from (
    select
      v_pago.numero_factura                    as nf,
      v_pago.fecha_pago                        as ff,
      v_pago.moneda                            as mo,
      v_pago.importe_centimos::int              as im,
      v_pago.metodo                            as me,
      v_pago.descripcion                        as de,
      c.inicio                                 as ci,
      s.nombre::text                            as sn,
      coalesce(bpack.nombre::text, sbono.nombre::text, v_pago.descripcion) as bn,
      coalesce(bp.sesiones_totales, 0)::int     as bs,
      (coalesce(prf.display_name::text, prf.email::text)) as pn,
      (prf.email::text)                         as pe,
      pac.user_id                               as pu
    from public.pacientes pac
    left join public.profiles prf on prf.id = pac.user_id
    left join public.citas  c  on c.id = v_pago.cita_id
    left join public.servicios s  on s.id = c.servicio_id
    left join public.bonos_pacientes bp
      on bp.id = v_pago.bono_id
    left join public.servicios sbono
      on sbono.id = bp.servicio_id
    left join lateral (
      select bc2.nombre
        from public.bonos_config bc2
       where bp.id is not null
         and bc2.servicio_id = bp.servicio_id
         and bc2.sesiones = bp.sesiones_totales
       limit 1
    ) bpack on true
   where pac.id = v_pago.paciente_id
   limit 1
  ) as vf;
end;
$fn$;

revoke all on function public.datos_factura_service_mail(uuid) from public;
grant execute on function public.datos_factura_service_mail(uuid) to service_role;

comment on function public.datos_factura_service_mail(uuid) is
  'Solo service_role. Usado por Edge send-email para adjuntar PDF sin sesión de usuario.';
