-- =============================================================================
-- 0013_chat_rgpd_preferencias.sql
--
-- 1. Adjuntos de chat (archivos + audios).
-- 2. Notas del paciente sobre una cita (visibles para Almudena).
-- 3. Peticiones RGPD (exportar / borrar / rectificar).
-- 4. Extensiones de preferencias (UI) en public.notificaciones_prefs.
-- 5. Buckets de Storage: chat-adjuntos, avatares, paciente-adjuntos.
-- =============================================================================

begin;

-- =============================================================================
-- 1. Adjuntos de conversación (imágenes, PDFs, audios, etc.)
--    Cada adjunto referencia un mensaje (ya presente). Un mensaje puede tener
--    N adjuntos (para envíos agrupados). Body queda vacío si el mensaje es
--    "solo adjunto".
-- =============================================================================

create table if not exists public.mensajes_adjuntos (
  id               uuid primary key default gen_random_uuid(),
  mensaje_id       uuid not null references public.mensajes(id) on delete cascade,
  storage_path     text not null,                          -- bucket chat-adjuntos
  nombre           text not null,
  mime             text,
  size_bytes       bigint,
  tipo             text not null default 'archivo'
                     check (tipo in ('archivo','imagen','audio','video')),
  duracion_ms      integer,                                -- solo audio/video
  transcripcion_ciphertext text,                           -- opcional futura
  created_at       timestamptz not null default now()
);

create index if not exists mensajes_adjuntos_mensaje_idx on public.mensajes_adjuntos(mensaje_id);

alter table public.mensajes_adjuntos enable row level security;

-- Admin: acceso total a los adjuntos de cualquier conversación
drop policy if exists "chat_adj_admin_all" on public.mensajes_adjuntos;
create policy "chat_adj_admin_all"
  on public.mensajes_adjuntos
  for all to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'admin')
  with check ((select role from public.profiles where id = auth.uid()) = 'admin');

-- Paciente: solo adjuntos de mensajes de su conversación
drop policy if exists "chat_adj_paciente_own" on public.mensajes_adjuntos;
create policy "chat_adj_paciente_own"
  on public.mensajes_adjuntos
  for select to authenticated
  using (
    mensaje_id in (
      select m.id
      from public.mensajes m
      join public.conversaciones c on c.id = m.conversation_id
      join public.pacientes p on p.id = c.paciente_id
      where p.user_id = auth.uid()
    )
  );

-- Paciente: puede insertar adjuntos para mensajes propios
drop policy if exists "chat_adj_paciente_insert" on public.mensajes_adjuntos;
create policy "chat_adj_paciente_insert"
  on public.mensajes_adjuntos
  for insert to authenticated
  with check (
    mensaje_id in (
      select m.id
      from public.mensajes m
      where m.sender_user_id = auth.uid()
    )
  );

-- =============================================================================
-- 2. Notas del paciente sobre una cita (anticipar lo que quiere tratar)
--
--    El paciente crea/edita/borra notas de sus propias citas antes de la
--    sesión. Almudena las lee como parte del briefing pre-sesión.
--    Body cifrado: el paciente puede exponer contenidos sensibles.
-- =============================================================================

create table if not exists public.citas_notas_paciente (
  id                 uuid primary key default gen_random_uuid(),
  cita_id            uuid not null references public.citas(id) on delete cascade,
  paciente_id        uuid not null references public.pacientes(id) on delete cascade,
  autor_user_id      uuid not null references public.profiles(id) on delete set null,
  contenido_ciphertext text not null,
  activo             boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists citas_notas_paciente_cita_idx on public.citas_notas_paciente(cita_id);
create index if not exists citas_notas_paciente_pac_idx  on public.citas_notas_paciente(paciente_id);

alter table public.citas_notas_paciente enable row level security;

drop policy if exists "cnp_admin_read"          on public.citas_notas_paciente;
drop policy if exists "cnp_paciente_read_own"   on public.citas_notas_paciente;
drop policy if exists "cnp_paciente_insert_own" on public.citas_notas_paciente;
drop policy if exists "cnp_paciente_update_own" on public.citas_notas_paciente;
drop policy if exists "cnp_paciente_delete_own" on public.citas_notas_paciente;

-- Admin: solo lectura (no debería crear notas en nombre del paciente)
create policy "cnp_admin_read"
  on public.citas_notas_paciente
  for select to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'admin');

-- Paciente: CRUD completo sobre sus propias notas
create policy "cnp_paciente_read_own"
  on public.citas_notas_paciente
  for select to authenticated
  using (
    paciente_id in (select id from public.pacientes where user_id = auth.uid())
  );

create policy "cnp_paciente_insert_own"
  on public.citas_notas_paciente
  for insert to authenticated
  with check (
    paciente_id in (select id from public.pacientes where user_id = auth.uid())
    and autor_user_id = auth.uid()
  );

create policy "cnp_paciente_update_own"
  on public.citas_notas_paciente
  for update to authenticated
  using (autor_user_id = auth.uid())
  with check (autor_user_id = auth.uid());

create policy "cnp_paciente_delete_own"
  on public.citas_notas_paciente
  for delete to authenticated
  using (autor_user_id = auth.uid());

-- trigger updated_at
create or replace function public.tg_citas_notas_paciente_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists tg_citas_notas_paciente_touch on public.citas_notas_paciente;
create trigger tg_citas_notas_paciente_touch
  before update on public.citas_notas_paciente
  for each row execute function public.tg_citas_notas_paciente_touch();

-- =============================================================================
-- 3. Peticiones RGPD (exportación, borrado, rectificación, oposición, …)
--
--    El paciente inicia una petición desde /portal/ajustes. La Edge Function
--    `rgpd-request` (F5) crea la fila y notifica al admin por email. El admin
--    la resuelve desde /admin/configuracion marcándola como `resuelta`.
-- =============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'rgpd_tipo') then
    create type public.rgpd_tipo as enum ('exportar','borrado','rectificar','oposicion','portabilidad','limitacion');
  end if;
  if not exists (select 1 from pg_type where typname = 'rgpd_estado') then
    create type public.rgpd_estado as enum ('pendiente','en_revision','resuelta','rechazada','expirada');
  end if;
end$$;

create table if not exists public.rgpd_requests (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  tipo           public.rgpd_tipo   not null,
  estado         public.rgpd_estado not null default 'pendiente',
  motivo         text,
  payload        jsonb not null default '{}'::jsonb,   -- metadata anexa (identidad verificada, etc.)
  resolucion     text,                                  -- nota del admin al cerrar
  fecha_limite   date not null default (current_date + interval '30 days')::date, -- RGPD exige <30 días
  resuelta_por   uuid references public.profiles(id) on delete set null,
  resuelta_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists rgpd_requests_user_idx   on public.rgpd_requests(user_id);
create index if not exists rgpd_requests_estado_idx on public.rgpd_requests(estado);
create index if not exists rgpd_requests_fecha_idx  on public.rgpd_requests(created_at desc);

alter table public.rgpd_requests enable row level security;

drop policy if exists "rgpd_admin_all"         on public.rgpd_requests;
drop policy if exists "rgpd_user_select_own"   on public.rgpd_requests;
drop policy if exists "rgpd_user_insert_own"   on public.rgpd_requests;

create policy "rgpd_admin_all"
  on public.rgpd_requests
  for all to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'admin')
  with check ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "rgpd_user_select_own"
  on public.rgpd_requests
  for select to authenticated
  using (user_id = auth.uid());

create policy "rgpd_user_insert_own"
  on public.rgpd_requests
  for insert to authenticated
  with check (user_id = auth.uid());

create or replace function public.tg_rgpd_requests_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists tg_rgpd_requests_touch on public.rgpd_requests;
create trigger tg_rgpd_requests_touch
  before update on public.rgpd_requests
  for each row execute function public.tg_rgpd_requests_touch();

-- =============================================================================
-- 4. Extensiones a notificaciones_prefs para soportar toggles UI de cuenta
--    - tema (para sincronizar preferencia entre dispositivos)
--    - privacy_mode (blur por defecto en panel admin)
--    - sound (sonidos de chat)
--    - desktop_notifications (permiso browser)
-- =============================================================================

alter table public.notificaciones_prefs
  add column if not exists tema                   text not null default 'system'
    check (tema in ('light','dark','system')),
  add column if not exists privacy_mode_default   boolean not null default false,
  add column if not exists sound                  boolean not null default true,
  add column if not exists desktop_notifications  boolean not null default false,
  add column if not exists chat_nuevo_mensaje     boolean not null default true,
  add column if not exists marketing              boolean not null default false;

-- =============================================================================
-- 5. Storage buckets (idempotente vía insert … on conflict)
--    - chat-adjuntos: privado, 25 MB máx por archivo, imagen/pdf/audio/video
--    - avatares: público lectura, 5 MB
--    - paciente-adjuntos: privado total (informes clínicos)
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('chat-adjuntos',     'chat-adjuntos',     false, 26214400,
     array['image/png','image/jpeg','image/webp','image/heic',
           'application/pdf',
           'audio/webm','audio/ogg','audio/mpeg','audio/mp4','audio/wav',
           'video/mp4','video/webm']),
  ('avatares',          'avatares',          true,  5242880,
     array['image/png','image/jpeg','image/webp']),
  ('paciente-adjuntos', 'paciente-adjuntos', false, 52428800,
     array['image/png','image/jpeg','image/webp','application/pdf'])
on conflict (id) do update set
  public              = excluded.public,
  file_size_limit     = excluded.file_size_limit,
  allowed_mime_types  = excluded.allowed_mime_types;

-- ── Políticas de storage ───────────────────────────────────────────────
-- chat-adjuntos: admin full; paciente puede leer/escribir los de su conversación
--   Convención path: <conversacion_id>/<mensaje_id>/<filename>

drop policy if exists "chat_adj_admin_all_storage" on storage.objects;
create policy "chat_adj_admin_all_storage"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'chat-adjuntos'
    and (select role from public.profiles where id = auth.uid()) = 'admin'
  )
  with check (
    bucket_id = 'chat-adjuntos'
    and (select role from public.profiles where id = auth.uid()) = 'admin'
  );

drop policy if exists "chat_adj_paciente_read_own_storage" on storage.objects;
create policy "chat_adj_paciente_read_own_storage"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'chat-adjuntos'
    and exists (
      select 1
      from public.conversaciones c
      join public.pacientes p on p.id = c.paciente_id
      where p.user_id = auth.uid()
        and split_part(storage.objects.name, '/', 1) = c.id::text
    )
  );

drop policy if exists "chat_adj_paciente_insert_own_storage" on storage.objects;
create policy "chat_adj_paciente_insert_own_storage"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'chat-adjuntos'
    and exists (
      select 1
      from public.conversaciones c
      join public.pacientes p on p.id = c.paciente_id
      where p.user_id = auth.uid()
        and split_part(storage.objects.name, '/', 1) = c.id::text
    )
  );

-- avatares: lectura pública ya cubierta por el flag public=true.
-- Upload: cada usuario sube SOLO en el path <user_id>/*

drop policy if exists "avatares_user_upload_own_storage" on storage.objects;
create policy "avatares_user_upload_own_storage"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatares'
    and split_part(storage.objects.name, '/', 1) = auth.uid()::text
  );

drop policy if exists "avatares_user_update_own_storage" on storage.objects;
create policy "avatares_user_update_own_storage"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatares'
    and split_part(storage.objects.name, '/', 1) = auth.uid()::text
  );

drop policy if exists "avatares_user_delete_own_storage" on storage.objects;
create policy "avatares_user_delete_own_storage"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatares'
    and split_part(storage.objects.name, '/', 1) = auth.uid()::text
  );

-- paciente-adjuntos: solo admin. Convención path: <paciente_id>/<archivo>

drop policy if exists "paciente_adj_admin_all_storage" on storage.objects;
create policy "paciente_adj_admin_all_storage"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'paciente-adjuntos'
    and (select role from public.profiles where id = auth.uid()) = 'admin'
  )
  with check (
    bucket_id = 'paciente-adjuntos'
    and (select role from public.profiles where id = auth.uid()) = 'admin'
  );

drop policy if exists "paciente_adj_paciente_read_own_storage" on storage.objects;
create policy "paciente_adj_paciente_read_own_storage"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'paciente-adjuntos'
    and exists (
      select 1
      from public.pacientes p
      where p.user_id = auth.uid()
        and split_part(storage.objects.name, '/', 1) = p.id::text
    )
  );

commit;
