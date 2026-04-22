-- ============================================================================
-- 0037_chat_cifrado.sql — Cifrado en reposo de mensajes del chat
-- ----------------------------------------------------------------------------
-- Objetivo: convertir public.mensajes.body_ciphertext en ciphertext REAL
-- (hasta ahora se almacenaba plaintext en una columna con nombre engañoso).
-- Además:
--   * Rewriting `chat_enviar_mensaje` para cifrar antes del INSERT y devolver
--     el plaintext en el campo `body` (útil para UI y optimistic).
--   * Nueva VIEW `v_mensajes_chat` con security_invoker=true que expone `body`
--     descifrado y respeta las RLS de `mensajes`.
--   * Nueva RPC `chat_descifrar_mensaje(id)` para la ruta de realtime (el
--     payload de postgres_changes trae el ciphertext crudo).
--   * Actualiza la VIEW admin `v_conversaciones_admin` para que el preview
--     del último mensaje llegue descifrado.
--
-- Compatibilidad:
--   * No rompe lecturas directas de `mensajes` porque `body_ciphertext` sigue
--     existiendo; simplemente ya no sirve para pintar texto en la UI.
--   * Para mensajes preexistentes, se cifran en bulk en este script (si
--     `app_encryption_ready()` es true). Si la clave aún no está en Vault,
--     la actualización bulk se omite y se hará al ejecutar la 1ª vez en prod.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0) Helper transitorio: intento seguro de descifrado (nulo si falla).
--    Lo usaremos sólo en el backfill para distinguir plaintext de ciphertext.
-- ---------------------------------------------------------------------------
create or replace function public._app_try_decrypt(p_ct text)
returns text
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  if p_ct is null then
    return null;
  end if;
  return public.app_decrypt(p_ct);
exception when others then
  return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1) Backfill: cifrar los mensajes que aún estén en plaintext.
-- ---------------------------------------------------------------------------
do $$
declare
  v_ready  boolean;
  v_count  integer;
begin
  select public.app_encryption_ready() into v_ready;

  if not v_ready then
    raise notice 'app_encryption_key no inicializada en Vault; backfill omitido. Re-ejecutar migración tras inicializar la clave.';
    return;
  end if;

  -- Regla 100% robusta: si NO se puede descifrar, entonces es plaintext y hay
  -- que cifrarlo. Evita falsos positivos por espacios/saltos de línea en la
  -- salida base64 de pgp_sym_encrypt.
  update public.mensajes m
     set body_ciphertext    = public.app_encrypt(m.body_ciphertext),
         encryption_version = 'v1'
   where m.body_ciphertext is not null
     and public._app_try_decrypt(m.body_ciphertext) is null;

  get diagnostics v_count = row_count;
  raise notice 'mensajes cifrados en backfill: %', v_count;
end $$;

-- Helper ya no se necesita. Lo dejamos revocado a public para no exponerlo.
revoke all on function public._app_try_decrypt(text) from public;

-- ---------------------------------------------------------------------------
-- 2) VIEW descifrada para lecturas (UI, admin, bulk)
-- ---------------------------------------------------------------------------
create or replace view public.v_mensajes_chat as
  select
    m.id,
    m.conversation_id,
    m.sender_user_id,
    public.app_decrypt(m.body_ciphertext)  as body,
    m.encryption_version,
    m.read_at,
    m.created_at
  from public.mensajes m;

alter view public.v_mensajes_chat set (security_invoker = true);

grant select on public.v_mensajes_chat to authenticated;

-- ---------------------------------------------------------------------------
-- 3) chat_enviar_mensaje: cifra antes del INSERT, devuelve plaintext.
-- ---------------------------------------------------------------------------
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

  -- Devolvemos el plaintext directamente (ya lo teníamos en memoria)
  return query
    select v_new.id,
           v_new.conversation_id,
           v_new.sender_user_id,
           v_trim,
           v_new.read_at,
           v_new.created_at;
end;
$$;

revoke all on function public.chat_enviar_mensaje(uuid, text) from public;
grant execute on function public.chat_enviar_mensaje(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4) RPC descifrador puntual para realtime
-- ---------------------------------------------------------------------------
create or replace function public.chat_descifrar_mensaje(p_id uuid)
returns table (
  id              uuid,
  conversation_id uuid,
  sender_user_id  uuid,
  body            text,
  read_at         timestamptz,
  created_at      timestamptz
)
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_uid      uuid    := auth.uid();
  v_is_admin boolean := public.is_admin();
  v_row      public.mensajes%rowtype;
  v_conv     public.conversaciones%rowtype;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;

  select * into v_row from public.mensajes where id = p_id;
  if not found then
    raise exception 'not_found' using errcode = 'no_data_found';
  end if;

  select * into v_conv from public.conversaciones where id = v_row.conversation_id;

  if not v_is_admin and v_conv.paciente_id <> public.current_paciente_id() then
    raise exception 'forbidden' using errcode = 'insufficient_privilege';
  end if;

  return query
    select v_row.id,
           v_row.conversation_id,
           v_row.sender_user_id,
           public.app_decrypt(v_row.body_ciphertext),
           v_row.read_at,
           v_row.created_at;
end;
$$;

revoke all on function public.chat_descifrar_mensaje(uuid) from public;
grant execute on function public.chat_descifrar_mensaje(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 5) v_conversaciones_admin: preview último mensaje descifrado
-- ---------------------------------------------------------------------------
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
    public.app_decrypt(um.body_ciphertext) as ultimo_mensaje,
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

-- ---------------------------------------------------------------------------
-- 6) Endurecer: revocar SELECT directo de body_ciphertext a los no-admins no
--    hace falta porque RLS ya filtra rows; pero para minimizar exposición de
--    ciphertext en realtime payloads, dejamos un COMMENT que documente el
--    patrón correcto de consumo desde el cliente.
-- ---------------------------------------------------------------------------
comment on column public.mensajes.body_ciphertext is
  'Ciphertext (pgp_sym_encrypt base64). NO leer directo desde UI; usar v_mensajes_chat o chat_descifrar_mensaje. El realtime expone el ciphertext crudo: el cliente debe llamar a la RPC para obtener el plaintext.';
