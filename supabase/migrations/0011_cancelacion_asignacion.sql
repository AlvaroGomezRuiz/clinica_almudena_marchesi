-- ============================================================================
-- 0011_cancelacion_asignacion.sql
-- ----------------------------------------------------------------------------
-- Introduce:
--   1. RPC `cancelar_cita`        — paciente (>24h sin cargo) / admin (override)
--      * Restaura sesión al bono si la reserva lo consumió.
--      * Devuelve payment_intent + importe para que la Edge Fn haga refund.
--   2. RPC `asignar_recurso_admin`— idempotente, solo admin, devuelve datos
--      para disparar email `nueva_asignacion`.
--   3. Tabla `email_webhook_events` para tracking Resend (bounces/complaints).
--   4. Columna emails_log.provider_id indexada + extensión para opt-out auto.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. Helpers idempotentes
-- ---------------------------------------------------------------------------
create index if not exists emails_log_provider_idx
  on public.emails_log(provider_id)
  where provider_id is not null;

-- Metadata para cancelaciones en pagos (motivo, refund_id)
alter table public.pagos
  add column if not exists cancelacion_motivo text,
  add column if not exists refund_id          text,
  add column if not exists refunded_amount    int;

-- Metadata en citas: quién y por qué canceló
alter table public.citas
  add column if not exists cancelacion_motivo   text,
  add column if not exists cancelacion_by       uuid references public.profiles(id) on delete set null,
  add column if not exists cancelacion_en       timestamptz;

-- ---------------------------------------------------------------------------
-- 1. RPC cancelar_cita
--    Reglas de negocio:
--      * Admin: puede cancelar SIEMPRE (override), refund total.
--      * Paciente: solo su propia cita, SOLO si inicio > now() + 24h.
--                  Si la cita consumió bono → restaura sesión.
--                  Si hubo pago Stripe completado → signal refund total.
--      * La cita pasa a estado 'cancelada', activo=false (libera slot gist).
--    Devuelve:
--      * ok                        — true si ejecutó
--      * needs_stripe_refund       — la Edge Fn debe llamar POST /v1/refunds
--      * stripe_payment_intent     — para API call
--      * refund_amount_centimos    — importe a reembolsar
--      * pago_id                   — para actualizar fila tras refund OK
--      * bono_restaurado           — true si devolvió sesión al bono
--      * email_inicio              — ISO de la cita original (para mail)
--      * email_servicio            — nombre servicio (para mail)
--      * email_to_user_id          — destinatario del email
--      * email_display_name        — nombre para email
-- ---------------------------------------------------------------------------
create or replace function public.cancelar_cita(
  p_cita_id uuid,
  p_motivo  text default null,
  p_force   boolean default false  -- admin puede forzar; ignorar ventana 24h
)
returns table (
  ok                        boolean,
  needs_stripe_refund       boolean,
  stripe_payment_intent     text,
  refund_amount_centimos    int,
  pago_id                   uuid,
  bono_restaurado           boolean,
  email_inicio              timestamptz,
  email_servicio            text,
  email_to_user_id          uuid,
  email_display_name        text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid              uuid := auth.uid();
  v_is_admin         boolean;
  v_cita             public.citas%rowtype;
  v_paciente         public.pacientes%rowtype;
  v_profile_id       uuid;
  v_servicio_nombre  text;
  v_bono_id          uuid;
  v_pago             public.pagos%rowtype;
  v_refund_flag      boolean := false;
  v_refund_amount    int     := null;
  v_refund_intent    text    := null;
  v_bono_restored    boolean := false;
  v_within_24h       boolean;
  v_display_name     text;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select (role = 'admin') into v_is_admin
    from public.profiles where id = v_uid;

  select * into v_cita from public.citas where id = p_cita_id for update;
  if not found then
    raise exception 'cita_not_found' using errcode = 'P0002';
  end if;

  if v_cita.activo = false or v_cita.estado = 'cancelada' then
    raise exception 'cita_already_cancelled' using errcode = 'P0004';
  end if;

  select * into v_paciente from public.pacientes where id = v_cita.paciente_id;
  select nombre into v_servicio_nombre from public.servicios where id = v_cita.servicio_id;

  v_profile_id := v_paciente.user_id;
  select display_name into v_display_name from public.profiles where id = v_profile_id;

  -- Ownership check: paciente solo su propia cita
  if not v_is_admin then
    if v_paciente.user_id is null or v_paciente.user_id <> v_uid then
      raise exception 'forbidden' using errcode = '42501';
    end if;

    -- Ventana 24h (no aplica si admin o p_force)
    v_within_24h := (v_cita.inicio <= now() + interval '24 hours');
    if v_within_24h and not p_force then
      -- El paciente puede cancelar pero SIN reembolso Stripe y SIN devolver bono.
      -- No levantamos excepción — devolvemos flags para que el front lo advierta.
      null;
    end if;
  else
    v_within_24h := false;  -- admin siempre tiene derecho a refund
  end if;

  -- ---------------------------------------------------------------------
  -- Restaurar bono si la cita lo consumió
  -- Heurística: existe bono_paciente del paciente con mismo servicio y
  -- fecha_compra anterior a la cita, y sesiones_consumidas > 0.
  -- Mejor práctica futura: tabla explícita consumos_bonos(cita_id, bono_id).
  -- Por ahora: solo restauramos si la cita NO tiene pago Stripe asociado
  -- (porque si lo tiene, fue pago directo, no bono).
  -- ---------------------------------------------------------------------
  select * into v_pago from public.pagos
    where cita_id = p_cita_id and estado = 'completado' and activo = true
    order by fecha_pago desc limit 1;

  if not found then
    -- Sin pago Stripe → probablemente consumió bono
    if v_is_admin or not v_within_24h then
      select bp.id into v_bono_id
        from public.bonos_pacientes bp
       where bp.paciente_id = v_cita.paciente_id
         and bp.servicio_id = v_cita.servicio_id
         and bp.sesiones_consumidas > 0
         and bp.activo = true
       order by bp.fecha_compra desc
       limit 1;

      if v_bono_id is not null then
        update public.bonos_pacientes
           set sesiones_consumidas = sesiones_consumidas - 1,
               estado = case
                 when estado = 'agotado' and sesiones_consumidas - 1 < sesiones_totales then 'activo'
                 else estado
               end
         where id = v_bono_id;
        v_bono_restored := true;
      end if;
    end if;
  else
    -- Con pago Stripe completado → signal refund SOLO si admin o >24h
    if (v_is_admin or not v_within_24h) and v_pago.stripe_payment_intent is not null then
      v_refund_flag   := true;
      v_refund_amount := v_pago.importe_centimos;
      v_refund_intent := v_pago.stripe_payment_intent;
    end if;
  end if;

  -- ---------------------------------------------------------------------
  -- Actualizar cita: cancelada + activo=false libera la exclusion gist
  -- ---------------------------------------------------------------------
  update public.citas
     set estado              = 'cancelada',
         activo              = false,
         cancelacion_motivo  = p_motivo,
         cancelacion_by      = v_uid,
         cancelacion_en      = now(),
         updated_at          = now()
   where id = p_cita_id;

  return query select
    true,
    v_refund_flag,
    v_refund_intent,
    v_refund_amount,
    v_pago.id,
    v_bono_restored,
    v_cita.inicio,
    v_servicio_nombre,
    v_profile_id,
    v_display_name;
end $$;

revoke all on function public.cancelar_cita(uuid, text, boolean) from public, anon;
grant execute on function public.cancelar_cita(uuid, text, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. RPC asignar_recurso_admin
--    Solo admin. Idempotente (UNIQUE recurso_id, paciente_id).
--    Devuelve user_id del paciente + metadata del recurso para email.
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
as $$
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
    select display_name into v_display from public.profiles where id = v_user_id;
  end if;

  select id into v_existing
    from public.recurso_asignaciones
   where recurso_id = p_recurso_id and paciente_id = p_paciente_id;

  if v_existing is not null then
    -- Si estaba desactivada, la reactivamos sin tocar assigned_at
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
end $$;

revoke all on function public.asignar_recurso_admin(uuid, uuid) from public, anon;
grant execute on function public.asignar_recurso_admin(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Tabla raw event log de Resend webhooks (bounces, complaints, deliveries)
-- ---------------------------------------------------------------------------
create table if not exists public.email_webhook_events (
  id            uuid primary key default gen_random_uuid(),
  provider      text not null default 'resend',
  provider_event_id text unique, -- id de Resend (svix-id)
  event_type    text not null,   -- 'email.bounced', 'email.complained', ...
  provider_message_id text,      -- liga con emails_log.provider_id
  payload       jsonb not null,
  received_at   timestamptz not null default now(),
  processed_at  timestamptz
);

create index if not exists email_webhook_events_type_idx  on public.email_webhook_events(event_type);
create index if not exists email_webhook_events_msg_idx   on public.email_webhook_events(provider_message_id)
  where provider_message_id is not null;

alter table public.email_webhook_events enable row level security;

drop policy if exists "admin reads email_webhook_events" on public.email_webhook_events;
create policy "admin reads email_webhook_events"
  on public.email_webhook_events for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ---------------------------------------------------------------------------
-- 4. RPC: marca opt-out automático tras bounce permanente / complaint
--    Lookup: provider_message_id → emails_log.provider_id → to_user_id + email_type
--    Toggle off la columna correspondiente en notificaciones_prefs.
-- ---------------------------------------------------------------------------
create or replace function public.aplicar_email_webhook(
  p_event_type         text,
  p_provider_msg_id    text
)
returns table (
  affected_user_id  uuid,
  affected_type     text,
  action_taken      text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_log       public.emails_log%rowtype;
  v_col       text;
  v_action    text := 'none';
begin
  if p_provider_msg_id is null then
    return;
  end if;

  select * into v_log
    from public.emails_log
   where provider_id = p_provider_msg_id
   order by created_at desc
   limit 1;

  if not found or v_log.to_user_id is null then
    return;
  end if;

  -- Solo accionamos en eventos hard (bounce permanente + complaint)
  if p_event_type in ('email.bounced', 'email.complained') then
    v_col := v_log.email_type::text;

    -- Toggle off preferencia correspondiente (idempotente)
    execute format(
      'update public.notificaciones_prefs
          set %I = false, updated_at = now()
        where user_id = $1',
      v_col
    ) using v_log.to_user_id;

    v_action := case p_event_type
      when 'email.bounced'     then 'opt_out_bounce'
      when 'email.complained'  then 'opt_out_complaint'
      else 'none'
    end;
  end if;

  return query select v_log.to_user_id, v_log.email_type::text, v_action;
end $$;

revoke all on function public.aplicar_email_webhook(text, text) from public, anon, authenticated;
-- Se invoca SOLO desde la Edge Function con service_role.
