-- ============================================================================
-- 0031_fix_admin_lookups_campo_check.sql
-- ----------------------------------------------------------------------------
-- BUGFIX CRÍTICO (detectado 22-abr-2026 · hito 14 E2E test):
--   Algunas RPCs (`paciente_ficha_sensibles_bulk`, `registro_clinico_descifrar`)
--   escriben en `admin_lookups.campo` valores que no estaban incluidos en el
--   CHECK original (`'acceso_ficha_completa'`, `'citas_notas_paciente.contenido'`,
--   etc.). Cualquier apertura de ficha o lectura de nota cifrada desde el panel
--   admin reventaba con error 23514.
--
-- Esta migración + 0033 dejan el CHECK definitivo con TODOS los valores
-- realmente emitidos por el código.
-- ============================================================================

alter table public.admin_lookups
  drop constraint if exists admin_lookups_campo_check;

alter table public.admin_lookups
  add constraint admin_lookups_campo_check check (
    campo = any (array[
      -- campos PII de ficha puntuales
      'dni_nie'::text,
      'telefono'::text,
      'email'::text,
      'direccion'::text,
      'contacto_emergencia'::text,
      'contacto_emergencia_nombre'::text,
      'contacto_emergencia_telefono'::text,
      'alergias'::text,
      'medicacion_base'::text,
      'objetivos'::text,
      'motivo_consulta_inicial'::text,
      'experiencia_terapia'::text,
      'nombre_completo'::text,
      'preferencias_clinicas'::text,
      'historial_clinico'::text,
      'diagnostico'::text,
      -- operaciones agregadas / side-channel
      'acceso_ficha_completa'::text,
      'ficha_sensibles_bulk'::text,
      'bulk_export'::text,
      'lectura_nota_admin'::text,
      'registro_clinico'::text,
      -- lecturas ad-hoc de registros clínicos cifrados (tabla.campo)
      'paciente_diagnosticos.titulo'::text,
      'paciente_diagnosticos.notas'::text,
      'paciente_medicacion.notas'::text,
      'citas_notas_paciente.contenido'::text
    ])
  );
