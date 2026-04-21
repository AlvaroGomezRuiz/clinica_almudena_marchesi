-- ============================================================================
-- 0006_chat.sql — Vista y RPCs para chat realtime admin ↔ paciente
-- ----------------------------------------------------------------------------
-- Expone una API idempotente sobre las tablas conversaciones/mensajes:
--   * v_conversaciones_admin  — listado con display_name + último mensaje
--   * chat_mi_conversacion    — devuelve/crea la conversación del paciente
--   * chat_enviar_mensaje     — inserta mensaje + actualiza contadores
--   * chat_marcar_leidos      — marca read_at y resetea unread del receptor
--
-- Seguridad:
--   - Vista con security_invoker: respeta RLS del invocador
--   - RPCs con security definer + check manual de permisos (admin o paciente)
--   - Validación defensiva: not null, length ≤ 4000, trim
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Vista admin: conversaciones con metadata enriquecida
-- ---------------------------------------------------------------------------
create or replace view public.v_conversaciones_admin as
  select
    c.id,
    c.paciente_id,
    p.user_id                 as paciente_user_id,
    pr.display_name           as paciente_display_name,
    pr.email                  as paciente_email,
    c.last_message_at,
    c.unread_admin,
    c.unread_paciente,
    c.estado,
    um.body_ciphertext        as ultimo_mensaje,
    um.created_at             as ultimo_mensaje_en,
    um.sender_user_id         as ultimo_mensaje_autor,
    c.created_at,
    c.updated_at
  from public.conversaciones c
  join public.pacientes p  on p.id  = c.paciente_id
  left join public.profiles pr on pr.id = p.user_id
  left join lateral (
    select body_ciphertext, created_at, sender_user_id
      from public.mensajes m
     where m.conversation_id = c.id
     order by m.created_at desc
     limit 1
  ) um on true;

alter view public.v_conversaciones_admin set (security_invoker = true);

grant select on public.v_conversaciones_admin to authenticated;

-- ---------------------------------------------------------------------------
-- 2. RPC: obtener (o crear) la conversación del paciente actual
-- ---------------------------------------------------------------------------
create or replace function public.chat_mi_conversacion()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_paciente_id uuid := public.current_paciente_id();
  v_conv_id     uuid;
begin
  if v_paciente_id is null then
    raise exception 'no_paciente_record' using errcode = 'insufficient_privilege';
  end if;

  select id into v_conv_id
    from public.conversaciones
   where paciente_id = v_paciente_id
   limit 1;

  if v_conv_id is null then
    insert into public.conversaciones (paciente_id)
      values (v_paciente_id)
      returning id into v_conv_id;
  end if;

  return v_conv_id;
end;
$$;

revoke all on function public.chat_mi_conversacion() from public;
grant execute on function public.chat_mi_conversacion() to authenticated;

-- ---------------------------------------------------------------------------
-- 3. RPC: enviar mensaje (válida tanto para admin como paciente dueño)
-- ---------------------------------------------------------------------------
create or replace function public.chat_enviar_mensaje(
  p_conversacion_id uuid,
  p_contenido       text
)
returns table (
  id                 uuid,
  conversation_id    uuid,
  sender_user_id     uuid,
  body_ciphertext    text,
  read_at            timestamptz,
  created_at         timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
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

  insert into public.mensajes (conversation_id, sender_user_id, body_ciphertext)
       values (p_conversacion_id, v_uid, v_trim)
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
           v_new.body_ciphertext,
           v_new.read_at,
           v_new.created_at;
end;
$$;

revoke all on function public.chat_enviar_mensaje(uuid, text) from public;
grant execute on function public.chat_enviar_mensaje(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. RPC: marcar como leídos los mensajes del otro + resetear unread propio
-- ---------------------------------------------------------------------------
create or replace function public.chat_marcar_leidos(
  p_conversacion_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid      uuid    := auth.uid();
  v_is_admin boolean := public.is_admin();
  v_conv     public.conversaciones%rowtype;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;

  select * into v_conv
    from public.conversaciones
   where id = p_conversacion_id;

  if not found then
    return;
  end if;

  if not v_is_admin and v_conv.paciente_id <> public.current_paciente_id() then
    return;
  end if;

  update public.mensajes
     set read_at = now()
   where conversation_id = p_conversacion_id
     and sender_user_id <> v_uid
     and read_at is null;

  if v_is_admin then
    update public.conversaciones
       set unread_admin = 0
     where id = p_conversacion_id;
  else
    update public.conversaciones
       set unread_paciente = 0
     where id = p_conversacion_id;
  end if;
end;
$$;

revoke all on function public.chat_marcar_leidos(uuid) from public;
grant execute on function public.chat_marcar_leidos(uuid) to authenticated;
