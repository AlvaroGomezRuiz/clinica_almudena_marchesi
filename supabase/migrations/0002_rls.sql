-- ============================================================================
-- 0002_rls.sql — Row Level Security (defense in depth)
-- ----------------------------------------------------------------------------
-- Principios:
--   1. Todas las tablas tienen RLS activo. Sin política = sin acceso.
--   2. Admin (profiles.role = 'admin') tiene acceso total vía is_admin().
--   3. Paciente solo ve/modifica filas asociadas a su current_paciente_id().
--   4. Columnas cifradas NUNCA se exponen sin deserializar en el backend;
--      RLS solo controla visibilidad de filas, no columnas.
--   5. Inserts pacientes bloqueados en tablas sensibles (historial, auditoría,
--      facturación). Esas solo las escribe el admin o el backend con service role.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Helpers reutilizables
-- ---------------------------------------------------------------------------
-- (definidas en 0001_init.sql: public.is_admin(), public.current_paciente_id())

-- ---------------------------------------------------------------------------
-- 1. PROFILES
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy profiles_self_select on public.profiles
  for select using (id = auth.uid() or public.is_admin());

create policy profiles_self_update on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));
-- El rol NO se cambia vía self-update. Solo admin o backend (service role).

create policy profiles_admin_all on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 2. PACIENTES
-- ---------------------------------------------------------------------------
alter table public.pacientes enable row level security;

create policy pacientes_self_select on public.pacientes
  for select using (user_id = auth.uid() or public.is_admin());

create policy pacientes_self_update on public.pacientes
  for update using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    -- El paciente no puede cambiar consentimiento_rgpd ni fecha_alta
    -- (forzado vía trigger de validación)
  );

create policy pacientes_admin_all on public.pacientes
  for all using (public.is_admin()) with check (public.is_admin());

-- Trigger: evitar que paciente modifique campos críticos
create or replace function public.tg_pacientes_lock_admin_fields()
returns trigger language plpgsql as $$
begin
  if not public.is_admin() then
    -- Estos campos solo los toca el admin
    new.consentimiento_rgpd    := old.consentimiento_rgpd;
    new.firma_rgpd_storage_path := old.firma_rgpd_storage_path;
    new.fecha_alta              := old.fecha_alta;
    new.activo                  := old.activo;
    new.user_id                 := old.user_id;
  end if;
  return new;
end;
$$;

create trigger tg_pacientes_lock before update on public.pacientes
  for each row execute function public.tg_pacientes_lock_admin_fields();

-- ---------------------------------------------------------------------------
-- 3. SERVICIOS — Lectura pública (autenticados), escritura solo admin
-- ---------------------------------------------------------------------------
alter table public.servicios enable row level security;

create policy servicios_read_all on public.servicios
  for select using (auth.role() = 'authenticated' and activo = true or public.is_admin());

create policy servicios_admin_write on public.servicios
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 4. CITAS
-- ---------------------------------------------------------------------------
alter table public.citas enable row level security;

create policy citas_self_select on public.citas
  for select using (paciente_id = public.current_paciente_id() or public.is_admin());

create policy citas_self_insert on public.citas
  for insert with check (
    paciente_id = public.current_paciente_id()
    and estado = 'bloqueo_temporal'  -- paciente solo crea bloqueos temporales
    or public.is_admin()
  );

create policy citas_self_cancel on public.citas
  for update using (paciente_id = public.current_paciente_id())
  with check (
    paciente_id = public.current_paciente_id()
    and estado = 'cancelada'  -- paciente solo puede cancelar
  );

create policy citas_admin_all on public.citas
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 5. AGENDA (bloqueos y notas) — solo admin escribe; paciente lee bloqueos
-- ---------------------------------------------------------------------------
alter table public.agenda_bloqueos enable row level security;

create policy agenda_bloqueos_read on public.agenda_bloqueos
  for select using (auth.role() = 'authenticated');

create policy agenda_bloqueos_admin on public.agenda_bloqueos
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.agenda_notas_dia enable row level security;

create policy agenda_notas_admin on public.agenda_notas_dia
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 6. HISTORIAL SESIONES — Paciente ve SOLO el estado_emocional (metadata);
--    los campos _ciphertext se descifran solo en backend con service role.
-- ---------------------------------------------------------------------------
alter table public.historial_sesiones enable row level security;

create policy historial_admin_all on public.historial_sesiones
  for all using (public.is_admin()) with check (public.is_admin());

create policy historial_paciente_read on public.historial_sesiones
  for select using (paciente_id = public.current_paciente_id());

-- ---------------------------------------------------------------------------
-- 7. BONOS — Paciente ve sus bonos, solo admin los crea/modifica
-- ---------------------------------------------------------------------------
alter table public.bonos_pacientes enable row level security;

create policy bonos_self_read on public.bonos_pacientes
  for select using (paciente_id = public.current_paciente_id() or public.is_admin());

create policy bonos_admin_write on public.bonos_pacientes
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 8. PAGOS — Paciente ve sus pagos, nunca los modifica (webhook Stripe vía service role)
-- ---------------------------------------------------------------------------
alter table public.pagos enable row level security;

create policy pagos_self_read on public.pagos
  for select using (paciente_id = public.current_paciente_id() or public.is_admin());

create policy pagos_admin_write on public.pagos
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 9. FACTURACIÓN NOTA — Solo admin
-- ---------------------------------------------------------------------------
alter table public.facturacion_nota enable row level security;

create policy factnota_admin on public.facturacion_nota
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 10. AUDITORÍA — Solo lectura para admin, escritura vía service role
-- ---------------------------------------------------------------------------
alter table public.auditoria enable row level security;

create policy auditoria_admin_read on public.auditoria
  for select using (public.is_admin());

-- No hay INSERT/UPDATE/DELETE desde clientes. Solo backend con service_role.

-- ---------------------------------------------------------------------------
-- 11. RECURSOS + ASIGNACIONES
-- ---------------------------------------------------------------------------
alter table public.recursos enable row level security;

-- Paciente solo ve recursos que tiene asignados
create policy recursos_paciente_read on public.recursos
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.recurso_asignaciones ra
      where ra.recurso_id = recursos.id
        and ra.paciente_id = public.current_paciente_id()
        and ra.activo = true
    )
  );

create policy recursos_admin_write on public.recursos
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.recurso_asignaciones enable row level security;

create policy recurso_asig_paciente_read on public.recurso_asignaciones
  for select using (paciente_id = public.current_paciente_id() or public.is_admin());

-- Paciente puede marcar como completado su asignación
create policy recurso_asig_paciente_complete on public.recurso_asignaciones
  for update using (paciente_id = public.current_paciente_id())
  with check (paciente_id = public.current_paciente_id());

create policy recurso_asig_admin_all on public.recurso_asignaciones
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 12. CONVERSACIONES + MENSAJES
-- ---------------------------------------------------------------------------
alter table public.conversaciones enable row level security;

create policy conv_participante on public.conversaciones
  for select using (paciente_id = public.current_paciente_id() or public.is_admin());

create policy conv_update_participante on public.conversaciones
  for update using (paciente_id = public.current_paciente_id() or public.is_admin())
  with check (paciente_id = public.current_paciente_id() or public.is_admin());

create policy conv_admin_insert on public.conversaciones
  for insert with check (public.is_admin() or paciente_id = public.current_paciente_id());

alter table public.mensajes enable row level security;

create policy mensajes_participante_read on public.mensajes
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.conversaciones c
      where c.id = mensajes.conversation_id
        and c.paciente_id = public.current_paciente_id()
    )
  );

create policy mensajes_participante_insert on public.mensajes
  for insert with check (
    sender_user_id = auth.uid()
    and (
      public.is_admin()
      or exists (
        select 1 from public.conversaciones c
        where c.id = mensajes.conversation_id
          and c.paciente_id = public.current_paciente_id()
      )
    )
  );

-- Los mensajes son inmutables: no update, no delete (append-only audit).

-- ---------------------------------------------------------------------------
-- 13. GRANTS BÁSICOS
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select on public.servicios to authenticated;

-- Lecturas/escrituras específicas vía RLS
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Revocar insert directo en auditoria (solo service_role)
revoke insert, update, delete on public.auditoria from authenticated;

-- Revocar escrituras en pagos (solo service_role vía webhook Stripe)
revoke insert, delete on public.pagos from authenticated;

-- Service role (backend FastAPI) tiene bypass total vía bypassrls
-- Esto ya viene por defecto en Supabase.
