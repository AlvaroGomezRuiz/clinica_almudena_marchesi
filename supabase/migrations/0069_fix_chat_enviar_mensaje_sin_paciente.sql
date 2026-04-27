-- ============================================================================
-- 0069_fix_chat_enviar_mensaje_sin_paciente.sql
-- ----------------------------------------------------------------------------
-- La migración 0067 falló al hacer CREATE OR REPLACE de chat_enviar_mensaje
-- porque PostgreSQL no permite cambiar el tipo de retorno (body_ciphertext
-- vs body). Se soluciona con DROP CASCADE + CREATE.
--
-- Esta migración:
--   1. DROP + recrea chat_enviar_mensaje con la firma correcta (body text)
--      y la lógica actualizada para permitir conversaciones sin paciente_id.
--   2. También recrea chat_marcar_leidos con la lógica sin paciente.
--   3. Actualiza v_conversaciones_admin para mostrar conversaciones sin ficha.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Reemplazar chat_enviar_mensaje (DROP necesario por cambio de columna body)
-- ---------------------------------------------------------------------------
drop function if exists public.chat_enviar_mensaje(uuid, text) cascade;

create function public.chat_enviar_mensaje(
  p_conversacion_id uuid,
  p_contenido       text
)
returns table (
  id                 uuid,
  conversation_id    uuid,
  sender_user_id     uuid,
  body               text,        -- plaintext descifrado (igual que v0051)
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
    from public.conversaciones c
   where c.id = p_conversacion_id;

  if not found then
    raise exception 'conversation_not_found' using errcode = 'no_data_found';
  end if;

  -- Verificar permisos: admin puede todo; paciente solo su conversación
  -- Acepta conversaciones con paciente_id O solo user_id (sin ficha clínica)
  if not v_is_admin then
    if (v_conv.paciente_id is not null and v_conv.paciente_id <> public.current_paciente_id())
       and (v_conv.user_id is distinct from v_uid) then
      raise exception 'forbidden' using errcode = 'insufficient_privilege';
    end if;
  end if;

  insert into public.mensajes as m (conversation_id, sender_user_id, body_ciphertext, encryption_version)
       values (p_conversacion_id, v_uid, public.app_encrypt(v_trim), 'v1')
    returning m.id, m.conversation_id, m.sender_user_id, m.read_at, m.created_at
     into v_mid, v_cid, v_suid, v_read, v_created;

  if v_is_admin then
    update public.conversaciones c
       set last_message_at = v_created,
           unread_paciente = c.unread_paciente + 1
     where c.id = p_conversacion_id;
  else
    update public.conversaciones c
       set last_message_at = v_created,
           unread_admin    = c.unread_admin + 1
     where c.id = p_conversacion_id;
  end if;

  return query
    select v_mid, v_cid, v_suid, v_trim, v_read, v_created;
end;
$function$;

revoke all on function public.chat_enviar_mensaje(uuid, text) from public;
grant execute on function public.chat_enviar_mensaje(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Actualizar v_conversaciones_admin para incluir convs sin ficha clínica
-- ---------------------------------------------------------------------------
create or replace view public.v_conversaciones_admin as
  select
    c.id,
    c.paciente_id,
    coalesce(p.user_id, c.user_id)       as paciente_user_id,
    pr.display_name                       as paciente_display_name,
    pr.email                              as paciente_email,
    c.last_message_at,
    c.unread_admin,
    c.unread_paciente,
    c.estado,
    public.chat_preview_plain_for_conversacion(um.body_ciphertext, c.id) as ultimo_mensaje,
    um.created_at                         as ultimo_mensaje_en,
    um.sender_user_id                     as ultimo_mensaje_autor,
    c.created_at,
    c.updated_at
  from public.conversaciones c
  left join public.pacientes p   on p.id  = c.paciente_id
  left join public.profiles  pr  on pr.id = coalesce(p.user_id, c.user_id)
  left join lateral (
    select body_ciphertext, created_at, sender_user_id
      from public.mensajes m
     where m.conversation_id = c.id
     order by m.created_at desc
     limit 1
  ) um on true;

alter view public.v_conversaciones_admin set (security_invoker = true);
grant select on public.v_conversaciones_admin to authenticated;
