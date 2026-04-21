-- ============================================================================
-- 0009_email.sql — Infraestructura de emails transaccionales (Resend)
-- ----------------------------------------------------------------------------
-- Arquitectura:
--   * Edge Function `send-email` (Deno) habla con Resend API.
--   * Tabla `emails_log` con UNIQUE(email_type, cita_id, dia) para dedupe.
--   * pg_cron dispara hourly `cron-recordatorios-24h` vía pg_net → Edge Fn.
--   * Secretos (RESEND_API_KEY, SERVICE_ROLE) vivien SOLO en Edge Function env.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. Extensiones necesarias
-- ---------------------------------------------------------------------------
create extension if not exists "pg_net"   with schema extensions;
create extension if not exists "pg_cron"  with schema extensions;

-- ---------------------------------------------------------------------------
-- 1. Enum de tipos de email
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.email_type as enum (
    'welcome',              -- bienvenida al dar de alta
    'booking_confirmed',    -- confirmación de reserva (inmediato post-reserva)
    'booking_cancelled',    -- cancelación de reserva
    'reminder_24h',         -- recordatorio 24h antes (cron horario)
    'password_reset',       -- reset de contraseña (custom, complementa Supabase Auth)
    'nueva_asignacion'      -- recurso/tarea asignado por la clínica
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.email_status as enum (
    'pending',
    'sent',
    'failed',
    'skipped'               -- paciente sin email, o desactivó notificaciones
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- 2. Preferencias de notificaciones por paciente (opt-out granular)
-- ---------------------------------------------------------------------------
create table if not exists public.notificaciones_prefs (
  user_id           uuid primary key references auth.users(id) on delete cascade,
  welcome           boolean not null default true,
  booking_confirmed boolean not null default true,
  booking_cancelled boolean not null default true,
  reminder_24h      boolean not null default true,
  nueva_asignacion  boolean not null default true,
  updated_at        timestamptz not null default now()
);

alter table public.notificaciones_prefs enable row level security;

drop policy if exists "user reads own email prefs" on public.notificaciones_prefs;
create policy "user reads own email prefs"
  on public.notificaciones_prefs for select
  using (auth.uid() = user_id);

drop policy if exists "user updates own email prefs" on public.notificaciones_prefs;
create policy "user updates own email prefs"
  on public.notificaciones_prefs for update
  using (auth.uid() = user_id);

drop policy if exists "admin full email prefs" on public.notificaciones_prefs;
create policy "admin full email prefs"
  on public.notificaciones_prefs for all
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Al crear un profile paciente, inicializamos sus preferencias
create or replace function public.on_profile_created_init_prefs()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notificaciones_prefs (user_id) values (new.id)
    on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists trg_profile_init_prefs on public.profiles;
create trigger trg_profile_init_prefs
  after insert on public.profiles
  for each row execute function public.on_profile_created_init_prefs();

-- ---------------------------------------------------------------------------
-- 3. Log de emails enviados (audit + dedupe)
-- ---------------------------------------------------------------------------
create table if not exists public.emails_log (
  id               uuid primary key default gen_random_uuid(),
  email_type       public.email_type not null,
  to_email         citext not null,
  to_user_id       uuid references auth.users(id) on delete set null,

  -- Contextos para dedupe (uno será NULL según el tipo)
  cita_id          uuid references public.citas(id) on delete set null,
  bono_id          uuid references public.bonos_pacientes(id) on delete set null,
  pago_id          uuid references public.pagos(id) on delete set null,

  -- Ventana de dedupe (día local Europe/Madrid)
  -- Se rellena vía trigger BEFORE INSERT porque now() no es IMMUTABLE y
  -- Postgres no permite expresiones volátiles en GENERATED columns.
  dedupe_key       text,

  status           public.email_status not null default 'pending',
  provider_id      text,        -- Resend message id
  error_message    text,
  attempts         smallint not null default 0,

  sent_at          timestamptz,
  created_at       timestamptz not null default now()
);

-- Dedupe por tipo + destinatario/cita + día calendario
-- Trigger BEFORE INSERT que rellena dedupe_key con la fecha de Europe/Madrid
create or replace function public.emails_log_set_dedupe_key()
returns trigger
language plpgsql
as $$
begin
  if new.dedupe_key is null then
    new.dedupe_key :=
      (new.email_type::text) || ':' ||
      coalesce(new.cita_id::text, new.to_user_id::text, new.to_email::text) ||
      ':' ||
      to_char((now() at time zone 'Europe/Madrid')::date, 'YYYY-MM-DD');
  end if;
  return new;
end $$;

drop trigger if exists trg_emails_log_dedupe on public.emails_log;
create trigger trg_emails_log_dedupe
  before insert on public.emails_log
  for each row execute function public.emails_log_set_dedupe_key();

create unique index if not exists emails_log_dedupe_uidx
  on public.emails_log(dedupe_key)
  where status in ('sent', 'pending');

create index if not exists emails_log_created_idx on public.emails_log(created_at desc);
create index if not exists emails_log_to_user_idx on public.emails_log(to_user_id);

alter table public.emails_log enable row level security;

drop policy if exists "admin read emails log" on public.emails_log;
create policy "admin read emails log"
  on public.emails_log for select
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ---------------------------------------------------------------------------
-- 4. Helper privado: leer secret app.settings del proyecto
--    Los secretos los inyecta la Edge Function vía ENV; aquí solo referenciamos
--    la URL base del proyecto para que pg_cron sepa a qué endpoint llamar.
-- ---------------------------------------------------------------------------
-- El admin debe definir estos settings UNA VEZ en el panel:
--   alter database postgres set "app.settings.project_url"   = 'https://<ref>.supabase.co';
--   alter database postgres set "app.settings.cron_secret"   = '<random 32+ chars>';
-- El cron_secret se valida en la Edge Function para evitar invocación externa.

-- ---------------------------------------------------------------------------
-- 5. RPC privado: citas elegibles para recordatorio 24h
--    Devuelve citas confirmadas cuya fecha inicio cae en [now()+23h, now()+25h]
--    y que aún no tienen reminder_24h enviado (ni pendiente) para esa cita.
-- ---------------------------------------------------------------------------
create or replace function public.citas_pendientes_recordatorio_24h()
returns table (
  cita_id       uuid,
  paciente_id   uuid,
  user_id       uuid,
  email         citext,
  display_name  text,
  servicio      text,
  inicio        timestamptz,
  duracion_min  int
)
language sql
security definer
set search_path = public
stable
as $$
  select
    c.id            as cita_id,
    c.paciente_id,
    pr.id           as user_id,
    pr.email,
    pr.display_name,
    s.nombre        as servicio,
    c.inicio,
    s.duracion_minutos as duracion_min
  from public.citas c
  join public.pacientes pa on pa.id = c.paciente_id
  join public.profiles  pr on pr.id = pa.user_id
  join public.servicios s  on s.id = c.servicio_id
  left join public.notificaciones_prefs np on np.user_id = pr.id
  where c.activo = true
    and c.estado = 'confirmada'
    and c.inicio between (now() + interval '23 hours') and (now() + interval '25 hours')
    and coalesce(np.reminder_24h, true) = true
    and not exists (
      select 1 from public.emails_log el
       where el.cita_id = c.id
         and el.email_type = 'reminder_24h'
         and el.status in ('sent', 'pending')
    );
$$;

revoke all on function public.citas_pendientes_recordatorio_24h() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. Job pg_cron: invoca Edge Function cada hora en minuto 5
-- ---------------------------------------------------------------------------
-- NOTA: El cron job se crea en un `do` block para poder leer settings en tiempo
--       de ejecución. Si los settings aún no están definidos, el schedule se
--       omite silenciosamente y debe reagendarse tras configurar los settings
--       (comando documentado en README).
do $$
declare
  v_url text := current_setting('app.settings.project_url', true);
  v_sec text := current_setting('app.settings.cron_secret', true);
begin
  if v_url is null or v_sec is null or length(v_url) = 0 or length(v_sec) = 0 then
    raise notice 'app.settings.project_url / app.settings.cron_secret no definidos — skip schedule cron reminder';
    return;
  end if;

  -- Desprograma si ya existía
  perform cron.unschedule(jobid)
    from cron.job where jobname = 'recordatorios_24h_hourly';

  perform cron.schedule(
    'recordatorios_24h_hourly',
    '5 * * * *',
    format($cron$
      select net.http_post(
        url := %L,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || %L
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 25000
      );
    $cron$, v_url || '/functions/v1/cron-recordatorios-24h', v_sec)
  );
end $$;

-- ---------------------------------------------------------------------------
-- 7. Trigger: registro de intent de email tras reserva de cita
--    Marcamos una fila `pending` en emails_log; la Edge Function `send-email`
--    será quien la convierta en `sent`/`failed`. Esto evita race-conditions
--    entre trigger y llamadas paralelas.
-- ---------------------------------------------------------------------------
-- (Diferido a fase posterior: por ahora el frontend invoca la Edge Function
--  directamente tras un reservar_cita exitoso, lo que es más simple y permite
--  mostrar feedback inmediato al usuario en caso de fallo de Resend.)
