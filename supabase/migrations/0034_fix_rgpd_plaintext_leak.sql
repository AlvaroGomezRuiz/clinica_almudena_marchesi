-- ============================================================================
-- 0034_fix_rgpd_plaintext_leak.sql
-- ----------------------------------------------------------------------------
-- BUGFIX CRÍTICO RGPD (detectado 22-abr-2026 · hito 14 E2E test):
--
-- 1) Las RPCs `diagnostico_crear_cifrado`, `medicacion_crear_cifrada` y
--    `nota_cita_guardar_cifrada` guardaban **también** el contenido en las
--    columnas plaintext legacy (`titulo`, `descripcion`, `notas`, `contenido`).
--    → Resultado: datos clínicos sensibles exportados en claro a disco/backup.
--
-- 2) Las políticas RLS dejaban al **paciente** leer directamente
--    `paciente_diagnosticos` y `paciente_medicacion` (SELECT por paciente_id).
--    Combinado con #1, el paciente veía sus DX/medicación en plaintext vía
--    PostgREST sin pasar por RPC admin.
--
-- 3) En `citas_notas_paciente` la política paciente filtraba por `paciente_id`,
--    no por `autor_user_id`. El paciente podía leer **las notas de sesión del
--    terapeuta** sobre él mismo (que DEBEN ser confidenciales).
--
-- Fix completo:
--  • RPCs reescritas: solo insertan _ciphertext, NUNCA tocan columnas plaintext.
--  • Se nullifican plaintexts residuales (preservamos notas de paciente auto-
--    redactadas: autor ≠ admin).
--  • Drop de las policies de SELECT directa para paciente en DX/medicación.
--  • cnp_paciente_read_own recreada: `autor_user_id = auth.uid()`.
-- ============================================================================

-- 1. RPCs sin plaintext leak
create or replace function public.diagnostico_crear_cifrado(
  p_paciente_id uuid, p_titulo text, p_cie_code text default null,
  p_descripcion text default null, p_notas text default null,
  p_severidad text default null, p_estado text default 'activo',
  p_fecha_inicio date default current_date
) returns uuid language plpgsql security definer set search_path to 'public','pg_temp' as $$
declare v_id uuid; v_author uuid := auth.uid();
begin
  if not public.is_admin() then
    raise exception 'diagnostico_crear_cifrado: requiere rol admin' using errcode='42501';
  end if;
  if p_paciente_id is null or p_titulo is null or length(btrim(p_titulo))=0 then
    raise exception 'diagnostico_crear_cifrado: paciente_id y titulo requeridos' using errcode='22023';
  end if;
  insert into public.paciente_diagnosticos (
    paciente_id, cie_code, titulo_ciphertext, notas_ciphertext,
    severidad, estado, fecha_inicio, created_by
  )
  values (
    p_paciente_id, p_cie_code,
    public.app_encrypt(p_titulo), public.app_encrypt(p_notas),
    p_severidad, coalesce(p_estado,'activo'), p_fecha_inicio, v_author
  )
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.medicacion_crear_cifrada(
  p_paciente_id uuid, p_nombre text, p_dosis text default null,
  p_frecuencia text default null, p_via text default null,
  p_prescrita_por text default null, p_notas text default null,
  p_fecha_inicio date default current_date, p_fecha_fin date default null
) returns uuid language plpgsql security definer set search_path to 'public','pg_temp' as $$
declare v_id uuid; v_author uuid := auth.uid();
begin
  if not public.is_admin() then
    raise exception 'medicacion_crear_cifrada: requiere rol admin' using errcode='42501';
  end if;
  if p_paciente_id is null or p_nombre is null or length(btrim(p_nombre))=0 then
    raise exception 'medicacion_crear_cifrada: paciente_id y nombre requeridos' using errcode='22023';
  end if;
  insert into public.paciente_medicacion (
    paciente_id, nombre, dosis, frecuencia, via, prescrita_por,
    notas_ciphertext, fecha_inicio, fecha_fin, created_by
  )
  values (
    p_paciente_id, p_nombre, p_dosis, p_frecuencia, p_via, p_prescrita_por,
    public.app_encrypt(p_notas), p_fecha_inicio, p_fecha_fin, v_author
  )
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.nota_cita_guardar_cifrada(
  p_cita_id uuid, p_paciente_id uuid, p_contenido text
) returns uuid language plpgsql security definer set search_path to 'public','pg_temp' as $$
declare v_id uuid; v_author uuid := auth.uid();
begin
  if not public.is_admin() then
    raise exception 'nota_cita_guardar_cifrada: requiere rol admin' using errcode='42501';
  end if;
  if p_cita_id is null or p_paciente_id is null then
    raise exception 'nota_cita_guardar_cifrada: cita_id y paciente_id requeridos' using errcode='22023';
  end if;
  insert into public.citas_notas_paciente (cita_id, paciente_id, autor_user_id, contenido_ciphertext)
  values (p_cita_id, p_paciente_id, v_author, public.app_encrypt(p_contenido))
  returning id into v_id;
  return v_id;
end $$;

-- 2. Nullificar plaintexts residuales (DX/medicación siempre;
--    notas clínicas sólo si el autor es admin → no borramos journal del paciente)
update public.paciente_diagnosticos
   set titulo = null, descripcion = null
 where titulo is not null or descripcion is not null;

update public.paciente_medicacion
   set notas = null
 where notas is not null;

update public.citas_notas_paciente
   set contenido = null
 where contenido is not null
   and contenido_ciphertext is not null
   and autor_user_id in (select id from public.profiles where role = 'admin');

-- 3. RLS DX/medicación: acceso exclusivo admin (el paciente consulta vía RPC).
drop policy if exists diag_paciente_ver_propio on public.paciente_diagnosticos;
drop policy if exists medic_paciente_ver_propia on public.paciente_medicacion;

-- 4. RLS notas: el paciente solo ve notas propias (journal), no las del terapeuta.
drop policy if exists cnp_paciente_read_own on public.citas_notas_paciente;
create policy cnp_paciente_read_own
  on public.citas_notas_paciente for select
  using (autor_user_id = auth.uid());
