-- ============================================================================
-- 0010_stripe.sql — Integración Stripe Checkout + webhook idempotente
-- ----------------------------------------------------------------------------
-- Arquitectura:
--   * Edge Function `stripe-checkout` crea la sesión Checkout (server-side).
--   * Edge Function `stripe-webhook` recibe eventos → verifica firma HMAC
--     → invoca RPC `procesar_pago_stripe` (SECURITY DEFINER, idempotente).
--   * Idempotencia vía pagos.stripe_event_id UNIQUE + tabla stripe_events.
--   * El webhook jamás modifica pagos directamente: sólo llama a la RPC.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Extender pagos con metadata Stripe adicional
-- ---------------------------------------------------------------------------
alter table public.pagos
  add column if not exists stripe_customer_id text,
  add column if not exists descripcion        text,
  add column if not exists metadata           jsonb not null default '{}'::jsonb,
  add column if not exists metodo             text; -- 'card', 'sepa_debit', etc.

create index if not exists pagos_stripe_customer_idx
  on public.pagos(stripe_customer_id)
  where stripe_customer_id is not null;

-- ---------------------------------------------------------------------------
-- 2. Catálogo de bonos a la venta (separado de bonos_pacientes)
-- ---------------------------------------------------------------------------
create table if not exists public.bonos_config (
  id                  uuid primary key default gen_random_uuid(),
  nombre              text not null,
  descripcion         text,
  servicio_id         uuid not null references public.servicios(id) on delete restrict,
  sesiones            int  not null check (sesiones between 2 and 50),
  precio_centimos     int  not null check (precio_centimos > 0),
  validez_dias        int,                 -- null = sin caducidad
  stripe_price_id     text unique,         -- opcional: si se gestiona desde Stripe
  destacado           boolean not null default false,
  activo              boolean not null default true,
  orden               smallint not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists bonos_config_activo_idx
  on public.bonos_config(activo, orden) where activo = true;

alter table public.bonos_config enable row level security;

drop policy if exists "read bonos_config public" on public.bonos_config;
create policy "read bonos_config public"
  on public.bonos_config for select
  using (activo = true or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));

drop policy if exists "admin writes bonos_config" on public.bonos_config;
create policy "admin writes bonos_config"
  on public.bonos_config for all
  using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));

-- ---------------------------------------------------------------------------
-- 3. Audit de eventos Stripe recibidos (raw payload, debug + forensics)
-- ---------------------------------------------------------------------------
create table if not exists public.stripe_events (
  id              text primary key,           -- evt_xxx de Stripe
  type            text not null,              -- 'checkout.session.completed', etc.
  api_version     text,
  livemode        boolean not null default false,
  payload         jsonb not null,
  received_at     timestamptz not null default now(),
  processed_at    timestamptz,
  processing_error text
);

create index if not exists stripe_events_type_idx on public.stripe_events(type);
create index if not exists stripe_events_received_idx on public.stripe_events(received_at desc);

alter table public.stripe_events enable row level security;

drop policy if exists "admin reads stripe_events" on public.stripe_events;
create policy "admin reads stripe_events"
  on public.stripe_events for select
  using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));

-- ---------------------------------------------------------------------------
-- 4. RPC SECURITY DEFINER: procesar pago Stripe
--    Contrato atómico — la Edge Function webhook llama esto con service_role.
--    Devuelve ids + flags para que el webhook dispare email correspondiente.
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
  pago_id        uuid,
  cita_confirmada boolean,
  bono_creado    boolean,
  bono_id        uuid,
  ya_procesado   boolean
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

  -- 2. Resolver paciente_id desde user_id
  select id into v_paciente_id
    from public.pacientes
   where user_id = p_user_id
   limit 1;

  if v_paciente_id is null then
    raise exception 'paciente_not_found' using errcode = 'P0002';
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

-- ---------------------------------------------------------------------------
-- 5. RPC SECURITY DEFINER: contexto de checkout (validar ownership + datos)
--    Se llama desde la Edge Function stripe-checkout ANTES de crear la sesión.
-- ---------------------------------------------------------------------------
create or replace function public.preparar_checkout_cita(
  p_cita_id uuid,
  p_user_id uuid
)
returns table (
  cita_id          uuid,
  inicio           timestamptz,
  servicio_nombre  text,
  importe_centimos int,
  email            citext,
  display_name     text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    c.id                as cita_id,
    c.inicio,
    s.nombre            as servicio_nombre,
    s.precio_centimos   as importe_centimos,
    pr.email,
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

create or replace function public.preparar_checkout_bono(
  p_bono_config_id uuid,
  p_user_id        uuid
)
returns table (
  bono_config_id    uuid,
  nombre            text,
  descripcion       text,
  sesiones          int,
  importe_centimos  int,
  email             citext,
  display_name      text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    bc.id                as bono_config_id,
    bc.nombre,
    bc.descripcion,
    bc.sesiones,
    bc.precio_centimos   as importe_centimos,
    pr.email,
    pr.display_name
  from public.bonos_config bc,
       public.profiles pr
  where bc.id = p_bono_config_id
    and bc.activo = true
    and pr.id = p_user_id
    and exists (select 1 from public.pacientes pa where pa.user_id = p_user_id);
$$;

revoke all on function public.preparar_checkout_bono(uuid, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. Seed mínimo de bonos (idempotente — solo si no hay filas)
-- ---------------------------------------------------------------------------
do $$
declare
  v_servicio_primera uuid;
  v_servicio_sigue   uuid;
begin
  select id into v_servicio_primera from public.servicios
   where lower(nombre) like '%primera%' and activo = true limit 1;
  select id into v_servicio_sigue from public.servicios
   where lower(nombre) like '%seguimiento%' and activo = true limit 1;

  if v_servicio_sigue is null then
    -- fallback: cualquier servicio de sesión estándar
    select id into v_servicio_sigue from public.servicios where activo = true limit 1;
  end if;

  if v_servicio_sigue is null then return; end if; -- no hay servicios aún

  insert into public.bonos_config (nombre, descripcion, servicio_id, sesiones, precio_centimos, validez_dias, destacado, orden)
  values
    ('Bono 5 sesiones',  'Ahorra un 10% en tus sesiones de seguimiento.',   v_servicio_sigue, 5,  27000, 180, false, 10),
    ('Bono 10 sesiones', 'Ahorra un 15% y compromete tu progreso.',          v_servicio_sigue, 10, 51000, 365, true,  20),
    ('Bono 3 sesiones',  'Para quien quiere probar el acompañamiento.',      v_servicio_sigue, 3,  16500, 120, false,  5)
  on conflict do nothing;
end $$;
