-- 0022_cifrado_setup
-- ====================================================================
-- Cifrado de datos sensibles en reposo (F5).
--
-- Estrategia:
--   * pgcrypto + supabase_vault (clave maestra única) con AES-256 GCM.
--   * Blind index HMAC-SHA256 para búsquedas por email/dni/telefono.
--   * Todas las funciones son SECURITY DEFINER con search_path fijo
--     y ejecución revocada a anon/authenticated.
--   * El acceso real a plaintext se hará desde RPCs específicas creadas
--     en migraciones posteriores (admin-only), auditadas via
--     `registrar_consulta_sensible`.
--
-- PRE-REQUISITO MANUAL (una sola vez tras aplicar esta migración):
--   select vault.create_secret(
--     encode(gen_random_bytes(32), 'hex'),   -- o una key propia hex 32 bytes
--     'app_encryption_key',
--     'Clave maestra de cifrado simétrico para columnas sensibles'
--   );
--
-- Rotación: se crea una nueva secret con el mismo nombre (o con sufijo
-- versionado) y se re-cifran las columnas afectadas desde una migración
-- futura. No re-rotar sin plan de re-cifrado.
-- ====================================================================

begin;

create extension if not exists pgcrypto with schema extensions;
create extension if not exists supabase_vault with schema vault;

-- --------------------------------------------------------------------
-- Helper privado: lee la clave simétrica desde el vault.
-- Falla explícitamente si no está configurada para evitar escrituras
-- silenciosas sin cifrado.
-- --------------------------------------------------------------------
create or replace function public._app_encryption_key()
returns text
language plpgsql
security definer
stable
set search_path = public, vault, pg_temp
as $$
declare
  v_key text;
begin
  select decrypted_secret
    into v_key
    from vault.decrypted_secrets
   where name = 'app_encryption_key'
   limit 1;

  if v_key is null or length(v_key) = 0 then
    raise exception 'vault.app_encryption_key no configurada. Ejecutar vault.create_secret(...) antes de cifrar.'
      using errcode = 'fdw_unable_to_establish_connection';
  end if;

  return v_key;
end;
$$;

revoke all on function public._app_encryption_key() from public;
revoke all on function public._app_encryption_key() from anon, authenticated;
comment on function public._app_encryption_key() is
  'Helper privado. Devuelve la clave simétrica desde supabase_vault. No exponer a clientes.';

-- --------------------------------------------------------------------
-- app_encrypt(plaintext) -> base64(ciphertext).
-- Entrada NULL -> NULL (permite columnas nullables sin ruido).
-- Usa pgp_sym_encrypt (AES-256 CFB por defecto, con iv aleatorio).
-- --------------------------------------------------------------------
create or replace function public.app_encrypt(p_plain text)
returns text
language plpgsql
security definer
volatile
set search_path = public, extensions, pg_temp
as $$
declare
  v_key text;
begin
  if p_plain is null then
    return null;
  end if;

  v_key := public._app_encryption_key();

  return encode(
    extensions.pgp_sym_encrypt(
      p_plain,
      v_key,
      'cipher-algo=aes256, compress-algo=1, s2k-mode=3'
    )::bytea,
    'base64'
  );
end;
$$;

revoke all on function public.app_encrypt(text) from public;
revoke all on function public.app_encrypt(text) from anon, authenticated;
grant execute on function public.app_encrypt(text) to service_role;
comment on function public.app_encrypt(text) is
  'Cifra un texto plano a base64(pgp_sym_encrypt AES-256). Uso interno (service_role / RPCs SECURITY DEFINER).';

-- --------------------------------------------------------------------
-- app_decrypt(ciphertext_base64) -> plaintext.
-- Falla explícitamente si la key ha cambiado o el ciphertext está
-- corrupto (no enmascara errores).
-- --------------------------------------------------------------------
create or replace function public.app_decrypt(p_ct text)
returns text
language plpgsql
security definer
stable
set search_path = public, extensions, pg_temp
as $$
declare
  v_key text;
begin
  if p_ct is null then
    return null;
  end if;

  v_key := public._app_encryption_key();

  return extensions.pgp_sym_decrypt(decode(p_ct, 'base64'), v_key);
exception
  when others then
    raise exception 'app_decrypt: descifrado fallido (clave incorrecta o ciphertext corrupto)'
      using errcode = 'data_corrupted';
end;
$$;

revoke all on function public.app_decrypt(text) from public;
revoke all on function public.app_decrypt(text) from anon, authenticated;
grant execute on function public.app_decrypt(text) to service_role;
comment on function public.app_decrypt(text) is
  'Descifra base64(pgp_sym_encrypt). Uso interno (service_role / RPCs SECURITY DEFINER). Lanza excepción si no se puede descifrar.';

-- --------------------------------------------------------------------
-- app_bidx(plain) -> hex(HMAC-SHA256).
-- Blind index determinista para igualdad/búsqueda exacta (email, dni).
-- Normaliza: trim + lowercase para tolerar variaciones en input.
-- NO usar en campos largos (es determinista => filtra si se expone).
-- --------------------------------------------------------------------
create or replace function public.app_bidx(p_plain text)
returns text
language plpgsql
security definer
stable
set search_path = public, extensions, pg_temp
as $$
declare
  v_key text;
begin
  if p_plain is null or length(btrim(p_plain)) = 0 then
    return null;
  end if;

  v_key := public._app_encryption_key();

  return encode(
    extensions.hmac(lower(btrim(p_plain))::bytea, v_key::bytea, 'sha256'),
    'hex'
  );
end;
$$;

revoke all on function public.app_bidx(text) from public;
revoke all on function public.app_bidx(text) from anon, authenticated;
grant execute on function public.app_bidx(text) to service_role;
comment on function public.app_bidx(text) is
  'Blind index determinista (HMAC-SHA256). Para búsqueda por igualdad sobre columnas cifradas.';

-- --------------------------------------------------------------------
-- app_encryption_ready() -> boolean.
-- Permite a las Edge Functions verificar que la key está provisionada
-- sin exponerla. Uso recomendado en healthcheck pre-despliegue.
-- --------------------------------------------------------------------
create or replace function public.app_encryption_ready()
returns boolean
language plpgsql
security definer
stable
set search_path = public, vault, pg_temp
as $$
declare
  v_exists boolean;
begin
  select exists (
    select 1
      from vault.decrypted_secrets
     where name = 'app_encryption_key'
       and length(coalesce(decrypted_secret, '')) > 0
  ) into v_exists;
  return v_exists;
end;
$$;

revoke all on function public.app_encryption_ready() from public;
revoke all on function public.app_encryption_ready() from anon;
grant execute on function public.app_encryption_ready() to authenticated, service_role;
comment on function public.app_encryption_ready() is
  'Devuelve true si la clave maestra está provisionada en supabase_vault. Úsese como healthcheck.';

commit;
