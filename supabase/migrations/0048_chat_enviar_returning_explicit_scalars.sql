-- 0048 — chat_enviar_mensaje: sin RETURNING * INTO %rowtype
-- -----------------------------------------------------------------------------
-- 0045 (#variable_conflict use_column) aún deja 42702 en algunos despliegues
-- o si la migración no se aplicó. Más sólido: listar explícitamente columnas
-- en RETURNING e inyectar en variables escalares (cero colisión con OUT "id").

create or replace function public.chat_enviar_mensaje(
  p_conversacion_id uuid,
  p_contenido       text
)
returns table (
  id                 uuid,
  conversation_id    uuid,
  sender_user_id     uuid,
  body               text,
  read_at            timestamptz,
  created_at         timestamptz
)
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_uid         uuid     := auth.uid();
  v_is_admin    boolean  := public.is_admin();
  v_conv        public.conversaciones%rowtype;
  v_trim        text;
  v_mid         uuid;
  v_cid         uuid;
  v_suid        uuid;
  v_read        timestamptz;
  v_created     timestamptz;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;

  v_trim := nullif(btrim(p_contenido), '');
  if v_trim is null then
    raise exception 'empty_message' using errcode = 'check_violation';
  end if;
  if length(v_trim) > 4000 then
    raise exception 'message_too_long' using errcode = 'string_data_right_truncation';
  end if;

  select * into v_conv
    from public.conversaciones
   where id = p_conversacion_id;

  if not found then
    raise exception 'conversation_not_found' using errcode = 'no_data_found';
  end if;

  if not v_is_admin and v_conv.paciente_id <> public.current_paciente_id() then
    raise exception 'forbidden' using errcode = 'insufficient_privilege';
  end if;

  insert into public.mensajes (conversation_id, sender_user_id, body_ciphertext, encryption_version)
       values (p_conversacion_id, v_uid, public.app_encrypt(v_trim), 'v1')
    returning id, conversation_id, sender_user_id, read_at, created_at
     into v_mid, v_cid, v_suid, v_read, v_created;

  if v_is_admin then
    update public.conversaciones
       set last_message_at = v_created,
           unread_paciente = unread_paciente + 1
     where id = p_conversacion_id;
  else
    update public.conversaciones
       set last_message_at = v_created,
           unread_admin    = unread_admin + 1
     where id = p_conversacion_id;
  end if;

  return query
    select v_mid, v_cid, v_suid, v_trim, v_read, v_created;
end;
$function$;

revoke all on function public.chat_enviar_mensaje(uuid, text) from public;
grant execute on function public.chat_enviar_mensaje(uuid, text) to authenticated;
