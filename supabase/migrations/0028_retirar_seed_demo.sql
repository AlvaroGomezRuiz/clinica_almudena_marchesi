-- ============================================================================
-- 0028_retirar_seed_demo.sql
-- ----------------------------------------------------------------------------
-- Elimina de forma idempotente TODOS los datos demo / seeds generados por
-- `0008_seed_demo.sql` y cualquier rastro de testing previo a la puesta en
-- producción real (pacientes reales).
--
-- Seguridad:
--   - Sólo toca rows vinculadas a los e-mails demo hardcodeados.
--   - No borra admins ni pacientes reales.
--   - Deletes explícitos en orden (hijos antes que padres) para no depender
--     solo de cascades.
--
-- Uso:
--   Ejecutar desde el Supabase SQL Editor (service_role) cuando:
--     (a) Almudena reciba las credenciales de producción,
--     (b) el QA interno haya terminado,
--     (c) el dominio esté apuntado y los emails reales estén creados.
--
-- Esta migración es segura de correr varias veces (idempotente): si no
-- hay datos demo, todas las sentencias `delete` no hacen nada.
-- ============================================================================

begin;

do $$
declare
  v_paciente_uid uuid;
  v_paciente_id  uuid;
  v_conv_id      uuid;
  v_bono_ids     uuid[];
  v_cita_ids     uuid[];
  v_pago_ids     uuid[];
  v_asign_ids    uuid[];
  v_deleted      int := 0;
begin
  -- ─── 1. Resolver user_id del paciente demo ──────────────────────────────
  select id into v_paciente_uid
    from auth.users
   where email in ('usuario@visualizacion.com', 'demo@almudena.test')
   order by created_at asc
   limit 1;

  if v_paciente_uid is null then
    raise notice '[0028] No hay usuario paciente demo. Nada que limpiar.';
    return;
  end if;

  -- ─── 2. Resolver paciente.id asociado ───────────────────────────────────
  select id into v_paciente_id
    from public.pacientes
   where user_id = v_paciente_uid
   limit 1;

  -- ─── 3. Identificar entidades dependientes del paciente demo ────────────
  if v_paciente_id is not null then
    select array_agg(id) into v_cita_ids
      from public.citas where paciente_id = v_paciente_id;

    select array_agg(id) into v_bono_ids
      from public.bonos_pacientes where paciente_id = v_paciente_id;

    select array_agg(id) into v_pago_ids
      from public.pagos where paciente_id = v_paciente_id;

    select array_agg(id) into v_asign_ids
      from public.recurso_asignaciones where paciente_id = v_paciente_id;

    select id into v_conv_id
      from public.conversaciones
     where paciente_id = v_paciente_id
     limit 1;
  end if;

  -- ─── 4. Borrado en orden seguro ─────────────────────────────────────────

  -- 4.1 Mensajes (adjuntos por CASCADE) + conversación
  if v_conv_id is not null then
    -- mensajes_adjuntos tiene ON DELETE CASCADE desde mensaje_id, así que
    -- borrar mensajes arrastra sus adjuntos.
    delete from public.mensajes where conversation_id = v_conv_id;
    get diagnostics v_deleted = row_count;
    raise notice '[0028] mensajes: % filas', v_deleted;

    delete from public.conversaciones where id = v_conv_id;
    get diagnostics v_deleted = row_count;
    raise notice '[0028] conversaciones: % filas', v_deleted;
  end if;

  -- 4.2 Notas de cita (también CASCADE por cita_id, pero limpiamos explícito
  -- en caso de que haya quedado alguna huérfana del seed).
  if v_paciente_id is not null then
    delete from public.citas_notas_paciente
     where paciente_id = v_paciente_id;
    get diagnostics v_deleted = row_count;
    raise notice '[0028] citas_notas_paciente: % filas', v_deleted;
  end if;

  -- 4.3 Historial sesiones
  if v_paciente_id is not null then
    delete from public.historial_sesiones
     where paciente_id = v_paciente_id;
    get diagnostics v_deleted = row_count;
    raise notice '[0028] historial_sesiones: % filas', v_deleted;
  end if;

  -- 4.4 Facturas y notas administrativas asociadas a pagos demo
  if v_pago_ids is not null then
    delete from public.facturacion_nota
     where pago_id = any(v_pago_ids);
    get diagnostics v_deleted = row_count;
    raise notice '[0028] facturacion_nota: % filas', v_deleted;
  end if;

  -- 4.5 emails_log asociados a este paciente (por user_id o por pago/cita/bono)
  delete from public.emails_log
   where to_user_id = v_paciente_uid
      or (v_cita_ids is not null and cita_id = any(v_cita_ids))
      or (v_bono_ids is not null and bono_id = any(v_bono_ids))
      or (v_pago_ids is not null and pago_id = any(v_pago_ids));
  get diagnostics v_deleted = row_count;
  raise notice '[0028] emails_log: % filas', v_deleted;

  -- 4.6 Pagos (tras limpiar dependientes)
  if v_pago_ids is not null then
    delete from public.pagos where id = any(v_pago_ids);
    get diagnostics v_deleted = row_count;
    raise notice '[0028] pagos: % filas', v_deleted;
  end if;

  -- 4.7 Citas
  if v_cita_ids is not null then
    delete from public.citas where id = any(v_cita_ids);
    get diagnostics v_deleted = row_count;
    raise notice '[0028] citas: % filas', v_deleted;
  end if;

  -- 4.8 Bonos
  if v_bono_ids is not null then
    delete from public.bonos_pacientes where id = any(v_bono_ids);
    get diagnostics v_deleted = row_count;
    raise notice '[0028] bonos_pacientes: % filas', v_deleted;
  end if;

  -- 4.9 Recursos asignados
  if v_asign_ids is not null then
    delete from public.recurso_asignaciones where id = any(v_asign_ids);
    get diagnostics v_deleted = row_count;
    raise notice '[0028] recurso_asignaciones: % filas', v_deleted;
  end if;

  -- 4.10 Diagnósticos + medicación + adjuntos del paciente demo
  if v_paciente_id is not null then
    delete from public.paciente_diagnosticos where paciente_id = v_paciente_id;
    get diagnostics v_deleted = row_count;
    raise notice '[0028] paciente_diagnosticos: % filas', v_deleted;

    delete from public.paciente_medicacion where paciente_id = v_paciente_id;
    get diagnostics v_deleted = row_count;
    raise notice '[0028] paciente_medicacion: % filas', v_deleted;

    delete from public.paciente_adjuntos where paciente_id = v_paciente_id;
    get diagnostics v_deleted = row_count;
    raise notice '[0028] paciente_adjuntos: % filas', v_deleted;
  end if;

  -- 4.11 Auditoría admin_lookups del paciente demo
  if v_paciente_id is not null then
    delete from public.admin_lookups where paciente_id = v_paciente_id;
    get diagnostics v_deleted = row_count;
    raise notice '[0028] admin_lookups: % filas', v_deleted;
  end if;

  -- 4.12 Preferencias de notificaciones del paciente demo
  delete from public.notificaciones_prefs where user_id = v_paciente_uid;
  get diagnostics v_deleted = row_count;
  raise notice '[0028] notificaciones_prefs: % filas', v_deleted;

  -- 4.13 Paciente
  if v_paciente_id is not null then
    delete from public.pacientes where id = v_paciente_id;
    get diagnostics v_deleted = row_count;
    raise notice '[0028] pacientes: % filas', v_deleted;
  end if;

  -- 4.14 Profile del paciente demo. El profile del admin NO se toca: los
  -- admins deben crearse con credenciales reales y la cuenta de visualización
  -- eliminarse manualmente via Supabase Auth si se quiere retirar.
  delete from public.profiles where id = v_paciente_uid;
  get diagnostics v_deleted = row_count;
  raise notice '[0028] profiles (paciente demo): % filas', v_deleted;

  -- 4.15 auth.users del paciente demo (sólo si email sigue siendo el demo)
  delete from auth.users
   where id = v_paciente_uid
     and email in ('usuario@visualizacion.com', 'demo@almudena.test');
  get diagnostics v_deleted = row_count;
  raise notice '[0028] auth.users (paciente demo): % filas', v_deleted;

  raise notice '[0028] Limpieza completada correctamente.';
end $$;

commit;

-- ============================================================================
-- Verificación manual (opcional): correr tras aplicar la migración
-- ============================================================================
-- select 'auth.users demo'      as tabla, count(*) from auth.users
--  where email in ('usuario@visualizacion.com','demo@almudena.test')
-- union all
-- select 'pacientes total',          count(*) from public.pacientes
-- union all
-- select 'conversaciones total',     count(*) from public.conversaciones
-- union all
-- select 'mensajes total',           count(*) from public.mensajes
-- union all
-- select 'bonos_pacientes total',    count(*) from public.bonos_pacientes
-- union all
-- select 'citas total',              count(*) from public.citas
-- union all
-- select 'pagos total',              count(*) from public.pagos
-- union all
-- select 'admin_lookups total',      count(*) from public.admin_lookups
-- union all
-- select 'emails_log total',         count(*) from public.emails_log
-- union all
-- select 'recurso_asignaciones',     count(*) from public.recurso_asignaciones;
