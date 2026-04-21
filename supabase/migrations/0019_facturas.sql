-- =============================================================================
-- 0019 · Numeración de facturas y RPC `datos_factura`
-- =============================================================================
-- * Añade `numero_factura` (serie A + año + secuencia) a public.pagos.
-- * Implementa secuencia por año (advisory lock) para evitar huecos entre años.
-- * RPC `public.datos_factura(p_pago_id uuid)` devuelve todo lo necesario para
--   renderizar la factura PDF; asigna el número si aún no existe.
-- * Solo dueño del pago o admin pueden invocar.
-- =============================================================================

begin;

-- 1. Columna y constraints
alter table public.pagos
  add column if not exists numero_factura text;

create unique index if not exists pagos_numero_factura_uidx
  on public.pagos(numero_factura)
  where numero_factura is not null;

-- 2. Asignación atómica de número (formato A-YYYY-NNNN)
create or replace function public._asignar_numero_factura(
  p_pago_id uuid,
  p_fecha   timestamptz
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existente text;
  v_anio      int;
  v_seq       int;
  v_numero    text;
begin
  select numero_factura into v_existente from public.pagos where id = p_pago_id;
  if v_existente is not null then
    return v_existente;
  end if;

  v_anio := extract(year from p_fecha)::int;

  -- Advisory lock por año para evitar colisiones concurrentes
  perform pg_advisory_xact_lock(hashtext('factura_serie_' || v_anio::text));

  select coalesce(max(
           nullif(regexp_replace(numero_factura, '^A-\d{4}-', ''), '')::int
         ), 0) + 1
    into v_seq
    from public.pagos
   where numero_factura like 'A-' || v_anio::text || '-%';

  v_numero := 'A-' || v_anio::text || '-' || lpad(v_seq::text, 4, '0');

  update public.pagos
     set numero_factura = v_numero
   where id = p_pago_id
     and numero_factura is null;

  return v_numero;
end;
$$;

revoke all on function public._asignar_numero_factura(uuid, timestamptz) from public;

-- 3. RPC pública: datos para renderizar la factura
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
as $$
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

  -- Permitir: admin, o dueño del pago
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

  -- Asegura número de factura
  if v_pago.numero_factura is null then
    v_pago.numero_factura :=
      public._asignar_numero_factura(v_pago.id, v_pago.fecha_pago);
  end if;

  return query
  select
    v_pago.numero_factura as numero_factura,
    v_pago.fecha_pago     as fecha_factura,
    v_pago.moneda         as moneda,
    v_pago.importe_centimos as importe_centimos,
    v_pago.metodo         as metodo,
    v_pago.descripcion    as descripcion,
    c.inicio              as cita_inicio,
    s.nombre              as servicio_nombre,
    sbono.nombre          as bono_nombre,
    bp.sesiones_totales   as bono_sesiones,
    coalesce(prf.display_name, prf.email)  as paciente_nombre,
    prf.email             as paciente_email,
    pac.user_id           as paciente_user_id
  from public.pacientes pac
  left join public.profiles prf on prf.id = pac.user_id
  left join public.citas c      on c.id = v_pago.cita_id
  left join public.servicios s  on s.id = c.servicio_id
  left join public.bonos_pacientes bp on bp.id = v_pago.bono_id
  left join public.servicios sbono    on sbono.id = bp.servicio_id
  where pac.id = v_pago.paciente_id;
end;
$$;

revoke all on function public.datos_factura(uuid) from public;
grant execute on function public.datos_factura(uuid)
  to authenticated, service_role;

commit;
