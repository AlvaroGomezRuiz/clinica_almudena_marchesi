-- =============================================================================
-- 0077 — RLS: mensajes + chat-adjuntos + mensajes_adjuntos cuando la
--         conversación solo tiene user_id (sin paciente_id), alineado con 0067.
--
-- Síntoma: RLS en chat (adjuntos / signed URLs) para usuario con conversación
--         solo por user_id (sin paciente_id): políticas antiguas solo unían
--         pacientes. El avatar en API usa service_role si está definida (ver
--         frontend /api/admin/avatar/upload).
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. mensajes: leer e insertar en conversaciones propias (paciente_id o user_id)
-- ---------------------------------------------------------------------------
drop policy if exists mensajes_participante_read on public.mensajes;
create policy mensajes_participante_read on public.mensajes
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
        from public.conversaciones c
       where c.id = mensajes.conversation_id
         and (
           (c.paciente_id is not null and c.paciente_id = public.current_paciente_id())
           or c.user_id = auth.uid()
         )
    )
  );

drop policy if exists mensajes_participante_insert on public.mensajes;
create policy mensajes_participante_insert on public.mensajes
  for insert to authenticated
  with check (
    sender_user_id = auth.uid()
    and (
      public.is_admin()
      or exists (
        select 1
          from public.conversaciones c
         where c.id = mensajes.conversation_id
           and (
             (c.paciente_id is not null and c.paciente_id = public.current_paciente_id())
             or c.user_id = auth.uid()
           )
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 2. storage.objects — chat-adjuntos: lectura e inserción por user_id
-- ---------------------------------------------------------------------------
drop policy if exists "chat_adj_paciente_read_own_storage" on storage.objects;
create policy "chat_adj_paciente_read_own_storage"
  on storage.objects for select to authenticated
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

drop policy if exists "chat_adj_paciente_insert_own_storage" on storage.objects;
create policy "chat_adj_paciente_insert_own_storage"
  on storage.objects for insert to authenticated
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

-- ---------------------------------------------------------------------------
-- 3. mensajes_adjuntos — SELECT: mensajes de conversación ligada al usuario
-- ---------------------------------------------------------------------------
drop policy if exists "chat_adj_paciente_own" on public.mensajes_adjuntos;
create policy "chat_adj_paciente_own"
  on public.mensajes_adjuntos for select to authenticated
  using (
    mensaje_id in (
      select m.id
        from public.mensajes m
        join public.conversaciones c on c.id = m.conversation_id
        join public.pacientes p on p.id = c.paciente_id
       where p.user_id = auth.uid()
    )
    or mensaje_id in (
      select m.id
        from public.mensajes m
        join public.conversaciones c on c.id = m.conversation_id
       where c.user_id = auth.uid()
    )
  );

commit;
