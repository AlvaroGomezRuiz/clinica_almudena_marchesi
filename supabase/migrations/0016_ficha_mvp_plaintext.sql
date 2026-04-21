-- =============================================================================
-- 0016_ficha_mvp_plaintext.sql
--
-- OBJETIVO
--   Permitir la ficha clínica funcional del MVP ANTES de que esté lista la
--   Edge Function `encrypt-pii` (F5). Añadimos columnas plaintext opcionales
--   para diagnósticos, medicación y contacto de emergencia.
--
--   POLÍTICA TEMPORAL:
--     - Mientras F5 no esté en producción, el frontend escribe en estas
--       columnas plaintext.
--     - Cuando F5 aterrice, una migración posterior (0020_migrate_plaintext_to_cipher.sql)
--       migrará los valores a `*_ciphertext` y hará DROP de las columnas plain.
--
--   Todas las columnas son aditivas y nullables → esta migración es reversible
--   y no rompe compatibilidad con 0012.
-- =============================================================================

begin;

-- ── paciente_diagnosticos: plaintext MVP ──
alter table public.paciente_diagnosticos
  add column if not exists titulo       text,
  add column if not exists descripcion  text,
  alter column titulo_ciphertext drop not null;

-- ── paciente_medicacion: plaintext MVP ──
alter table public.paciente_medicacion
  add column if not exists notas text;

-- ── Auditoría del creador (útil tanto en MVP como en F5) ──
alter table public.paciente_diagnosticos
  add column if not exists created_by uuid references public.profiles(id) on delete set null;
alter table public.paciente_medicacion
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

commit;
