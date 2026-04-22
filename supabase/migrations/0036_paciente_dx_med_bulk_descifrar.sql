-- ============================================================================
-- 0036_paciente_dx_med_bulk_descifrar.sql
-- ----------------------------------------------------------------------------
-- Complemento RGPD (22-abr-2026 · hito 14 E2E test):
--   Tras eliminar el plaintext de DX/medicación en 0034, la UI admin debía
--   descifrar cada DX/medicación por separado (N × RPC registro_clinico_descifrar
--   → N entradas en admin_lookups por cada apertura de ficha).
--
--   Este RPC reúne ambos conjuntos en una sola llamada admin-only y registra
--   UNA sola entrada de auditoría `bulk_export / ficha_admin_ui_dx_med`.
-- ============================================================================

create or replace function public.paciente_dx_med_bulk_descifrar(p_paciente_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_dx  jsonb;
  v_med jsonb;
begin
  if not public.is_admin() then
    raise exception 'paciente_dx_med_bulk_descifrar: requiere rol admin'
      using errcode = '42501';
  end if;
  if p_paciente_id is null then
    raise exception 'paciente_id requerido' using errcode = '22023';
  end if;

  select coalesce(
           jsonb_agg(
             jsonb_build_object(
               'id',           id,
               'titulo',       public.app_decrypt(titulo_ciphertext),
               'notas',        public.app_decrypt(notas_ciphertext),
               'cie_code',     cie_code,
               'severidad',    severidad,
               'estado',       estado,
               'fecha_inicio', fecha_inicio,
               'fecha_fin',    fecha_fin,
               'activo',       activo,
               'created_at',   created_at
             )
             order by created_at desc
           ),
           '[]'::jsonb
         )
    into v_dx
    from public.paciente_diagnosticos
   where paciente_id = p_paciente_id;

  select coalesce(
           jsonb_agg(
             jsonb_build_object(
               'id',            id,
               'nombre',        nombre,
               'dosis',         dosis,
               'frecuencia',    frecuencia,
               'via',           via,
               'prescrita_por', prescrita_por,
               'notas',         public.app_decrypt(notas_ciphertext),
               'fecha_inicio',  fecha_inicio,
               'fecha_fin',     fecha_fin,
               'activo',        activo,
               'created_at',    created_at
             )
             order by created_at desc
           ),
           '[]'::jsonb
         )
    into v_med
    from public.paciente_medicacion
   where paciente_id = p_paciente_id;

  perform public.registrar_consulta_sensible(
    p_paciente_id,
    'bulk_export',
    'ficha_admin_ui_dx_med',
    null,
    null
  );

  return jsonb_build_object('diagnosticos', v_dx, 'medicacion', v_med);
end $$;

grant execute on function public.paciente_dx_med_bulk_descifrar(uuid) to authenticated;
