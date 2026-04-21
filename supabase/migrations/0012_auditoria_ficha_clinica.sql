-- =============================================================================
-- 0012_auditoria_ficha_clinica.sql
--
-- OBJETIVO
--   Reforzar el modelo clínico (ficha del paciente) y añadir auditoría fina
--   de accesos a campos sensibles desde el panel admin (RGPD art. 30).
--
--   El cifrado real sigue siendo application-layer (AES-256-GCM, llave en
--   Supabase Vault custodiada por el backend). pgcrypto queda disponible
--   para futuras necesidades server-side (por ejemplo exportes firmados).
--
--   Esta migración es aditiva: no destruye ni transforma datos existentes.
--
-- CONTENIDO
--   1. Columnas adicionales en public.pacientes (direccion, contacto de
--      emergencia, alergias, medicacion base, preferencias clínicas, avatar).
--   2. Tabla public.paciente_diagnosticos (lista editable desde admin).
--   3. Tabla public.paciente_medicacion (medicación crónica / puntual).
--   4. Tabla public.paciente_adjuntos (PDFs, informes externos).
--   5. Tabla public.admin_lookups (auditoría de "desvelo" de campo sensible).
--   6. RPC public.registrar_consulta_sensible(paciente, campo, justificacion).
--   7. Vista public.v_pacientes_resumen_admin con flags booleanos de
--      presencia (has_dni, has_telefono, has_direccion, …) sin exponer
--      ciphertext al cliente hasta que se pulse el "ojo".
--   8. Políticas RLS para todas las tablas nuevas.
-- =============================================================================

begin;

-- =============================================================================
-- 1. Extender public.pacientes con campos clínicos + avatar
-- =============================================================================

alter table public.pacientes
  add column if not exists direccion_ciphertext        text,
  add column if not exists email_ciphertext            text,
  add column if not exists email_bidx                  text,
  add column if not exists contacto_emergencia_nombre_ciphertext  text,
  add column if not exists contacto_emergencia_telefono_ciphertext text,
  add column if not exists alergias_ciphertext         text,
  add column if not exists medicacion_base_ciphertext  text,
  add column if not exists objetivos_ciphertext        text,
  add column if not exists preferencias_clinicas_ciphertext text,
  add column if not exists avatar_url                  text,
  add column if not exists color_etiqueta              text,     -- color editorial (#hex) para tarjetas
  add column if not exists tags                        text[]    not null default array[]::text[];

create index if not exists pacientes_email_bidx_idx on public.pacientes(email_bidx);
create index if not exists pacientes_tags_gin_idx   on public.pacientes using gin (tags);

-- =============================================================================
-- 2. Diagnósticos asociados al paciente
--
--    Sigue el catálogo CIE-10/CIE-11 opcional; `titulo` es el texto libre
--    cifrado porque muchos diagnósticos son tentativos y sensibles.
-- =============================================================================

create table if not exists public.paciente_diagnosticos (
  id                uuid primary key default gen_random_uuid(),
  paciente_id       uuid not null references public.pacientes(id) on delete cascade,
  cie_code          text,                                -- opcional (CIE-10/11)
  titulo_ciphertext text not null,                       -- nombre clínico cifrado
  notas_ciphertext  text,                                -- notas del diagnóstico
  severidad         text check (severidad in ('leve','moderado','severo')),
  estado            text not null default 'activo'
                      check (estado in ('activo','remision','resuelto','descartado')),
  fecha_inicio      date not null default current_date,
  fecha_fin         date,
  activo            boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint paciente_diagnosticos_rango check (fecha_fin is null or fecha_fin >= fecha_inicio)
);

create index if not exists paciente_diagnosticos_paciente_idx
  on public.paciente_diagnosticos(paciente_id) where activo = true;

-- =============================================================================
-- 3. Medicación asociada al paciente
--
--    Los campos `nombre` y `dosis` quedan en claro porque el admin necesita
--    búsquedas rápidas (ej. interacciones). Las notas clínicas son cifradas.
-- =============================================================================

create table if not exists public.paciente_medicacion (
  id             uuid primary key default gen_random_uuid(),
  paciente_id    uuid not null references public.pacientes(id) on delete cascade,
  nombre         text not null,
  dosis          text,
  frecuencia     text,
  via            text,                                   -- oral, sublingual, …
  prescrita_por  text,
  fecha_inicio   date not null default current_date,
  fecha_fin      date,
  notas_ciphertext text,
  activo         boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint paciente_medicacion_rango check (fecha_fin is null or fecha_fin >= fecha_inicio)
);

create index if not exists paciente_medicacion_paciente_idx
  on public.paciente_medicacion(paciente_id) where activo = true;

-- =============================================================================
-- 4. Adjuntos de ficha clínica (informes externos, pruebas, etc.)
-- =============================================================================

create table if not exists public.paciente_adjuntos (
  id             uuid primary key default gen_random_uuid(),
  paciente_id    uuid not null references public.pacientes(id) on delete cascade,
  storage_path   text not null,                          -- bucket paciente-adjuntos
  nombre         text not null,
  mime           text,
  size_bytes     bigint,
  descripcion    text,
  subido_por     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now()
);

create index if not exists paciente_adjuntos_paciente_idx on public.paciente_adjuntos(paciente_id);

-- =============================================================================
-- 5. Auditoría de "desvelo" de campos sensibles (tocar el ojo en el panel)
--
--    Cada vez que Almudena pulsa el ojo para ver el DNI, teléfono, dirección
--    o contacto de emergencia, registramos el acceso con la justificación
--    operativa. Esto es obligatorio bajo el art. 30 del RGPD ("registro de
--    actividades de tratamiento") y art. 32 ("medidas técnicas de
--    seguridad").
--
--    La tabla es append-only (sin update/delete para rol admin).
-- =============================================================================

create table if not exists public.admin_lookups (
  id                uuid primary key default gen_random_uuid(),
  admin_id          uuid not null references public.profiles(id) on delete set null,
  paciente_id       uuid not null references public.pacientes(id) on delete set null,
  campo             text not null
                      check (campo in (
                        'dni_nie','telefono','email','direccion',
                        'contacto_emergencia','alergias','medicacion_base',
                        'objetivos','preferencias_clinicas',
                        'historial_clinico','diagnostico','bulk_export'
                      )),
  justificacion     text,
  ip_origen         inet,
  user_agent        text,
  created_at        timestamptz not null default now()
);

create index if not exists admin_lookups_admin_idx    on public.admin_lookups(admin_id);
create index if not exists admin_lookups_paciente_idx on public.admin_lookups(paciente_id);
create index if not exists admin_lookups_fecha_idx    on public.admin_lookups(created_at desc);

-- =============================================================================
-- 6. RPC — Registrar consulta sensible (security definer, solo admin)
--
--    Diseñada para ser llamada desde el frontend ANTES de desvelar el
--    ciphertext (el backend valida admin + inserta fila + devuelve ok).
-- =============================================================================

create or replace function public.registrar_consulta_sensible(
  p_paciente_id   uuid,
  p_campo         text,
  p_justificacion text default null,
  p_ip            inet default null,
  p_user_agent    text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin_id uuid;
  v_role public.user_role;
  v_log_id uuid;
begin
  v_admin_id := auth.uid();
  if v_admin_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select role into v_role from public.profiles where id = v_admin_id;
  if v_role is distinct from 'admin' then
    raise exception 'no_autorizado' using errcode = '42501';
  end if;

  if p_campo is null or p_campo = '' then
    raise exception 'campo_requerido';
  end if;

  insert into public.admin_lookups (admin_id, paciente_id, campo, justificacion, ip_origen, user_agent)
  values (v_admin_id, p_paciente_id, p_campo, p_justificacion, p_ip, p_user_agent)
  returning id into v_log_id;

  return v_log_id;
end;
$$;

grant execute on function public.registrar_consulta_sensible(uuid, text, text, inet, text) to authenticated;

-- =============================================================================
-- 7. Vista agregada (flags has_*) para el listado admin sin exponer ciphertext
-- =============================================================================

create or replace view public.v_pacientes_resumen_admin as
select
  p.id,
  p.user_id,
  p.fecha_alta,
  p.fecha_nacimiento,
  p.activo,
  p.tags,
  p.color_etiqueta,
  p.avatar_url,
  p.consentimiento_rgpd,
  p.created_at,
  p.updated_at,
  -- flags booleanos: el frontend puede decidir si "hay algo que desvelar"
  (p.dni_nie_ciphertext is not null)                   as has_dni,
  (p.telefono_ciphertext is not null)                  as has_telefono,
  (p.email_ciphertext is not null)                     as has_email,
  (p.direccion_ciphertext is not null)                 as has_direccion,
  (p.contacto_emergencia_telefono_ciphertext is not null) as has_contacto_emergencia,
  (p.alergias_ciphertext is not null)                  as has_alergias,
  (p.medicacion_base_ciphertext is not null)           as has_medicacion_base,
  (p.objetivos_ciphertext is not null)                 as has_objetivos,
  (select count(*) from public.paciente_diagnosticos d where d.paciente_id = p.id and d.activo) as diagnosticos_activos,
  (select count(*) from public.paciente_medicacion m where m.paciente_id = p.id and m.activo)  as medicaciones_activas,
  (select count(*) from public.paciente_adjuntos a where a.paciente_id = p.id)                 as adjuntos_total,
  (select count(*) from public.citas c where c.paciente_id = p.id and c.estado = 'completada') as sesiones_completadas,
  (select max(c.inicio) from public.citas c where c.paciente_id = p.id)                        as ultima_cita,
  (select min(c.inicio) from public.citas c where c.paciente_id = p.id and c.inicio > now() and c.activo) as proxima_cita
from public.pacientes p;

grant select on public.v_pacientes_resumen_admin to authenticated;

-- =============================================================================
-- 8. Row Level Security (RLS)
-- =============================================================================

alter table public.paciente_diagnosticos   enable row level security;
alter table public.paciente_medicacion     enable row level security;
alter table public.paciente_adjuntos       enable row level security;
alter table public.admin_lookups           enable row level security;

-- ── Diagnósticos ──
drop policy if exists "diag_admin_all"            on public.paciente_diagnosticos;
drop policy if exists "diag_paciente_ver_propio"  on public.paciente_diagnosticos;

create policy "diag_admin_all"
  on public.paciente_diagnosticos
  for all to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'admin')
  with check ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "diag_paciente_ver_propio"
  on public.paciente_diagnosticos
  for select to authenticated
  using (
    paciente_id in (select id from public.pacientes where user_id = auth.uid())
  );

-- ── Medicación ──
drop policy if exists "medic_admin_all"           on public.paciente_medicacion;
drop policy if exists "medic_paciente_ver_propia" on public.paciente_medicacion;

create policy "medic_admin_all"
  on public.paciente_medicacion
  for all to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'admin')
  with check ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "medic_paciente_ver_propia"
  on public.paciente_medicacion
  for select to authenticated
  using (
    paciente_id in (select id from public.pacientes where user_id = auth.uid())
  );

-- ── Adjuntos ficha ──
drop policy if exists "adj_admin_all"              on public.paciente_adjuntos;
drop policy if exists "adj_paciente_ver_propios"   on public.paciente_adjuntos;

create policy "adj_admin_all"
  on public.paciente_adjuntos
  for all to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'admin')
  with check ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "adj_paciente_ver_propios"
  on public.paciente_adjuntos
  for select to authenticated
  using (
    paciente_id in (select id from public.pacientes where user_id = auth.uid())
  );

-- ── Admin lookups: solo admin puede leer, nadie puede update/delete ──
drop policy if exists "admin_lookups_admin_read" on public.admin_lookups;
drop policy if exists "admin_lookups_insert_sec" on public.admin_lookups;

create policy "admin_lookups_admin_read"
  on public.admin_lookups
  for select to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'admin');

-- Insert solo via RPC (security definer). Bloqueamos explícitamente inserts directos.
-- No creamos policy INSERT → por defecto RLS deniega.

commit;
