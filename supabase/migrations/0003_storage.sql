-- ============================================================================
-- 0003_storage.sql — Buckets Storage y políticas
-- ----------------------------------------------------------------------------
-- Buckets:
--   * recursos         — PDFs, audios, vídeos para asignar a pacientes (privado)
--   * firmas-rgpd      — Firmas digitales RGPD (privado, solo admin)
--   * avatares         — Avatares de usuarios (público con cache, read-only para no-owner)
-- ----------------------------------------------------------------------------
-- Nota: Los buckets se crean vía INSERT a storage.buckets (idempotente).
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('recursos', 'recursos', false, 52428800,  -- 50MB
    array['application/pdf', 'audio/mpeg', 'audio/mp4', 'video/mp4', 'image/jpeg', 'image/png', 'image/webp']),
  ('firmas-rgpd', 'firmas-rgpd', false, 2097152,  -- 2MB
    array['image/png', 'image/jpeg', 'application/pdf']),
  ('avatares', 'avatares', true, 2097152,  -- 2MB público
    array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- BUCKET: recursos
-- ---------------------------------------------------------------------------
-- Path pattern: recursos/<recurso_id>/<filename>
-- Lectura: admin + pacientes con asignación activa a ese recurso
-- Escritura: solo admin

create policy "recursos_admin_all" on storage.objects
  for all using (
    bucket_id = 'recursos' and public.is_admin()
  ) with check (
    bucket_id = 'recursos' and public.is_admin()
  );

create policy "recursos_paciente_read" on storage.objects
  for select using (
    bucket_id = 'recursos'
    and exists (
      select 1
      from public.recurso_asignaciones ra
      join public.recursos r on r.id = ra.recurso_id
      where ra.paciente_id = public.current_paciente_id()
        and ra.activo = true
        and r.storage_path = name
    )
  );

-- ---------------------------------------------------------------------------
-- BUCKET: firmas-rgpd
-- ---------------------------------------------------------------------------
-- Path pattern: firmas-rgpd/<paciente_id>.png
-- Lectura/escritura: SOLO admin y el propio paciente (para subir su firma)

create policy "firmas_admin_all" on storage.objects
  for all using (
    bucket_id = 'firmas-rgpd' and public.is_admin()
  ) with check (
    bucket_id = 'firmas-rgpd' and public.is_admin()
  );

create policy "firmas_paciente_own" on storage.objects
  for all using (
    bucket_id = 'firmas-rgpd'
    and split_part(name, '.', 1) = public.current_paciente_id()::text
  ) with check (
    bucket_id = 'firmas-rgpd'
    and split_part(name, '.', 1) = public.current_paciente_id()::text
  );

-- ---------------------------------------------------------------------------
-- BUCKET: avatares
-- ---------------------------------------------------------------------------
-- Path pattern: avatares/<user_id>.jpg
-- Lectura: público (bucket marked public)
-- Escritura: solo el propio dueño

create policy "avatares_owner_write" on storage.objects
  for all using (
    bucket_id = 'avatares'
    and split_part(name, '.', 1) = auth.uid()::text
  ) with check (
    bucket_id = 'avatares'
    and split_part(name, '.', 1) = auth.uid()::text
  );
