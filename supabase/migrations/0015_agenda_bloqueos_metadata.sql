-- =============================================================================
-- 0015 — agenda_bloqueos: metadatos extendidos
--
-- Añade:
--   * dia_completo (boolean)  -> si true, el bloqueo ocupa el día entero sin
--                                importar inicio/fin exactos (se guarda por
--                                conveniencia en rango 00:00 - 23:59:59).
--   * creado_por (uuid)       -> profile admin que lo creó (FK opcional).
--
-- También asegura RLS y políticas (lectura auth / escritura admin).
-- =============================================================================

begin;

alter table public.agenda_bloqueos
  add column if not exists dia_completo boolean not null default false,
  add column if not exists creado_por   uuid references public.profiles(id) on delete set null;

-- Habilitar RLS (idempotente) y políticas coherentes con el resto del schema.
alter table public.agenda_bloqueos enable row level security;

drop policy if exists "bloq_read_auth"   on public.agenda_bloqueos;
drop policy if exists "bloq_admin_cud"   on public.agenda_bloqueos;

-- Pacientes ven los bloqueos activos para saber qué huecos hay libres.
create policy "bloq_read_auth"
  on public.agenda_bloqueos
  for select to authenticated
  using (activo = true);

create policy "bloq_admin_cud"
  on public.agenda_bloqueos
  for all to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'admin')
  with check ((select role from public.profiles where id = auth.uid()) = 'admin');

commit;
