-- =============================================================================
-- 0078 — Restaurar políticas RLS en storage.objects (buckets sin policies)
--
-- Caso: insert manual en storage.buckets tras borrar buckets en la UI; las
--       policies no se recrean solas. Sin ellas, la UI muestra "0 policies"
--       y todo upload/select falla por RLS.
--
-- Idempotente: DROP IF EXISTS + CREATE. Alineado con 0003, 0013, 0018, 0020,
--              0038, 0066 y la variante chat de 0077 (user_id sin paciente).
-- =============================================================================

begin;

-- Nota: no usar ALTER TABLE storage.objects … aquí: en proyectos Supabase
-- gestionados el propietario es el rol interno de Storage; `supabase db push`
-- falla con SQLSTATE 42501. RLS en storage.objects ya viene activado por defecto.

-- ---------------------------------------------------------------------------
-- Quitar políticas conocidas del proyecto (nombres estables)
-- ---------------------------------------------------------------------------
drop policy if exists "recursos_admin_all" on storage.objects;
drop policy if exists "recursos_paciente_read" on storage.objects;
drop policy if exists "firmas_admin_all" on storage.objects;
drop policy if exists "firmas_paciente_own" on storage.objects;
drop policy if exists "avatares_owner_write" on storage.objects;
drop policy if exists "chat_adj_admin_all_storage" on storage.objects;
drop policy if exists "chat_adj_paciente_read_own_storage" on storage.objects;
drop policy if exists "chat_adj_paciente_insert_own_storage" on storage.objects;
drop policy if exists "chat_adj_sender_insert_storage" on storage.objects;
drop policy if exists "avatares_user_upload_own_storage" on storage.objects;
drop policy if exists "avatares_user_update_own_storage" on storage.objects;
drop policy if exists "avatares_user_delete_own_storage" on storage.objects;
drop policy if exists "avatares_public_read_storage" on storage.objects;
drop policy if exists "paciente_adj_admin_all_storage" on storage.objects;
drop policy if exists "paciente_adj_paciente_read_own_storage" on storage.objects;
drop policy if exists "rgpd_exports_owner_select" on storage.objects;

-- ---------------------------------------------------------------------------
-- recursos (0003 + 0018)
-- ---------------------------------------------------------------------------
create policy "recursos_admin_all" on storage.objects
  for all using (
    bucket_id = 'recursos' and public.is_admin()
  ) with check (
    bucket_id = 'recursos' and public.is_admin()
  );

create policy "recursos_paciente_read" on storage.objects
  for select using (
    bucket_id = 'recursos'
    and (
      exists (
        select 1
          from public.recurso_asignaciones ra
          join public.recursos r on r.id = ra.recurso_id
         where ra.paciente_id = public.current_paciente_id()
           and ra.activo = true
           and storage.objects.name like r.id::text || '/%'
      )
      or exists (
        select 1
          from public.recursos r
         where r.publico = true
           and storage.objects.name like r.id::text || '/%'
      )
    )
  );

-- ---------------------------------------------------------------------------
-- firmas-rgpd (0003)
-- ---------------------------------------------------------------------------
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
-- chat-adjuntos (0013 + 0066 + misma lógica user_id que 0077)
-- ---------------------------------------------------------------------------
create policy "chat_adj_admin_all_storage" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'chat-adjuntos'
    and (select role from public.profiles where id = auth.uid()) = 'admin'
  )
  with check (
    bucket_id = 'chat-adjuntos'
    and (select role from public.profiles where id = auth.uid()) = 'admin'
  );

create policy "chat_adj_paciente_read_own_storage" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'chat-adjuntos'
    and (
      exists (
        select 1
          from public.conversaciones c
          join public.pacientes p on p.id = c.paciente_id
         where p.user_id = auth.uid()
           and split_part(storage.objects.name, '/', 1) = c.id::text
      )
      or exists (
        select 1
          from public.conversaciones c
         where c.user_id = auth.uid()
           and split_part(storage.objects.name, '/', 1) = c.id::text
      )
    )
  );

create policy "chat_adj_paciente_insert_own_storage" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'chat-adjuntos'
    and (
      exists (
        select 1
          from public.conversaciones c
          join public.pacientes p on p.id = c.paciente_id
         where p.user_id = auth.uid()
           and split_part(storage.objects.name, '/', 1) = c.id::text
      )
      or exists (
        select 1
          from public.conversaciones c
         where c.user_id = auth.uid()
           and split_part(storage.objects.name, '/', 1) = c.id::text
      )
    )
  );

create policy "chat_adj_sender_insert_storage" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'chat-adjuntos'
    and exists (
      select 1
        from public.mensajes m
       where m.id::text = split_part(storage.objects.name, '/', 2)
         and m.sender_user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- avatares (0013 + 0038; sin avatares_owner_write legacy)
-- ---------------------------------------------------------------------------
create policy "avatares_user_upload_own_storage" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatares'
    and split_part(storage.objects.name, '/', 1) = auth.uid()::text
  );

create policy "avatares_user_update_own_storage" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatares'
    and split_part(storage.objects.name, '/', 1) = auth.uid()::text
  );

create policy "avatares_user_delete_own_storage" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatares'
    and split_part(storage.objects.name, '/', 1) = auth.uid()::text
  );

create policy "avatares_public_read_storage" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'avatares');

-- ---------------------------------------------------------------------------
-- paciente-adjuntos (0013)
-- ---------------------------------------------------------------------------
create policy "paciente_adj_admin_all_storage" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'paciente-adjuntos'
    and (select role from public.profiles where id = auth.uid()) = 'admin'
  )
  with check (
    bucket_id = 'paciente-adjuntos'
    and (select role from public.profiles where id = auth.uid()) = 'admin'
  );

create policy "paciente_adj_paciente_read_own_storage" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'paciente-adjuntos'
    and exists (
      select 1
        from public.pacientes p
       where p.user_id = auth.uid()
         and split_part(storage.objects.name, '/', 1) = p.id::text
    )
  );

-- ---------------------------------------------------------------------------
-- rgpd-exports (0020)
-- ---------------------------------------------------------------------------
create policy "rgpd_exports_owner_select" on storage.objects
  for select using (
    bucket_id = 'rgpd-exports'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

commit;
