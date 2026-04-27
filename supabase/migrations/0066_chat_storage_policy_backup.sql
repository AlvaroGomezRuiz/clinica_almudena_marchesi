-- 0060 — Política de storage permisiva para upload desde API route
-- -----------------------------------------------------------------------------
-- Las políticas originales (0013) fallan en algunos casos edge. Esta política
-- simplificada permite INSERT a usuarios autenticados que son sender del mensaje
-- referenciado en el path (segundo segmento = mensaje_id).
-- Es segura porque:
--   1. La API route ya verifica auth, rate-limit, conversación y file-type.
--   2. El path siempre es <conv_id>/<msg_id>/<filename>, y el msg_id fue creado
--      por el propio usuario vía RPC chat_enviar_mensaje (SECURITY DEFINER).
-- -----------------------------------------------------------------------------

-- Política de backup: permite upload si el mensaje en el path pertenece al usuario
drop policy if exists "chat_adj_sender_insert_storage" on storage.objects;
create policy "chat_adj_sender_insert_storage"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'chat-adjuntos'
    and exists (
      select 1
      from public.mensajes m
      where m.id::text = split_part(storage.objects.name, '/', 2)
        and m.sender_user_id = auth.uid()
    )
  );
