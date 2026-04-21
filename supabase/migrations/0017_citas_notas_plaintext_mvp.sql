-- =============================================================================
-- 0017 · Notas de paciente por cita — MVP plaintext
-- =============================================================================
-- Añade columnas en claro para permitir que el paciente cree, edite y borre
-- sus propias notas de sesión desde /portal/citas antes de tener lista la
-- Edge Function de cifrado (encrypt-pii · F5).
--
-- Una vez disponible el cifrado simétrico a nivel de aplicación:
--   1. Backfill: contenido_ciphertext := encrypt(contenido)
--   2. Soltar columna `contenido` (o mantenerla en NULL)
--   3. Restaurar NOT NULL sobre contenido_ciphertext
-- =============================================================================

begin;

alter table public.citas_notas_paciente
  alter column contenido_ciphertext drop not null;

alter table public.citas_notas_paciente
  add column if not exists contenido text;

-- Al menos uno de los dos debe estar presente (defensa contra notas vacías)
alter table public.citas_notas_paciente
  drop constraint if exists citas_notas_paciente_has_content_chk;

alter table public.citas_notas_paciente
  add constraint citas_notas_paciente_has_content_chk
  check (
    (contenido_ciphertext is not null and length(contenido_ciphertext) > 0)
    or
    (contenido is not null and length(contenido) > 0)
  );

commit;
