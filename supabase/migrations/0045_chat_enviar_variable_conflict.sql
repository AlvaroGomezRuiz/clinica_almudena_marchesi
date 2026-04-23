-- ============================================================================
-- 0045_chat_enviar_variable_conflict.sql
-- ----------------------------------------------------------------------------
-- Bugfix: RPC chat_enviar_mensaje declara RETURNS TABLE con columna "id".
-- PL/pgSQL crea una variable OUT implícita "id" que colisiona con
-- INSERT ... RETURNING * INTO v_new → Postgres 42702 "column reference id
-- is ambiguous" (mismo patrón que 0030_fix_reservar_cita_ambiguity).
--
-- Fix oficial: pragma #variable_conflict use_column prioriza columnas de
-- tabla frente a variables homónimas en RETURNING.
-- ============================================================================

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
#variable_conflict use_column
declare
  v_uid      uuid    := auth.uid();
  v_is_admin boolean := public.is_admin();
  v_conv     public.conversaciones%rowtype;
  v_trim     text;
  v_new      public.mensajes%rowtype;
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
    returning * into v_new;

  if v_is_admin then
    update public.conversaciones
       set last_message_at = v_new.created_at,
           unread_paciente = unread_paciente + 1
     where id = p_conversacion_id;
  else
    update public.conversaciones
       set last_message_at = v_new.created_at,
           unread_admin    = unread_admin + 1
     where id = p_conversacion_id;
  end if;

  return query
    select v_new.id,
           v_new.conversation_id,
           v_new.sender_user_id,
           v_trim,
           v_new.read_at,
           v_new.created_at;
end;
$function$;
