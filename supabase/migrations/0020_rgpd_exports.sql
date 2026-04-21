-- =============================================================================
-- 0020 · Bucket rgpd-exports + columnas para export RGPD
-- =============================================================================
-- Almacena los ZIP/JSON generados por la Edge Function `rgpd-request`.
-- El bucket es privado; se generan signed URLs con expiración (ver EF).
-- =============================================================================

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'rgpd-exports', 'rgpd-exports', false, 52428800, -- 50 MB
  array['application/json', 'application/zip', 'application/octet-stream']
)
on conflict (id) do nothing;

alter table public.rgpd_requests
  add column if not exists export_storage_path text,
  add column if not exists export_expires_at   timestamptz;

-- Policies: solo el service role (Edge Function) escribe; solo el dueño lee
-- vía signed URL (no lectura directa desde el cliente, bucket privado).
drop policy if exists "rgpd_exports_owner_select" on storage.objects;
create policy "rgpd_exports_owner_select" on storage.objects
  for select using (
    bucket_id = 'rgpd-exports'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Service role hace el insert vía EF, no necesitamos policy extra.

commit;
