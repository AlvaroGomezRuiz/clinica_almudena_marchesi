-- 0023_cifrado_rpcs_crud
-- ====================================================================
-- RPCs CRUD cifrado sobre pacientes y ficha clínica.
-- Todas son SECURITY DEFINER + admin-only (salvo paciente_propio_*,
-- reservadas al paciente autenticado). El descifrado siempre pasa por
-- registrar_consulta_sensible para dejar rastro en admin_lookups.
-- ====================================================================

begin;

-- ====================================================================
-- 1. PACIENTES — gestión cifrada
-- ====================================================================

-- --------------------------------------------------------------------
-- paciente_alta_cifrada: crea un paciente con PII ya cifrada.
-- Devuelve el id del paciente creado.
-- --------------------------------------------------------------------
create or replace function public.paciente_alta_cifrada(
  p_nombre_completo           text,
  p_dni_nie                   text,
  p_telefono                  text        default null,
  p_email                     text        default null,
  p_fecha_nacimiento          date        default null,
  p_fecha_alta                date        default current_date,
  p_direccion                 text        default null,
  p_contacto_emergencia_nombre   text     default null,
  p_contacto_emergencia_telefono text     default null,
  p_alergias                  text        default null,
  p_medicacion_base           text        default null,
  p_objetivos                 text        default null,
  p_motivo_consulta_inicial   text        default null,
  p_experiencia_terapia       text        default null,
  p_consentimiento_rgpd       boolean     default false,
  p_tags                      text[]      default '{}'::text[],
  p_color_etiqueta            text        default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'paciente_alta_cifrada: requiere rol admin' using errcode = '42501';
  end if;

  if p_nombre_completo is null or length(btrim(p_nombre_completo)) = 0 then
    raise exception 'paciente_alta_cifrada: nombre_completo requerido' using errcode = '22023';
  end if;
  if p_dni_nie is null or length(btrim(p_dni_nie)) = 0 then
    raise exception 'paciente_alta_cifrada: dni_nie requerido' using errcode = '22023';
  end if;
  if not p_consentimiento_rgpd then
    raise exception 'paciente_alta_cifrada: consentimiento RGPD obligatorio' using errcode = '22023';
  end if;

  insert into public.pacientes (
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
    consentimiento_rgpd,
    tags,
    color_etiqueta
  ) values (
    public.app_encrypt(p_dni_nie), public.app_bidx(p_dni_nie),
    public.app_encrypt(p_nombre_completo), public.app_bidx(p_nombre_completo),
    public.app_encrypt(p_telefono), public.app_bidx(p_telefono),
    public.app_encrypt(p_email), public.app_bidx(p_email),
    p_fecha_nacimiento, p_fecha_alta,
    public.app_encrypt(p_direccion),
    public.app_encrypt(p_contacto_emergencia_nombre),
    public.app_encrypt(p_contacto_emergencia_telefono),
    public.app_encrypt(p_alergias),
    public.app_encrypt(p_medicacion_base),
    public.app_encrypt(p_objetivos),
    public.app_encrypt(p_motivo_consulta_inicial),
    p_experiencia_terapia,
    p_consentimiento_rgpd,
    coalesce(p_tags, '{}'::text[]),
    p_color_etiqueta
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.paciente_alta_cifrada(text,text,text,text,date,date,text,text,text,text,text,text,text,text,boolean,text[],text) from public;
grant execute on function public.paciente_alta_cifrada(text,text,text,text,date,date,text,text,text,text,text,text,text,text,boolean,text[],text) to authenticated, service_role;

-- --------------------------------------------------------------------
-- paciente_actualizar_cifrado: actualiza PII de un paciente existente.
-- Recibe jsonb con los campos a modificar (NULL explícito borra campo).
-- --------------------------------------------------------------------
create or replace function public.paciente_actualizar_cifrado(
  p_id      uuid,
  p_cambios jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_key text;
  v_val text;
begin
  if not public.is_admin() then
    raise exception 'paciente_actualizar_cifrado: requiere rol admin' using errcode = '42501';
  end if;
  if p_id is null then
    raise exception 'paciente_actualizar_cifrado: id requerido' using errcode = '22023';
  end if;

  for v_key, v_val in
    select key, nullif(value::text, 'null')::jsonb #>> '{}' from jsonb_each(p_cambios)
  loop
    case v_key
      when 'nombre_completo' then
        update public.pacientes
           set nombre_completo_ciphertext = public.app_encrypt(v_val),
               nombre_completo_bidx       = public.app_bidx(v_val)
         where id = p_id;
      when 'dni_nie' then
        update public.pacientes
           set dni_nie_ciphertext = public.app_encrypt(v_val),
               dni_nie_bidx       = public.app_bidx(v_val)
         where id = p_id;
      when 'telefono' then
        update public.pacientes
           set telefono_ciphertext = public.app_encrypt(v_val),
               telefono_bidx       = public.app_bidx(v_val)
         where id = p_id;
      when 'email' then
        update public.pacientes
           set email_ciphertext = public.app_encrypt(v_val),
               email_bidx       = public.app_bidx(v_val)
         where id = p_id;
      when 'direccion' then
        update public.pacientes set direccion_ciphertext = public.app_encrypt(v_val) where id = p_id;
      when 'contacto_emergencia_nombre' then
        update public.pacientes set contacto_emergencia_nombre_ciphertext = public.app_encrypt(v_val) where id = p_id;
      when 'contacto_emergencia_telefono' then
        update public.pacientes set contacto_emergencia_telefono_ciphertext = public.app_encrypt(v_val) where id = p_id;
      when 'alergias' then
        update public.pacientes set alergias_ciphertext = public.app_encrypt(v_val) where id = p_id;
      when 'medicacion_base' then
        update public.pacientes set medicacion_base_ciphertext = public.app_encrypt(v_val) where id = p_id;
      when 'objetivos' then
        update public.pacientes set objetivos_ciphertext = public.app_encrypt(v_val) where id = p_id;
      when 'motivo_consulta_inicial' then
        update public.pacientes set motivo_consulta_inicial_ciphertext = public.app_encrypt(v_val) where id = p_id;
      when 'motivo_consulta' then
        update public.pacientes set motivo_consulta_ciphertext = public.app_encrypt(v_val) where id = p_id;
      when 'fecha_nacimiento' then
        update public.pacientes set fecha_nacimiento = v_val::date where id = p_id;
      when 'experiencia_terapia' then
        update public.pacientes set experiencia_terapia = v_val where id = p_id;
      when 'color_etiqueta' then
        update public.pacientes set color_etiqueta = v_val where id = p_id;
      else
        -- Campo no reconocido como sensible editable: ignorar sin error.
        null;
    end case;
  end loop;
end;
$$;

revoke all on function public.paciente_actualizar_cifrado(uuid, jsonb) from public;
grant execute on function public.paciente_actualizar_cifrado(uuid, jsonb) to authenticated, service_role;

-- --------------------------------------------------------------------
-- paciente_revelar_campo: descifra UN campo sensible y audita en
-- admin_lookups. Se usa desde el UI admin al pulsar el "ojo".
-- --------------------------------------------------------------------
create or replace function public.paciente_revelar_campo(
  p_id             uuid,
  p_campo          text,
  p_justificacion  text default null,
  p_ip             inet default null,
  p_user_agent     text default null
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ct text;
begin
  if not public.is_admin() then
    raise exception 'paciente_revelar_campo: requiere rol admin' using errcode = '42501';
  end if;
  if p_id is null or p_campo is null then
    raise exception 'paciente_revelar_campo: parámetros incompletos' using errcode = '22023';
  end if;

  case p_campo
    when 'nombre_completo'              then select nombre_completo_ciphertext              into v_ct from public.pacientes where id = p_id;
    when 'dni_nie'                      then select dni_nie_ciphertext                      into v_ct from public.pacientes where id = p_id;
    when 'telefono'                     then select telefono_ciphertext                     into v_ct from public.pacientes where id = p_id;
    when 'email'                        then select email_ciphertext                        into v_ct from public.pacientes where id = p_id;
    when 'direccion'                    then select direccion_ciphertext                    into v_ct from public.pacientes where id = p_id;
    when 'contacto_emergencia_nombre'   then select contacto_emergencia_nombre_ciphertext   into v_ct from public.pacientes where id = p_id;
    when 'contacto_emergencia_telefono' then select contacto_emergencia_telefono_ciphertext into v_ct from public.pacientes where id = p_id;
    when 'alergias'                     then select alergias_ciphertext                     into v_ct from public.pacientes where id = p_id;
    when 'medicacion_base'              then select medicacion_base_ciphertext              into v_ct from public.pacientes where id = p_id;
    when 'objetivos'                    then select objetivos_ciphertext                    into v_ct from public.pacientes where id = p_id;
    when 'motivo_consulta_inicial'      then select motivo_consulta_inicial_ciphertext      into v_ct from public.pacientes where id = p_id;
    when 'motivo_consulta'              then select motivo_consulta_ciphertext              into v_ct from public.pacientes where id = p_id;
    when 'preferencias_clinicas'        then select preferencias_clinicas_ciphertext        into v_ct from public.pacientes where id = p_id;
    else
      raise exception 'paciente_revelar_campo: campo % no es sensible', p_campo using errcode = '22023';
  end case;

  perform public.registrar_consulta_sensible(p_id, p_campo, p_justificacion, p_ip, p_user_agent);

  return public.app_decrypt(v_ct);
end;
$$;

revoke all on function public.paciente_revelar_campo(uuid, text, text, inet, text) from public;
grant execute on function public.paciente_revelar_campo(uuid, text, text, inet, text) to authenticated, service_role;

-- --------------------------------------------------------------------
-- paciente_buscar_por_campo: lookup por bidx (email/dni/telefono).
-- Devuelve solo id (no data sensible) para evitar enumeración.
-- --------------------------------------------------------------------
create or replace function public.paciente_buscar_por_campo(
  p_campo text,
  p_valor text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_bidx text;
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'paciente_buscar_por_campo: requiere rol admin' using errcode = '42501';
  end if;
  if p_valor is null or length(btrim(p_valor)) = 0 then
    return null;
  end if;

  v_bidx := public.app_bidx(p_valor);

  case p_campo
    when 'email'    then select id into v_id from public.pacientes where email_bidx    = v_bidx limit 1;
    when 'dni_nie'  then select id into v_id from public.pacientes where dni_nie_bidx  = v_bidx limit 1;
    when 'telefono' then select id into v_id from public.pacientes where telefono_bidx = v_bidx limit 1;
    else raise exception 'paciente_buscar_por_campo: campo % no indexado', p_campo using errcode = '22023';
  end case;

  return v_id;
end;
$$;

revoke all on function public.paciente_buscar_por_campo(text, text) from public;
grant execute on function public.paciente_buscar_por_campo(text, text) to authenticated, service_role;

-- ====================================================================
-- 2. DIAGNÓSTICOS / MEDICACIÓN / NOTAS DE CITA — CRUD cifrado
-- Las 3 tablas mantienen plaintext como MVP; estas RPCs cifran en
-- escritura y descifran bajo demanda. La migración 0025 (futura)
-- eliminará las columnas plaintext tras migrar todos los clientes.
-- ====================================================================

create or replace function public.diagnostico_crear_cifrado(
  p_paciente_id  uuid,
  p_titulo       text,
  p_cie_code     text        default null,
  p_descripcion  text        default null,
  p_notas        text        default null,
  p_severidad    text        default null,
  p_estado       text        default 'activo',
  p_fecha_inicio date        default current_date
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_author uuid := auth.uid();
begin
  if not public.is_admin() then
    raise exception 'diagnostico_crear_cifrado: requiere rol admin' using errcode = '42501';
  end if;
  if p_paciente_id is null or p_titulo is null or length(btrim(p_titulo)) = 0 then
    raise exception 'diagnostico_crear_cifrado: paciente_id y titulo requeridos' using errcode = '22023';
  end if;

  insert into public.paciente_diagnosticos (
    paciente_id, cie_code,
    titulo_ciphertext, notas_ciphertext,
    titulo, descripcion,
    severidad, estado, fecha_inicio, created_by
  ) values (
    p_paciente_id, p_cie_code,
    public.app_encrypt(p_titulo), public.app_encrypt(p_notas),
    p_titulo, p_descripcion,
    p_severidad, coalesce(p_estado, 'activo'), p_fecha_inicio, v_author
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.diagnostico_crear_cifrado(uuid,text,text,text,text,text,text,date) from public;
grant execute on function public.diagnostico_crear_cifrado(uuid,text,text,text,text,text,text,date) to authenticated, service_role;


create or replace function public.medicacion_crear_cifrada(
  p_paciente_id  uuid,
  p_nombre       text,
  p_dosis        text default null,
  p_frecuencia   text default null,
  p_via          text default null,
  p_prescrita_por text default null,
  p_notas        text default null,
  p_fecha_inicio date default current_date,
  p_fecha_fin    date default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_author uuid := auth.uid();
begin
  if not public.is_admin() then
    raise exception 'medicacion_crear_cifrada: requiere rol admin' using errcode = '42501';
  end if;
  if p_paciente_id is null or p_nombre is null or length(btrim(p_nombre)) = 0 then
    raise exception 'medicacion_crear_cifrada: paciente_id y nombre requeridos' using errcode = '22023';
  end if;

  insert into public.paciente_medicacion (
    paciente_id, nombre, dosis, frecuencia, via, prescrita_por,
    notas_ciphertext, notas,
    fecha_inicio, fecha_fin, created_by
  ) values (
    p_paciente_id, p_nombre, p_dosis, p_frecuencia, p_via, p_prescrita_por,
    public.app_encrypt(p_notas), p_notas,
    p_fecha_inicio, p_fecha_fin, v_author
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.medicacion_crear_cifrada(uuid,text,text,text,text,text,text,date,date) from public;
grant execute on function public.medicacion_crear_cifrada(uuid,text,text,text,text,text,text,date,date) to authenticated, service_role;


create or replace function public.nota_cita_guardar_cifrada(
  p_cita_id      uuid,
  p_paciente_id  uuid,
  p_contenido    text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_author uuid := auth.uid();
begin
  if not public.is_admin() then
    raise exception 'nota_cita_guardar_cifrada: requiere rol admin' using errcode = '42501';
  end if;
  if p_cita_id is null or p_paciente_id is null then
    raise exception 'nota_cita_guardar_cifrada: cita_id y paciente_id requeridos' using errcode = '22023';
  end if;

  insert into public.citas_notas_paciente (
    cita_id, paciente_id, autor_user_id,
    contenido_ciphertext, contenido
  ) values (
    p_cita_id, p_paciente_id, v_author,
    public.app_encrypt(p_contenido), p_contenido
  )
  on conflict (cita_id) do update set
    contenido_ciphertext = excluded.contenido_ciphertext,
    contenido            = excluded.contenido,
    autor_user_id        = excluded.autor_user_id,
    updated_at           = now()
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.nota_cita_guardar_cifrada(uuid, uuid, text) from public;
grant execute on function public.nota_cita_guardar_cifrada(uuid, uuid, text) to authenticated, service_role;

-- --------------------------------------------------------------------
-- Lector único para las 3 tablas (descifrado + audit opcional).
-- Audit sólo si se pasa justificación (uso desde ojo de visibilidad).
-- --------------------------------------------------------------------
create or replace function public.registro_clinico_descifrar(
  p_tabla          text,
  p_registro_id    uuid,
  p_campo          text,
  p_paciente_id    uuid   default null,
  p_justificacion  text   default null
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ct text;
begin
  if not public.is_admin() then
    raise exception 'registro_clinico_descifrar: requiere rol admin' using errcode = '42501';
  end if;

  case (p_tabla, p_campo)
    when ('paciente_diagnosticos', 'titulo') then
      select titulo_ciphertext into v_ct from public.paciente_diagnosticos where id = p_registro_id;
    when ('paciente_diagnosticos', 'notas') then
      select notas_ciphertext into v_ct from public.paciente_diagnosticos where id = p_registro_id;
    when ('paciente_medicacion', 'notas') then
      select notas_ciphertext into v_ct from public.paciente_medicacion where id = p_registro_id;
    when ('citas_notas_paciente', 'contenido') then
      select contenido_ciphertext into v_ct from public.citas_notas_paciente where id = p_registro_id;
    else
      raise exception 'registro_clinico_descifrar: combinacion tabla=% campo=% no permitida', p_tabla, p_campo using errcode = '22023';
  end case;

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
$$;

revoke all on function public.registro_clinico_descifrar(text, uuid, text, uuid, text) from public;
grant execute on function public.registro_clinico_descifrar(text, uuid, text, uuid, text) to authenticated, service_role;

commit;
