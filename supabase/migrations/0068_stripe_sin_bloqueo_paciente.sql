-- ============================================================================
-- 0068_stripe_sin_bloqueo_paciente.sql
-- ----------------------------------------------------------------------------
-- Stripe Checkout y PaymentElement fallaban con "bono_not_found_or_not_owned"
-- para cualquier usuario que no tuviese una fila en public.pacientes, incluso
-- aunque su profile en public.profiles existiera correctamente.
--
-- Raíz del problema:
--   • preparar_checkout_bono exigía EXISTS(pacientes WHERE user_id = p_user_id).
--   • procesar_pago_stripe lanzaba 'paciente_not_found' si no había fila.
--   • Los usuarios cuyo autoregistro falló silenciosamente (o que fueron creados
--     antes de la migración 0029) quedan sin fila en pacientes → Stripe roto.
--
-- Solución:
--   1. preparar_checkout_bono  — eliminar la restricción de pacientes; basta
--      con que el profile exista (validación real de ownership va en el webhook).
--   2. procesar_pago_stripe    — si no existe fila en pacientes, crear una
--      mínima con los datos del profile (nombre como placeholder cifrado).
--      Cuando Almudena cree la ficha completa, se actualizará el user_id.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. preparar_checkout_bono — solo requiere profile existente
--    DROP necesario: cambia email citext → text
-- ---------------------------------------------------------------------------
drop function if exists public.preparar_checkout_bono(uuid, uuid) cascade;

create function public.preparar_checkout_bono(
  p_bono_config_id uuid,
  p_user_id        uuid
)
returns table (
  bono_config_id    uuid,
  nombre            text,
  descripcion       text,
  sesiones          int,
  importe_centimos  int,
  email             text,
  display_name      text
)
language sql
security definer
set search_path = public, extensions
stable
as $$
  select
    bc.id                as bono_config_id,
    bc.nombre,
    bc.descripcion,
    bc.sesiones,
    bc.precio_centimos   as importe_centimos,
    pr.email::text,
    pr.display_name
  from public.bonos_config bc
  join public.profiles pr on pr.id = p_user_id
  where bc.id = p_bono_config_id
    and bc.activo = true;
$$;

revoke all on function public.preparar_checkout_bono(uuid, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. preparar_checkout_cita — también eliminar la restricción de pacientes
--    DROP necesario: cambia email citext → text
-- ---------------------------------------------------------------------------
drop function if exists public.preparar_checkout_cita(uuid, uuid) cascade;

create function public.preparar_checkout_cita(
  p_cita_id uuid,
  p_user_id uuid
)
returns table (
  cita_id          uuid,
  inicio           timestamptz,
  servicio_nombre  text,
  importe_centimos int,
  email            text,
  display_name     text
)
language sql
security definer
set search_path = public, extensions
stable
as $$
  select
    c.id                as cita_id,
    c.inicio,
    s.nombre            as servicio_nombre,
    s.precio_centimos   as importe_centimos,
    pr.email::text,
    pr.display_name
  from public.citas c
  join public.servicios s on s.id = c.servicio_id
  join public.pacientes pa on pa.id = c.paciente_id
  join public.profiles  pr on pr.id = pa.user_id
  where c.id = p_cita_id
    and c.activo = true
    and c.estado = 'bloqueo_temporal'
    and pa.user_id = p_user_id
    and c.inicio > now();
$$;

revoke all on function public.preparar_checkout_cita(uuid, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Helper privado: obtener o crear fila mínima en pacientes para pago
--    Se llama desde procesar_pago_stripe cuando no existe ficha clínica.
--    Usa datos del profile (display_name) como nombre placeholder cifrado.
-- ---------------------------------------------------------------------------
create or replace function public.ensure_paciente_para_pago(
  p_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_paciente_id uuid;
  v_display_name text;
  v_email        text;
  v_placeholder  text;
begin
  -- ¿Ya existe?
  select id into v_paciente_id
    from public.pacientes
   where user_id = p_user_id
   limit 1;

  if v_paciente_id is not null then
    return v_paciente_id;
  end if;

  -- Leer datos del profile para el placeholder
  select display_name, email
    into v_display_name, v_email
    from public.profiles
   where id = p_user_id;

  -- Nombre de fallback si el profile no tiene display_name
  v_display_name := coalesce(nullif(btrim(v_display_name), ''), split_part(v_email::text, '@', 1), 'Sin nombre');

  -- Placeholder único para dni_nie_bidx (no se puede dejar vacío ni puede colisionar)
  -- Usamos sha256(user_id || '_stripe_placeholder') → hex
  v_placeholder := encode(
    digest(p_user_id::text || '_stripe_placeholder', 'sha256'),
    'hex'
  );

  insert into public.pacientes (
    user_id,
    nombre_completo_ciphertext,
    nombre_completo_bidx,
    dni_nie_ciphertext,
    dni_nie_bidx,
    consentimiento_rgpd
  ) values (
    p_user_id,
    -- Nombre cifrado con app_encrypt (si disponible); si no, plaintext temporal
    coalesce(public.app_encrypt(v_display_name), v_display_name),
    coalesce(public.app_bidx(v_display_name),    lower(btrim(v_display_name))),
    -- DNI placeholder único para no violar UNIQUE constraint
    coalesce(public.app_encrypt('PENDIENTE-' || p_user_id::text), 'PENDIENTE-' || p_user_id::text),
    v_placeholder,
    true
  )
  on conflict (user_id) do nothing
  returning id into v_paciente_id;

  -- Si on conflict no devolvió id, leer el existente
  if v_paciente_id is null then
    select id into v_paciente_id from public.pacientes where user_id = p_user_id limit 1;
  end if;

  return v_paciente_id;
end;
$$;

-- Solo service_role puede llamarla (se invoca desde dentro de procesar_pago_stripe)
revoke all on function public.ensure_paciente_para_pago(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. procesar_pago_stripe — usa ensure_paciente_para_pago antes de insertar
-- ---------------------------------------------------------------------------
create or replace function public.procesar_pago_stripe(
  p_stripe_event_id      text,
  p_stripe_session_id    text,
  p_stripe_payment_intent text,
  p_stripe_customer_id   text,
  p_user_id              uuid,
  p_cita_id              uuid,      -- nullable
  p_bono_config_id       uuid,      -- nullable
  p_importe_centimos     int,
  p_moneda               text,
  p_metodo               text,
  p_metadata             jsonb
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
as $$
declare
  v_existing_pago_id uuid;
  v_paciente_id      uuid;
  v_cita_ok          boolean := false;
  v_bono_id          uuid;
  v_pago_id          uuid;
begin
  -- 1. Idempotencia: ¿ya procesamos este evento?
  select id into v_existing_pago_id
    from public.pagos
   where stripe_event_id = p_stripe_event_id
   limit 1;

  if v_existing_pago_id is not null then
    return query select v_existing_pago_id, false, false, null::uuid, true;
    return;
  end if;

  -- 2. Obtener (o crear) paciente_id — nunca falla si el user existe en profiles
  v_paciente_id := public.ensure_paciente_para_pago(p_user_id);

  if v_paciente_id is null then
    raise exception 'paciente_not_found_ni_creado' using errcode = 'P0002';
  end if;

  -- 3. Insert pago (UNIQUE stripe_event_id nos protege de race)
  insert into public.pagos (
    paciente_id, cita_id, bono_id,
    stripe_event_id, stripe_session_id, stripe_payment_intent, stripe_customer_id,
    importe_centimos, moneda, estado, metodo, metadata,
    fecha_pago
  ) values (
    v_paciente_id, p_cita_id, null,
    p_stripe_event_id, p_stripe_session_id, p_stripe_payment_intent, p_stripe_customer_id,
    p_importe_centimos, coalesce(p_moneda, 'EUR'), 'completado',
    p_metodo, coalesce(p_metadata, '{}'::jsonb),
    now()
  )
  returning id into v_pago_id;

  -- 4a. Pago de cita: confirmar cita (solo si sigue en bloqueo_temporal)
  if p_cita_id is not null then
    update public.citas
       set estado = 'confirmada',
           updated_at = now()
     where id = p_cita_id
       and estado = 'bloqueo_temporal'
       and activo = true;
    v_cita_ok := found;
  end if;

  -- 4b. Pago de bono: crear bonos_pacientes
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

    -- Vincular pago ↔ bono
    if v_bono_id is not null then
      update public.pagos set bono_id = v_bono_id where id = v_pago_id;
    end if;
  end if;

  return query select v_pago_id, v_cita_ok, v_bono_id is not null, v_bono_id, false;
end $$;

revoke all on function public.procesar_pago_stripe(
  text, text, text, text, uuid, uuid, uuid, int, text, text, jsonb
) from public, anon, authenticated;
