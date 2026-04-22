-- ============================================================================
-- 0035_nota_cita_upsert_admin.sql
-- ----------------------------------------------------------------------------
-- Mejora (detectada 22-abr-2026 · hito 14 E2E test):
--   `nota_cita_guardar_cifrada` siempre hacía INSERT → al editar una nota
--   desde el panel admin se creaban filas duplicadas por cada guardado.
--
--   Ahora hace UPSERT: si ya existe una nota con (cita_id, autor_user_id,
--   activo=true) la actualiza; si no, crea una nueva.
-- ============================================================================

create or replace function public.nota_cita_guardar_cifrada(
  p_cita_id uuid,
  p_paciente_id uuid,
  p_contenido text
) returns uuid
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_id uuid;
  v_author uuid := auth.uid();
begin
  if not public.is_admin() then
    raise exception 'nota_cita_guardar_cifrada: requiere rol admin'
      using errcode='42501';
  end if;

  if p_cita_id is null or p_paciente_id is null then
    raise exception 'nota_cita_guardar_cifrada: cita_id y paciente_id requeridos'
      using errcode='22023';
  end if;

  select id into v_id
    from public.citas_notas_paciente
   where cita_id = p_cita_id
     and autor_user_id = v_author
     and activo = true
   limit 1;

  if v_id is null then
    insert into public.citas_notas_paciente (
      cita_id, paciente_id, autor_user_id, contenido_ciphertext
    ) values (
      p_cita_id, p_paciente_id, v_author, public.app_encrypt(p_contenido)
    )
    returning id into v_id;
  else
    update public.citas_notas_paciente
       set contenido_ciphertext = public.app_encrypt(p_contenido),
           updated_at = now()
     where id = v_id;
  end if;

  return v_id;
end $$;
