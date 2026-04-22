-- =====================================================================
-- 0027_ficha_bulk_descifrar.sql
--
-- Añade `paciente_ficha_sensibles_bulk(p_id uuid, p_justificacion text)`
-- que descifra TODOS los campos cifrados de la ficha de un paciente en
-- una sola llamada + registra UNA única fila en admin_lookups con
-- `campo = 'acceso_ficha_completa'`.
--
-- Motivación:
--   La UX pedida es "datos visibles por defecto, admin oculta el que
--   quiera individualmente". Esto requiere descifrar todo al cargar la
--   ficha. Hacer N llamadas a `paciente_revelar_campo` generaría N filas
--   de audit, muy ruidoso. Con esta RPC registramos un único acceso
--   auditable por visita.
--
-- Seguridad:
--   - SECURITY DEFINER + check is_admin() (reutiliza helper existente).
--   - REVOKE ALL FROM PUBLIC + GRANT a authenticated + service_role.
--   - Usa `registrar_consulta_sensible` ya existente para la auditoría.
--
-- Idempotente: CREATE OR REPLACE + REVOKE/GRANT seguros en re-run.
-- =====================================================================

create or replace function public.paciente_ficha_sensibles_bulk(
  p_id             uuid,
  p_justificacion  text default null,
  p_ip             inet default null,
  p_user_agent     text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row record;
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'paciente_ficha_sensibles_bulk: requiere rol admin'
      using errcode = '42501';
  end if;
  if p_id is null then
    raise exception 'paciente_ficha_sensibles_bulk: p_id requerido'
      using errcode = '22023';
  end if;

  select
    public.app_decrypt(p.nombre_completo_ciphertext)              as nombre_completo,
    public.app_decrypt(p.dni_nie_ciphertext)                      as dni_nie,
    public.app_decrypt(p.telefono_ciphertext)                     as telefono,
    public.app_decrypt(p.email_ciphertext)                        as email,
    public.app_decrypt(p.direccion_ciphertext)                    as direccion,
    public.app_decrypt(p.contacto_emergencia_nombre_ciphertext)   as contacto_emergencia_nombre,
    public.app_decrypt(p.contacto_emergencia_telefono_ciphertext) as contacto_emergencia_telefono,
    public.app_decrypt(p.alergias_ciphertext)                     as alergias,
    public.app_decrypt(p.medicacion_base_ciphertext)              as medicacion_base,
    public.app_decrypt(p.objetivos_ciphertext)                    as objetivos,
    public.app_decrypt(p.motivo_consulta_ciphertext)              as motivo_consulta,
    public.app_decrypt(p.motivo_consulta_inicial_ciphertext)      as motivo_consulta_inicial,
    public.app_decrypt(p.preferencias_clinicas_ciphertext)        as preferencias_clinicas
  into v_row
  from public.pacientes p
  where p.id = p_id;

  if v_row is null then
    raise exception 'paciente_ficha_sensibles_bulk: paciente no encontrado'
      using errcode = '42704';
  end if;

  -- Una única entrada de auditoría por visita.
  perform public.registrar_consulta_sensible(
    p_id,
    'acceso_ficha_completa',
    p_justificacion,
    p_ip,
    p_user_agent
  );

  v_result := jsonb_build_object(
    'nombre_completo',              v_row.nombre_completo,
    'dni_nie',                      v_row.dni_nie,
    'telefono',                     v_row.telefono,
    'email',                        v_row.email,
    'direccion',                    v_row.direccion,
    'contacto_emergencia_nombre',   v_row.contacto_emergencia_nombre,
    'contacto_emergencia_telefono', v_row.contacto_emergencia_telefono,
    'alergias',                     v_row.alergias,
    'medicacion_base',              v_row.medicacion_base,
    'objetivos',                    v_row.objetivos,
    'motivo_consulta',              v_row.motivo_consulta,
    'motivo_consulta_inicial',      v_row.motivo_consulta_inicial,
    'preferencias_clinicas',        v_row.preferencias_clinicas
  );

  return v_result;
end;
$$;

revoke all on function public.paciente_ficha_sensibles_bulk(uuid, text, inet, text) from public;
grant execute on function public.paciente_ficha_sensibles_bulk(uuid, text, inet, text) to authenticated, service_role;

comment on function public.paciente_ficha_sensibles_bulk(uuid, text, inet, text) is
  '[0027] Descifra la ficha sensible del paciente y registra UN acceso en admin_lookups (RGPD art. 30). Solo admin.';
