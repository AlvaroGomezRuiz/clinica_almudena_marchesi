-- 0050 — descripción en pago (Stripe), factura PDF (datos_factura), y claridad
-- ---------------------------------------------------------------------------
-- 0) Tipo de email `bono_comprado` (log + dedupe por pago_id).
-- 1) `procesar_pago_stripe` rellena `pagos.descripcion` (antes NULL en INSERT).
-- 2) `datos_factura`: SELECT con alias/casts explícitos (evita 42804 con PostgREST)
--    y nombre de pack desde `bonos_config` por (servicio_id, sesiones).

alter type public.email_type add value if not exists 'bono_comprado';

-- Dedupe: un email de recibo de bono por pago (varios bonos el mismo día).
create or replace function public.emails_log_set_dedupe_key()
returns trigger
language plpgsql
as $tr$
begin
  if new.dedupe_key is null then
    if new.email_type = 'bono_comprado' and new.pago_id is not null then
      new.dedupe_key := 'bono_comprado:' || new.pago_id::text;
    else
      new.dedupe_key :=
        (new.email_type::text) || ':' ||
        coalesce(new.cita_id::text, new.to_user_id::text, new.to_email::text) ||
        ':' ||
        to_char((now() at time zone 'Europe/Madrid')::date, 'YYYY-MM-DD');
    end if;
  end if;
  return new;
end;
$tr$;

-- ---------------------------------------------------------------------------
-- 1) procesar_pago_stripe
-- ---------------------------------------------------------------------------
create or replace function public.procesar_pago_stripe(
  p_stripe_event_id       text,
  p_stripe_session_id     text,
  p_stripe_payment_intent text,
  p_stripe_customer_id    text,
  p_user_id               uuid,
  p_cita_id               uuid,
  p_bono_config_id        uuid,
  p_importe_centimos      int,
  p_moneda                text,
  p_metodo                text,
  p_metadata              jsonb
)
returns table (
  pago_id         uuid,
  cita_confirmada boolean,
  bono_creado     boolean,
  bono_id         uuid,
  ya_procesado    boolean
)
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_existing_pago_id uuid;
  v_paciente_id      uuid;
  v_cita_ok          boolean := false;
  v_bono_id          uuid;
  v_pago_id          uuid;
  v_descripcion      text;
begin
  select p.id
    into v_existing_pago_id
    from public.pagos p
   where p.stripe_event_id = p_stripe_event_id
   limit 1;

  if v_existing_pago_id is not null then
    return query
    select v_existing_pago_id, false, false, null::uuid, true;
    return;
  end if;

  select pa.id
    into v_paciente_id
    from public.pacientes pa
   where pa.user_id = p_user_id
   limit 1;

  if v_paciente_id is null then
    raise exception 'paciente_not_found' using errcode = 'P0002';
  end if;

  v_descripcion := null;
  if p_bono_config_id is not null then
    select
      (bc.nombre
        || ' · ' || bc.sesiones::text
        || ' sesiones'
        || case
            when bc.validez_dias is not null
              then ' · vence a los ' || bc.validez_dias::text || ' días'
            else ''
          end)
      into v_descripcion
      from public.bonos_config bc
     where bc.id = p_bono_config_id;
  elsif p_cita_id is not null then
    select ('Cita — ' || s.nombre)
      into v_descripcion
      from public.citas  c
      join public.servicios s on s.id = c.servicio_id
     where c.id = p_cita_id;
  end if;

  insert into public.pagos (
    paciente_id, cita_id, bono_id,
    stripe_event_id, stripe_session_id, stripe_payment_intent, stripe_customer_id,
    importe_centimos, moneda, estado, metodo, descripcion, metadata,
    fecha_pago
  ) values (
    v_paciente_id, p_cita_id, null,
    p_stripe_event_id, p_stripe_session_id, p_stripe_payment_intent, p_stripe_customer_id,
    p_importe_centimos, coalesce(p_moneda, 'EUR'), 'completado',
    p_metodo, v_descripcion, coalesce(p_metadata, '{}'::jsonb),
    now()
  )
  returning id into v_pago_id;

  if p_cita_id is not null then
    update public.citas c
       set estado = 'confirmada', updated_at = now()
     where c.id = p_cita_id
       and c.estado = 'bloqueo_temporal'
       and c.activo = true;
    v_cita_ok := found;
  end if;

  if p_bono_config_id is not null then
    insert into public.bonos_pacientes (
      paciente_id, servicio_id, sesiones_totales, sesiones_consumidas,
      estado, fecha_compra, fecha_expiracion, activo
    )
    select
      v_paciente_id, bc.servicio_id, bc.sesiones, 0,
      'activo', now(),
      case
        when bc.validez_dias is not null then (current_date + bc.validez_dias)
        else null
      end,
      true
    from public.bonos_config bc
   where bc.id = p_bono_config_id
    returning id into v_bono_id;

    if v_bono_id is not null then
      update public.pagos p set bono_id = v_bono_id where p.id = v_pago_id;
    end if;
  end if;

  return query
  select v_pago_id, v_cita_ok, (v_bono_id is not null), v_bono_id, false;
end;
$fn$;

revoke all on function public.procesar_pago_stripe(
  text, text, text, text, uuid, uuid, uuid, int, text, text, jsonb
) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) datos_factura
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
as $fn2$
#variable_conflict use_column
declare
  v_pago   record;
  v_allow  boolean;
begin
  select
    p.id, p.paciente_id, p.fecha_pago, p.estado, p.moneda,
    p.importe_centimos, p.metodo, p.descripcion, p.cita_id, p.bono_id, p.numero_factura
    into v_pago
    from public.pagos p
   where p.id = p_pago_id;

  if not found then
    raise exception 'pago_no_encontrado' using errcode = 'PGRST';
  end if;

  select (public.is_admin() or pac.user_id = auth.uid())
    into v_allow
    from public.pacientes pac
   where pac.id = v_pago.paciente_id;

  if not coalesce(v_allow, false) then
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
$fn2$;

revoke all on function public.datos_factura(uuid) from public;
grant execute on function public.datos_factura(uuid)
  to authenticated, service_role;
