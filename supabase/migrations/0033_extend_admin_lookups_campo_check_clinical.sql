-- ============================================================================
-- 0033_extend_admin_lookups_campo_check_clinical.sql
-- ----------------------------------------------------------------------------
-- Consolida el CHECK `admin_lookups_campo_check` para incluir TODAS las
-- combinaciones `tabla.campo` que `registro_clinico_descifrar` emite al
-- auditar lecturas puntuales de registros clínicos cifrados.
--
-- Esta es la versión definitiva aplicada en producción; se deja independiente
-- de 0031 para facilitar trazabilidad en el changelog.
-- ============================================================================

alter table public.admin_lookups
  drop constraint if exists admin_lookups_campo_check;

alter table public.admin_lookups
  add constraint admin_lookups_campo_check check (
    campo = any (array[
      'dni_nie','telefono','email','direccion',
      'contacto_emergencia','contacto_emergencia_nombre','contacto_emergencia_telefono',
      'alergias','medicacion_base','objetivos',
      'motivo_consulta_inicial','experiencia_terapia','nombre_completo',
      'preferencias_clinicas','historial_clinico','diagnostico',
      'acceso_ficha_completa','ficha_sensibles_bulk','bulk_export',
      'lectura_nota_admin','registro_clinico',
      'paciente_diagnosticos.titulo','paciente_diagnosticos.notas',
      'paciente_medicacion.notas',
      'citas_notas_paciente.contenido'
    ]::text[])
  );
