-- ============================================================================
-- 0032_fix_registro_clinico_descifrar.sql
-- ----------------------------------------------------------------------------
-- BUGFIX CRÍTICO (detectado 22-abr-2026 · hito 14 E2E test):
--   `registro_clinico_descifrar` usaba `CASE (p_tabla, p_campo) WHEN (...)`
--   con tuplas text/unknown → PostgreSQL lanza 42804
--   "cannot compare dissimilar column types text and unknown".
--
--   Impacto: 100% de lecturas de notas cifradas de cita, diagnósticos
--   y medicación fallaban desde el panel admin.
--
--   Fix: reescribir con IF/ELSIF sobre comparaciones text = text.
-- ============================================================================

create or replace function public.registro_clinico_descifrar(
  p_tabla          text,
  p_registro_id    uuid,
  p_campo          text,
  p_paciente_id    uuid default null::uuid,
  p_justificacion  text default null::text
)
returns text
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_ct text;
begin
  if not public.is_admin() then
    raise exception 'registro_clinico_descifrar: requiere rol admin'
      using errcode = '42501';
  end if;

  if p_tabla = 'paciente_diagnosticos' and p_campo = 'titulo' then
    select titulo_ciphertext into v_ct
      from public.paciente_diagnosticos where id = p_registro_id;
  elsif p_tabla = 'paciente_diagnosticos' and p_campo = 'notas' then
    select notas_ciphertext into v_ct
      from public.paciente_diagnosticos where id = p_registro_id;
  elsif p_tabla = 'paciente_medicacion' and p_campo = 'notas' then
    select notas_ciphertext into v_ct
      from public.paciente_medicacion where id = p_registro_id;
  elsif p_tabla = 'citas_notas_paciente' and p_campo = 'contenido' then
    select contenido_ciphertext into v_ct
      from public.citas_notas_paciente where id = p_registro_id;
  else
    raise exception 'registro_clinico_descifrar: combinacion tabla=% campo=% no permitida',
      p_tabla, p_campo using errcode = '22023';
  end if;

  if p_justificacion is not null and p_paciente_id is not null then
    perform public.registrar_consulta_sensible(
      p_paciente_id,
      p_tabla || '.' || p_campo,
      p_justificacion,
      null,
      null
    );
  end if;

  return public.app_decrypt(v_ct);
end;
$function$;
