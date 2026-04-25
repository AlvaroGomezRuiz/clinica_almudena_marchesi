-- 0053 — Descifrado en vistas de chat con security_invoker
-- -----------------------------------------------------------------------------
-- Problema: v_mensajes_chat y v_conversaciones_admin llaman a app_decrypt() en
-- el SELECT. Con security_invoker=true el rol es "authenticated", pero
-- app_decrypt solo tenía GRANT a service_role → PostgREST devolvía error /
-- filas vacías aunque chat_enviar_mensaje insertara bien (SECURITY DEFINER).
--
-- Solución: funciones STABLE SECURITY DEFINER que replican la autorización de
-- chat_descifrar_mensaje / política de conversación y delegan en app_decrypt.
-- -----------------------------------------------------------------------------

-- Cuerpo de un mensaje ya visible por RLS; defensa en profundidad por id.
create or replace function public.chat_body_plain_for_mensaje(p_mensaje_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare
  v_uid      uuid := auth.uid();
  v_is_admin boolean := public.is_admin();
  v_row      public.mensajes%rowtype;
  v_conv     public.conversaciones%rowtype;
begin
  if v_uid is null then
    return null;
  end if;

  select * into v_row from public.mensajes where id = p_mensaje_id;
  if not found then
    return null;
  end if;

  select * into v_conv from public.conversaciones where id = v_row.conversation_id;
  if not found then
    return null;
  end if;

  if not v_is_admin and v_conv.paciente_id is distinct from public.current_paciente_id() then
    return null;
  end if;

  if v_row.body_ciphertext is null then
    return null;
  end if;

  return public.app_decrypt(v_row.body_ciphertext);
exception
  when others then
    return null;
end;
$fn$;

revoke all on function public.chat_body_plain_for_mensaje(uuid) from public;
grant execute on function public.chat_body_plain_for_mensaje(uuid) to authenticated;

comment on function public.chat_body_plain_for_mensaje(uuid) is
  'Descifra body de un mensaje si el invocador es admin o paciente de la conversación. Para v_mensajes_chat (security_invoker).';


-- Preview último mensaje (admin bandeja): ciphertext + conversación
create or replace function public.chat_preview_plain_for_conversacion(
  p_body_ciphertext text,
  p_conversacion_id   uuid
)
returns text
language plpgsql
stable
security definer
set search_path = public
as $fn2$
declare
  v_uid      uuid := auth.uid();
  v_is_admin boolean := public.is_admin();
  v_conv     public.conversaciones%rowtype;
begin
  if v_uid is null or p_conversacion_id is null then
    return null;
  end if;

  if p_body_ciphertext is null or length(btrim(p_body_ciphertext)) = 0 then
    return null;
  end if;

  select * into v_conv from public.conversaciones where id = p_conversacion_id;
  if not found then
    return null;
  end if;

  if not v_is_admin and v_conv.paciente_id is distinct from public.current_paciente_id() then
    return null;
  end if;

  return public.app_decrypt(p_body_ciphertext);
exception
  when others then
    return null;
end;
$fn2$;

revoke all on function public.chat_preview_plain_for_conversacion(text, uuid) from public;
grant execute on function public.chat_preview_plain_for_conversacion(text, uuid) to authenticated;

comment on function public.chat_preview_plain_for_conversacion(text, uuid) is
  'Descifra preview del último mensaje si el invocador puede ver esa conversación.';


create or replace view public.v_mensajes_chat as
  select
    m.id,
    m.conversation_id,
    m.sender_user_id,
    public.chat_body_plain_for_mensaje(m.id) as body,
    m.encryption_version,
    m.read_at,
    m.created_at
  from public.mensajes m;

alter view public.v_mensajes_chat set (security_invoker = true);

grant select on public.v_mensajes_chat to authenticated;


create or replace view public.v_conversaciones_admin as
  select
    c.id,
    c.paciente_id,
    p.user_id                            as paciente_user_id,
    pr.display_name                      as paciente_display_name,
    pr.email                             as paciente_email,
    c.last_message_at,
    c.unread_admin,
    c.unread_paciente,
    c.estado,
    public.chat_preview_plain_for_conversacion(um.body_ciphertext, c.id) as ultimo_mensaje,
    um.created_at                        as ultimo_mensaje_en,
    um.sender_user_id                    as ultimo_mensaje_autor,
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
