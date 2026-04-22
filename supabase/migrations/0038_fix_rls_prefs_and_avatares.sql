-- =============================================================================
-- Migration 0038 — Fix RLS holes: notificaciones_prefs INSERT + avatares legacy
-- =============================================================================
-- Contexto (PLAN_REMEDIACION_22_ABR.md · FASE 0):
--
-- BUG #5 — "new row violates row-level security policy for table notificaciones_prefs"
--   Causa: en migration 0009_email.sql sólo se crearon policies SELECT y UPDATE
--   para el usuario propietario, y `for all` sólo para admin.  El UPSERT desde
--   `actualizarPreferenciasAction` intenta un INSERT cuando el paciente no tiene
--   fila (legacy, trigger fallido o cuenta importada) y falla con RLS error.
--
-- BUG #4 — "no deja añadir foto de perfil"
--   Causa: migration 0003_storage.sql creó la policy `avatares_owner_write`
--   con `split_part(name, '.', 1) = auth.uid()::text` (path pattern antiguo
--   `avatares/<uid>.jpg`).  Migration 0013 añadió policies nuevas con el
--   pattern correcto `<uid>/avatar.<ext>` pero NO borró la antigua.  En RLS
--   con policies PERMISSIVE, basta que UNA permita, pero si la antigua está
--   restringiendo INSERT con el check `split_part(name,'.',1)=uid::text`
--   (que para el path `uid/avatar.ext` evalúa a `"uid/avatar"`), y otras
--   policies no son `for insert` sino genéricas, el INSERT podría rebotar
--   bajo ciertos planificadores.  Además contamina el espacio de políticas.
--
-- Criterio de aceptación:
--   * Paciente nuevo sin fila en notificaciones_prefs puede hacer toggle
--     (UPSERT → INSERT) sin violación RLS.
--   * Paciente existente puede actualizar su toggle (UPDATE) como antes.
--   * Admin conserva acceso total (for all policy intacta).
--   * Upload de avatar a `avatares/<uid>/avatar.png` funciona con `0013`.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. notificaciones_prefs: permitir INSERT al dueño
-- ---------------------------------------------------------------------------

drop policy if exists "user inserts own email prefs" on public.notificaciones_prefs;
create policy "user inserts own email prefs"
  on public.notificaciones_prefs for insert to authenticated
  with check (auth.uid() = user_id);

-- Actualizar también la UPDATE policy para añadir WITH CHECK explícito
-- (evita que alguien actualice su fila cambiándose el user_id a otro).
drop policy if exists "user updates own email prefs" on public.notificaciones_prefs;
create policy "user updates own email prefs"
  on public.notificaciones_prefs for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Garantiza que cualquier paciente existente sin fila la obtenga, idempotente.
-- Se ejecuta en el contexto del definer de la migración (SUPERUSER → bypassea RLS).
insert into public.notificaciones_prefs (user_id)
  select p.id
    from public.profiles p
    left join public.notificaciones_prefs np on np.user_id = p.id
   where np.user_id is null
  on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- 2. avatares: eliminar policy legacy incompatible con path nuevo
-- ---------------------------------------------------------------------------
-- La policy "avatares_owner_write" de 0003 usaba path `<uid>.ext` en la raíz.
-- El código actual sube a `<uid>/avatar.ext` (subcarpeta) y las policies
-- correctas ya están en 0013 (avatares_user_{insert,update,delete}_own_storage).

drop policy if exists "avatares_owner_write" on storage.objects;
drop policy if exists "avatares_public_read" on storage.objects;

-- Recreamos lectura pública con el mismo efecto (bucket public=true ya lo hace,
-- pero mantenemos la policy explícita por si alguien lo pone privado).
drop policy if exists "avatares_public_read_storage" on storage.objects;
create policy "avatares_public_read_storage"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'avatares');

commit;

-- =============================================================================
-- Verificación manual (ejecutar como paciente):
--   INSERT INTO public.notificaciones_prefs (user_id) VALUES (auth.uid())
--     ON CONFLICT (user_id) DO UPDATE SET welcome = false;
--   → debe devolver sin error.
-- =============================================================================
