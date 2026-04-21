-- ============================================================================
-- 0001_init.sql — Esquema inicial Clínica Almudena Marchesi Fernández
-- ----------------------------------------------------------------------------
-- Arquitectura:
--   * Autenticación: auth.users (Supabase Auth) + public.profiles (1:1)
--   * Datos clínicos: public.pacientes (vinculado a profiles por user_id)
--   * Cifrado PII: columnas _encrypted gestionadas por Edge Function (pgsodium
--     deprecado; usamos pgcrypto + clave maestra custodiada por el backend)
--   * Auditoría: hash-chain en public.auditoria (SHA-256 concatenado)
--   * Timestamps: todos timestamptz, default now()
--   * IDs: uuid v4 server-side vía gen_random_uuid()
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. Extensiones
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto"     with schema extensions;
create extension if not exists "citext"       with schema extensions;
create extension if not exists "pg_trgm"      with schema extensions;
create extension if not exists "unaccent"     with schema extensions;

-- ---------------------------------------------------------------------------
-- 1. ENUMS fuertemente tipados (sustituyen String con magic values)
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('admin', 'paciente');

create type public.cita_estado as enum (
  'bloqueo_temporal',  -- pre-pago, reserva 15min
  'confirmada',         -- pago ok
  'completada',         -- sesión realizada
  'cancelada',
  'no_asistio'
);

create type public.pago_estado as enum (
  'pendiente',
  'procesando',
  'completado',
  'fallido',
  'reembolsado'
);

create type public.bono_estado as enum (
  'activo',
  'agotado',
  'expirado',
  'cancelado'
);

create type public.conversacion_estado as enum (
  'abierta',
  'archivada',
  'bloqueada'
);

create type public.recurso_tipo as enum (
  'pdf',
  'audio',
  'video',
  'imagen',
  'enlace',
  'otro'
);

create type public.recurso_categoria as enum (
  'tarea',
  'lectura',
  'ejercicio',
  'evaluacion',
  'recurso'
);

-- ---------------------------------------------------------------------------
-- 2. PROFILES — Perfil público vinculado 1:1 a auth.users
--    Se crea automáticamente vía trigger on_auth_user_created.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  role            public.user_role not null default 'paciente',
  display_name    text,
  email           citext not null,
  phone           text,
  avatar_url      text,

  -- Perfil profesional (solo admin)
  numero_colegiada text,

  -- Preferencias de seguridad
  intrusion_alerts_enabled boolean not null default true,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index profiles_role_idx on public.profiles(role);
create unique index profiles_email_uidx on public.profiles(email);

-- ---------------------------------------------------------------------------
-- 3. PACIENTES — Ficha clínica (PII cifrado application-layer)
-- ---------------------------------------------------------------------------
create table public.pacientes (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid unique references public.profiles(id) on delete set null,

  -- PII cifrado (AES-256-GCM en backend). Los _bidx son SHA-256(HMAC(valor, key))
  -- para búsquedas exactas sin exponer plaintext.
  dni_nie_ciphertext        text        not null,
  dni_nie_bidx              text        not null unique,

  nombre_completo_ciphertext text       not null,
  nombre_completo_bidx      text        not null,

  telefono_ciphertext       text,
  telefono_bidx             text,

  -- Datos no sensibles indexables
  fecha_nacimiento          date,
  fecha_alta                date        not null default current_date,

  -- Textos libres cifrados
  motivo_consulta_inicial_ciphertext text,
  experiencia_terapia       text,
  motivo_consulta_ciphertext text,

  -- RGPD
  consentimiento_rgpd       boolean     not null default false,
  firma_rgpd_storage_path   text,  -- path dentro del bucket firmas-rgpd

  activo                    boolean     not null default true,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index pacientes_user_id_idx        on public.pacientes(user_id);
create index pacientes_nombre_bidx_idx    on public.pacientes(nombre_completo_bidx);
create index pacientes_telefono_bidx_idx  on public.pacientes(telefono_bidx);
create index pacientes_activo_idx         on public.pacientes(activo) where activo = true;

-- ---------------------------------------------------------------------------
-- 4. SERVICIOS
-- ---------------------------------------------------------------------------
create table public.servicios (
  id                 uuid primary key default gen_random_uuid(),
  nombre             text        not null,
  descripcion        text,
  duracion_minutos   int         not null check (duracion_minutos between 15 and 240),
  precio_centimos    int         not null check (precio_centimos >= 0),
  activo             boolean     not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index servicios_activo_idx on public.servicios(activo) where activo = true;

-- ---------------------------------------------------------------------------
-- 5. CITAS — Con protección anti-solape vía exclusion constraint
-- ---------------------------------------------------------------------------
create table public.citas (
  id             uuid primary key default gen_random_uuid(),
  paciente_id    uuid not null references public.pacientes(id) on delete restrict,
  servicio_id    uuid not null references public.servicios(id) on delete restrict,
  inicio         timestamptz not null,
  fin            timestamptz not null,
  estado         public.cita_estado not null default 'bloqueo_temporal',
  notas_admin    text,  -- notas operativas (no clínicas)
  activo         boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint citas_rango_valido check (fin > inicio),
  constraint citas_rango_razonable check (fin - inicio <= interval '4 hours')
);

create index citas_paciente_idx  on public.citas(paciente_id);
create index citas_servicio_idx  on public.citas(servicio_id);
create index citas_inicio_idx    on public.citas(inicio);
create index citas_estado_idx    on public.citas(estado);
create index citas_rango_idx     on public.citas using gist (tstzrange(inicio, fin));

-- Anti-solape: citas activas NO pueden solaparse en el tiempo
create extension if not exists "btree_gist" with schema extensions;
alter table public.citas
  add constraint citas_no_solape
  exclude using gist (
    tstzrange(inicio, fin) with &&
  ) where (activo = true and estado in ('bloqueo_temporal', 'confirmada', 'completada'));

-- ---------------------------------------------------------------------------
-- 6. AGENDA — Bloqueos (vacaciones, huecos no disponibles) y notas de día
-- ---------------------------------------------------------------------------
create table public.agenda_bloqueos (
  id          uuid primary key default gen_random_uuid(),
  inicio      timestamptz not null,
  fin         timestamptz not null,
  motivo      text,
  activo      boolean     not null default true,
  created_at  timestamptz not null default now(),
  constraint agenda_bloqueos_rango check (fin > inicio)
);

create index agenda_bloqueos_rango_idx on public.agenda_bloqueos using gist (tstzrange(inicio, fin))
  where activo = true;

create table public.agenda_notas_dia (
  id              uuid primary key default gen_random_uuid(),
  dia             date not null unique,
  nota_ciphertext text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 7. HISTORIAL DE SESIONES (notas clínicas — ALTA SENSIBILIDAD)
-- ---------------------------------------------------------------------------
create table public.historial_sesiones (
  id                         uuid primary key default gen_random_uuid(),
  paciente_id                uuid not null references public.pacientes(id) on delete restrict,
  cita_id                    uuid unique references public.citas(id) on delete set null,
  notas_clinicas_ciphertext  text,
  tareas_asignadas_ciphertext text,
  estado_emocional           text,
  fecha_registro             timestamptz not null default now(),
  activo                     boolean not null default true,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);

create index historial_paciente_idx on public.historial_sesiones(paciente_id);

-- ---------------------------------------------------------------------------
-- 8. BONOS PACIENTES
-- ---------------------------------------------------------------------------
create table public.bonos_pacientes (
  id                  uuid primary key default gen_random_uuid(),
  paciente_id         uuid not null references public.pacientes(id) on delete restrict,
  servicio_id         uuid not null references public.servicios(id) on delete restrict,
  sesiones_totales    int  not null check (sesiones_totales > 0),
  sesiones_consumidas int  not null default 0 check (sesiones_consumidas >= 0),
  estado              public.bono_estado not null default 'activo',
  fecha_compra        timestamptz not null default now(),
  fecha_expiracion    date,
  activo              boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint bonos_consumo_valido check (sesiones_consumidas <= sesiones_totales)
);

create index bonos_paciente_idx on public.bonos_pacientes(paciente_id);
create index bonos_estado_idx   on public.bonos_pacientes(estado);

-- ---------------------------------------------------------------------------
-- 9. PAGOS (Stripe)
-- ---------------------------------------------------------------------------
create table public.pagos (
  id                 uuid primary key default gen_random_uuid(),
  paciente_id        uuid not null references public.pacientes(id) on delete restrict,
  cita_id            uuid references public.citas(id) on delete set null,
  bono_id            uuid references public.bonos_pacientes(id) on delete set null,

  stripe_event_id    text unique,
  stripe_session_id  text unique,
  stripe_payment_intent text unique,

  importe_centimos   int not null check (importe_centimos > 0),
  moneda             text not null default 'EUR',
  estado             public.pago_estado not null default 'pendiente',

  fecha_pago         timestamptz not null default now(),
  activo             boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index pagos_paciente_idx on public.pagos(paciente_id);
create index pagos_estado_idx   on public.pagos(estado);
create index pagos_fecha_idx    on public.pagos(fecha_pago desc);

-- ---------------------------------------------------------------------------
-- 10. FACTURACIÓN — Nota administrativa (única fila global)
-- ---------------------------------------------------------------------------
create table public.facturacion_nota (
  id                 smallint primary key default 1 check (id = 1), -- singleton
  nota               text not null default '',
  updated_by         uuid references public.profiles(id) on delete set null,
  updated_at         timestamptz not null default now()
);

insert into public.facturacion_nota (id, nota) values (1, '') on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 11. AUDITORÍA — Hash-chain tamper-evident
-- ---------------------------------------------------------------------------
create table public.auditoria (
  id               uuid primary key default gen_random_uuid(),
  usuario_id       uuid references public.profiles(id) on delete set null,
  accion           text not null,
  tabla_afectada   text,
  registro_id      text,
  detalles         jsonb not null default '{}'::jsonb,
  hash_previo      text,       -- hash del registro anterior
  hash_integridad  text not null, -- SHA-256(hash_previo || usuario_id || accion || timestamp || detalles)
  created_at       timestamptz not null default now()
);

create index auditoria_usuario_idx   on public.auditoria(usuario_id);
create index auditoria_tabla_idx     on public.auditoria(tabla_afectada);
create index auditoria_created_idx   on public.auditoria(created_at desc);

-- ---------------------------------------------------------------------------
-- 12. RECURSOS + ASIGNACIONES
-- ---------------------------------------------------------------------------
create table public.recursos (
  id                 uuid primary key default gen_random_uuid(),
  titulo             text not null,
  descripcion        text,
  tipo               public.recurso_tipo not null default 'otro',
  categoria          public.recurso_categoria not null default 'recurso',

  storage_path       text,      -- bucket 'recursos/<uuid>/<filename>'
  external_url       text,      -- enlaces externos
  original_filename  text,
  mime_type          text,
  size_bytes         bigint,

  created_by         uuid references public.profiles(id) on delete set null,
  activo             boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  constraint recursos_path_o_url check (
    (storage_path is not null and external_url is null) or
    (storage_path is null and external_url is not null)
  )
);

create index recursos_categoria_idx on public.recursos(categoria);
create index recursos_activo_idx on public.recursos(activo) where activo = true;

create table public.recurso_asignaciones (
  id               uuid primary key default gen_random_uuid(),
  recurso_id       uuid not null references public.recursos(id) on delete cascade,
  paciente_id      uuid not null references public.pacientes(id) on delete cascade,
  assigned_by      uuid references public.profiles(id) on delete set null,
  assigned_at      timestamptz not null default now(),
  completed_at     timestamptz,
  activo           boolean not null default true,

  unique (recurso_id, paciente_id)
);

create index recurso_asig_paciente_idx on public.recurso_asignaciones(paciente_id);
create index recurso_asig_recurso_idx  on public.recurso_asignaciones(recurso_id);

-- ---------------------------------------------------------------------------
-- 13. CHAT (cifrado a nivel aplicación — libAgeEncrypt server side)
-- ---------------------------------------------------------------------------
create table public.conversaciones (
  id               uuid primary key default gen_random_uuid(),
  paciente_id      uuid not null references public.pacientes(id) on delete cascade,

  last_message_at  timestamptz,
  estado           public.conversacion_estado not null default 'abierta',
  unread_admin     int not null default 0,
  unread_paciente  int not null default 0,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  unique (paciente_id)  -- 1 conversación por paciente
);

create index conversaciones_last_idx on public.conversaciones(last_message_at desc nulls last);

create table public.mensajes (
  id                 uuid primary key default gen_random_uuid(),
  conversation_id    uuid not null references public.conversaciones(id) on delete cascade,
  sender_user_id     uuid not null references public.profiles(id) on delete restrict,
  body_ciphertext    text not null,
  encryption_version text not null default 'v1',
  read_at            timestamptz,
  created_at         timestamptz not null default now()
);

create index mensajes_conv_idx   on public.mensajes(conversation_id, created_at desc);
create index mensajes_sender_idx on public.mensajes(sender_user_id);

-- ---------------------------------------------------------------------------
-- 14. TRIGGERS: updated_at automático
-- ---------------------------------------------------------------------------
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'pacientes', 'servicios', 'citas', 'agenda_notas_dia',
    'historial_sesiones', 'bonos_pacientes', 'pagos', 'recursos',
    'conversaciones'
  ] loop
    execute format(
      'create trigger tg_%I_updated before update on public.%I
       for each row execute function public.tg_set_updated_at()',
      t, t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 15. TRIGGER: crear profile automáticamente al crear auth.user
-- ---------------------------------------------------------------------------
create or replace function public.tg_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role, display_name)
  values (
    new.id,
    new.email,
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'paciente'),
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.tg_handle_new_user();

-- ---------------------------------------------------------------------------
-- 16. FUNCIÓN HELPER: ¿el JWT actual es admin?
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.current_paciente_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.pacientes where user_id = auth.uid() limit 1;
$$;

-- ---------------------------------------------------------------------------
-- 17. VISTAS SEGURAS PARA FRONTEND
-- ---------------------------------------------------------------------------

-- Vista: Citas con datos expandidos (para calendarios realtime)
create or replace view public.v_citas_expandidas as
  select
    c.id,
    c.paciente_id,
    c.servicio_id,
    c.inicio,
    c.fin,
    c.estado,
    s.nombre    as servicio_nombre,
    s.duracion_minutos,
    s.precio_centimos,
    p.user_id   as paciente_user_id,
    c.created_at,
    c.updated_at
  from public.citas c
  join public.servicios s on s.id = c.servicio_id
  join public.pacientes p on p.id = c.paciente_id
  where c.activo = true;

-- RLS sobre vistas se hereda del owner; configuramos abajo con barrier
alter view public.v_citas_expandidas set (security_invoker = true);
