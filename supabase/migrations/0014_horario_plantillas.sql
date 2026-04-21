-- =============================================================================
-- 0014_horario_plantillas.sql
--
-- Plantillas de horario reutilizables para los días en que Almudena trabaja
-- fuera de la clínica (ej. "Anam"), tiene jornada partida, o bloquea todo
-- el día. Aplicables a un rango de fechas concreto y tomadas en cuenta por
-- `obtener_disponibilidad` (que se actualiza para considerarlas).
--
-- Diseño:
--   public.horario_plantillas:
--     nombre, descripcion, color, items jsonb ({weekday, hora_inicio,
--     hora_fin, libre boolean}[]), bloquea_dia_completo boolean.
--   public.agenda_plantilla_aplicaciones:
--     plantilla_id, fecha_desde, fecha_hasta, rrule text (opcional),
--     nota, activo boolean.
--
-- Las plantillas sustituyen (o bloquean) la disponibilidad base en el rango
-- de fechas donde aplican. Si `bloquea_dia_completo = true`, ese día entero
-- queda como "no disponible" sin importar horarios_clinica.
-- =============================================================================

begin;

-- =============================================================================
-- 1. Plantillas reutilizables
-- =============================================================================

create table if not exists public.horario_plantillas (
  id                     uuid primary key default gen_random_uuid(),
  nombre                 text not null,
  descripcion            text,
  color                  text not null default '#4b645f',     -- para render UI
  items                  jsonb not null default '[]'::jsonb,  -- [{weekday:1-7, hora_inicio:"HH:MM", hora_fin:"HH:MM", libre:false}]
  bloquea_dia_completo   boolean not null default false,
  activo                 boolean not null default true,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint horario_plantillas_nombre_unique unique (nombre)
);

alter table public.horario_plantillas enable row level security;

drop policy if exists "htpl_read_all"  on public.horario_plantillas;
drop policy if exists "htpl_admin_cud" on public.horario_plantillas;

create policy "htpl_read_all"
  on public.horario_plantillas
  for select to authenticated
  using (true);

create policy "htpl_admin_cud"
  on public.horario_plantillas
  for all to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'admin')
  with check ((select role from public.profiles where id = auth.uid()) = 'admin');

-- Seed de plantillas habituales (idempotente)
insert into public.horario_plantillas (nombre, descripcion, color, items, bloquea_dia_completo)
values
  ('Anam — mañanas',
   'Trabajando en la clínica Anam (mañana). Indisponible de 10:00 a 14:00.',
   '#8B7355',
   jsonb_build_array(
     jsonb_build_object('weekday', 1, 'hora_inicio', '10:00', 'hora_fin', '14:00', 'libre', false),
     jsonb_build_object('weekday', 2, 'hora_inicio', '10:00', 'hora_fin', '14:00', 'libre', false),
     jsonb_build_object('weekday', 3, 'hora_inicio', '10:00', 'hora_fin', '14:00', 'libre', false)
   ),
   false),
  ('Día libre',
   'Día completo no disponible (vacaciones, formación, personal).',
   '#b2675e',
   '[]'::jsonb,
   true),
  ('Sólo tardes',
   'Jornada reducida: disponible únicamente de 16:00 a 20:00.',
   '#456377',
   jsonb_build_array(
     jsonb_build_object('weekday', 1, 'hora_inicio', '16:00', 'hora_fin', '20:00', 'libre', true),
     jsonb_build_object('weekday', 2, 'hora_inicio', '16:00', 'hora_fin', '20:00', 'libre', true),
     jsonb_build_object('weekday', 3, 'hora_inicio', '16:00', 'hora_fin', '20:00', 'libre', true),
     jsonb_build_object('weekday', 4, 'hora_inicio', '16:00', 'hora_fin', '20:00', 'libre', true),
     jsonb_build_object('weekday', 5, 'hora_inicio', '16:00', 'hora_fin', '20:00', 'libre', true)
   ),
   false)
on conflict (nombre) do nothing;

-- =============================================================================
-- 2. Aplicaciones de plantilla a un rango de fechas
-- =============================================================================

create table if not exists public.agenda_plantilla_aplicaciones (
  id              uuid primary key default gen_random_uuid(),
  plantilla_id    uuid not null references public.horario_plantillas(id) on delete restrict,
  fecha_desde     date not null,
  fecha_hasta     date not null,
  nota            text,
  activo          boolean not null default true,
  created_at      timestamptz not null default now(),
  constraint apa_rango_valido check (fecha_hasta >= fecha_desde)
);

create index if not exists apa_rango_idx
  on public.agenda_plantilla_aplicaciones (fecha_desde, fecha_hasta)
  where activo = true;

alter table public.agenda_plantilla_aplicaciones enable row level security;

drop policy if exists "apa_read_all"  on public.agenda_plantilla_aplicaciones;
drop policy if exists "apa_admin_cud" on public.agenda_plantilla_aplicaciones;

create policy "apa_read_all"
  on public.agenda_plantilla_aplicaciones
  for select to authenticated
  using (true);

create policy "apa_admin_cud"
  on public.agenda_plantilla_aplicaciones
  for all to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'admin')
  with check ((select role from public.profiles where id = auth.uid()) = 'admin');

-- =============================================================================
-- 3. Helpers usados por el frontend / RPC de disponibilidad
--
--    `public.dia_bloqueado_por_plantilla(p_fecha)` devuelve true si algún
--    APA activo en esa fecha tiene `bloquea_dia_completo`. Sirve como guard
--    rápido dentro de `obtener_disponibilidad` (no reimplementamos aquí).
-- =============================================================================

create or replace function public.dia_bloqueado_por_plantilla(p_fecha date)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.agenda_plantilla_aplicaciones apa
    join public.horario_plantillas hp on hp.id = apa.plantilla_id
    where apa.activo = true
      and hp.activo = true
      and hp.bloquea_dia_completo = true
      and p_fecha between apa.fecha_desde and apa.fecha_hasta
  );
$$;

grant execute on function public.dia_bloqueado_por_plantilla(date) to authenticated;

commit;
