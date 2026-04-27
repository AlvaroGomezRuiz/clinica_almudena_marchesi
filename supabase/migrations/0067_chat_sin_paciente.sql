-- ============================================================================
-- 0067_chat_sin_paciente.sql
-- ----------------------------------------------------------------------------
-- Permite que cualquier usuario autenticado abra el chat con Almudena,
-- aunque todavía no tenga ficha clínica vinculada (paciente_id nulo).
--
-- Cambios:
--   1. Nueva columna `user_id` en `conversaciones` (FK → profiles) para
--      conversaciones sin ficha clínica aún.
--   2. Hace `paciente_id` nullable en conversaciones.
--   3. Cambia la UNIQUE constraint para cubrir ambos casos.
--   4. Reescribe `chat_mi_conversacion()` para crear la conversación aunque
--      no exista ficha, usando `auth.uid()` directamente.
--   5. Actualiza `chat_enviar_mensaje()` y `chat_marcar_leidos()` para
--      aceptar conversaciones sin paciente.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Añadir columna user_id + hacer paciente_id nullable
-- ---------------------------------------------------------------------------
alter table public.conversaciones
  add column if not exists user_id uuid references public.profiles(id) on delete cascade;

-- Hacer paciente_id nullable (antes era NOT NULL implícito vía FK not-null)
alter table public.conversaciones
  alter column paciente_id drop not null;

-- ---------------------------------------------------------------------------
-- 2. Rellenar user_id en conversaciones existentes (desde pacientes.user_id)
-- ---------------------------------------------------------------------------
update public.conversaciones c
set user_id = pa.user_id
from public.pacientes pa
where pa.id = c.paciente_id
  and c.user_id is null;

-- ---------------------------------------------------------------------------
-- 3. Actualizar constraint UNIQUE: 1 conversación por user_id
-- ---------------------------------------------------------------------------
-- Eliminamos la anterior unique sobre paciente_id
alter table public.conversaciones
  drop constraint if exists conversaciones_paciente_id_key;

-- Nueva: unicidad por user_id (cuando está presente)
create unique index if not exists conversaciones_user_id_uidx
  on public.conversaciones(user_id)
  where user_id is not null;

-- Mantenemos unicidad por paciente_id (para conversaciones legacy con ficha)
create unique index if not exists conversaciones_paciente_id_uidx
  on public.conversaciones(paciente_id)
  where paciente_id is not null;

-- ---------------------------------------------------------------------------
-- 4. Reescribir chat_mi_conversacion()
-- ---------------------------------------------------------------------------
create or replace function public.chat_mi_conversacion()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid         uuid    := auth.uid();
  v_paciente_id uuid    := public.current_paciente_id(); -- puede ser null
  v_conv_id     uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;

  -- Buscar conversación existente: primero por paciente_id, luego por user_id
  if v_paciente_id is not null then
    select id into v_conv_id
      from public.conversaciones
     where paciente_id = v_paciente_id
     limit 1;
  end if;

  if v_conv_id is null then
    select id into v_conv_id
      from public.conversaciones
     where user_id = v_uid
     limit 1;
  end if;

  -- Si no existe, crear una nueva (con o sin ficha clínica)
  if v_conv_id is null then
    insert into public.conversaciones (paciente_id, user_id)
      values (v_paciente_id, v_uid)
      returning id into v_conv_id;
  else
    -- Si ya existe por user_id pero ahora tenemos paciente_id, actualizar
    if v_paciente_id is not null then
      update public.conversaciones
         set paciente_id = v_paciente_id
       where id = v_conv_id
         and paciente_id is null;
    end if;
  end if;

  return v_conv_id;
end;
$$;

revoke all on function public.chat_mi_conversacion() from public;
grant execute on function public.chat_mi_conversacion() to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Actualizar chat_enviar_mensaje() para aceptar conversaciones sin paciente
--    DROP necesario: PostgreSQL no permite cambiar el tipo de retorno con OR REPLACE
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
  body               text,        -- plaintext (igual que v0051)
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

  -- Acepta convs con paciente_id O solo user_id (sin ficha clínica)
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
-- 6. Actualizar chat_marcar_leidos() para conversaciones sin paciente
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

  if not v_is_admin then
    if v_conv.paciente_id is distinct from public.current_paciente_id()
       and v_conv.user_id is distinct from v_uid then
      return;
    end if;
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

-- ---------------------------------------------------------------------------
-- 7. RLS en conversaciones: paciente puede ver la suya (por paciente_id o user_id)
-- ---------------------------------------------------------------------------
drop policy if exists "paciente lee su conversacion" on public.conversaciones;
create policy "paciente lee su conversacion"
  on public.conversaciones for select
  using (
    public.is_admin()
    or paciente_id = public.current_paciente_id()
    or user_id = auth.uid()
  );

drop policy if exists "paciente actualiza su conversacion" on public.conversaciones;
create policy "paciente actualiza su conversacion"
  on public.conversaciones for update
  using (
    public.is_admin()
    or paciente_id = public.current_paciente_id()
    or user_id = auth.uid()
  );
