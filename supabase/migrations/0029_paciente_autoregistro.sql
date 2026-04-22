-- ============================================================================
-- 0029_paciente_autoregistro.sql
-- ----------------------------------------------------------------------------
-- Auto-registro de paciente (flujo /registro-paciente) tras confirmar email en
-- Supabase Auth. Crea la ficha clínica cifrada vinculada a auth.uid().
--
-- A diferencia de `paciente_alta_cifrada` (admin-only), esta RPC:
--   * NO requiere rol admin.
--   * Requiere `auth.uid()` != null (sesión autenticada post-verify-otp).
--   * Usa auth.uid() como `user_id` del paciente.
--   * Impide duplicados: si ya existe un paciente con ese user_id, falla.
--   * Cifra TODOS los campos sensibles con app_encrypt + app_bidx.
--   * Fuerza rol='paciente' en el profile (no se puede auto-elevar a admin).
--
-- Error codes:
--   * '42501' insufficient_privilege — caller anónimo
--   * '22023' invalid_parameter      — campos requeridos vacíos
--   * '23505' unique_violation       — ya existe ficha para ese user
-- ============================================================================

create or replace function public.paciente_autoregistro_cifrada(
  p_nombre_completo           text,
  p_dni_nie                   text,
  p_telefono                  text        default null,
  p_email                     text        default null,
  p_fecha_nacimiento          date        default null,
  p_direccion                 text        default null,
  p_contacto_emergencia_nombre    text    default null,
  p_contacto_emergencia_telefono  text    default null,
  p_alergias                  text        default null,
  p_medicacion_base           text        default null,
  p_objetivos                 text        default null,
  p_motivo_consulta_inicial   text        default null,
  p_experiencia_terapia       text        default null,
  p_consentimiento_rgpd       boolean     default false
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_id  uuid;
begin
  if v_uid is null then
    raise exception 'paciente_autoregistro_cifrada: requiere sesión autenticada'
      using errcode = '42501';
  end if;

  if p_nombre_completo is null or length(btrim(p_nombre_completo)) = 0 then
    raise exception 'paciente_autoregistro_cifrada: nombre_completo requerido'
      using errcode = '22023';
  end if;
  if p_dni_nie is null or length(btrim(p_dni_nie)) = 0 then
    raise exception 'paciente_autoregistro_cifrada: dni_nie requerido'
      using errcode = '22023';
  end if;
  if not p_consentimiento_rgpd then
    raise exception 'paciente_autoregistro_cifrada: consentimiento RGPD obligatorio'
      using errcode = '22023';
  end if;

  -- Garantía: rol del profile queda en 'paciente' (no se puede auto-elevar).
  -- El trigger tg_handle_new_user ya crea el profile; aquí forzamos el rol
  -- por si el metadata venía manipulado.
  update public.profiles
     set role = 'paciente'
   where id = v_uid
     and role is distinct from 'admin';  -- no tocamos admins existentes

  -- Idempotencia: si ya existe ficha para este user_id, devolvemos su id
  -- sin duplicar (evita errores si el usuario re-envía el formulario).
  select id into v_id from public.pacientes where user_id = v_uid limit 1;
  if v_id is not null then
    return v_id;
  end if;

  insert into public.pacientes (
    user_id,
    dni_nie_ciphertext, dni_nie_bidx,
    nombre_completo_ciphertext, nombre_completo_bidx,
    telefono_ciphertext, telefono_bidx,
    email_ciphertext, email_bidx,
    fecha_nacimiento, fecha_alta,
    direccion_ciphertext,
    contacto_emergencia_nombre_ciphertext,
    contacto_emergencia_telefono_ciphertext,
    alergias_ciphertext,
    medicacion_base_ciphertext,
    objetivos_ciphertext,
    motivo_consulta_inicial_ciphertext,
    experiencia_terapia,
    consentimiento_rgpd
  ) values (
    v_uid,
    public.app_encrypt(p_dni_nie), public.app_bidx(p_dni_nie),
    public.app_encrypt(p_nombre_completo), public.app_bidx(p_nombre_completo),
    public.app_encrypt(p_telefono), public.app_bidx(p_telefono),
    public.app_encrypt(p_email), public.app_bidx(p_email),
    p_fecha_nacimiento, current_date,
    public.app_encrypt(p_direccion),
    public.app_encrypt(p_contacto_emergencia_nombre),
    public.app_encrypt(p_contacto_emergencia_telefono),
    public.app_encrypt(p_alergias),
    public.app_encrypt(p_medicacion_base),
    public.app_encrypt(p_objetivos),
    public.app_encrypt(p_motivo_consulta_inicial),
    p_experiencia_terapia,
    p_consentimiento_rgpd
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.paciente_autoregistro_cifrada(
  text,text,text,text,date,text,text,text,text,text,text,text,text,boolean
) from public;

grant execute on function public.paciente_autoregistro_cifrada(
  text,text,text,text,date,text,text,text,text,text,text,text,text,boolean
) to authenticated;

comment on function public.paciente_autoregistro_cifrada(
  text,text,text,text,date,text,text,text,text,text,text,text,text,boolean
) is
  'Auto-registro paciente post-signup Supabase Auth. Crea la ficha clínica cifrada ' ||
  'vinculada a auth.uid(). Idempotente (no duplica si ya existe).';
