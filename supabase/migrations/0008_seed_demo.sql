-- ============================================================================
-- 0008_seed_demo.sql — Datos demo reproducibles para dashboards
-- ----------------------------------------------------------------------------
-- Idempotente: usa DO + buscar por email. Solo ejecuta si existe el user
-- `usuario@visualizacion.com` (paciente demo). No modifica datos reales.
--
-- Genera:
--   * Ficha paciente (con PII placeholder)
--   * Conversación + 4 mensajes de ida y vuelta
--   * Bono activo de 4 sesiones con 1 consumida
--   * 2 citas futuras (una confirmada, una pre-reserva)
--   * 2 recursos asignados (pdf + audio)
--   * 1 pago completado mes actual
-- ============================================================================

do $$
declare
  v_paciente_uid uuid;
  v_admin_uid    uuid;
  v_paciente_id  uuid;
  v_conv_id      uuid;
  v_servicio_ind uuid;
  v_servicio_1st uuid;
  v_recurso_pdf  uuid;
  v_recurso_aud  uuid;
  v_cita_future1 timestamptz := date_trunc('day', now() at time zone 'Europe/Madrid' + interval '2 days') + interval '10 hours';
  v_cita_future2 timestamptz := date_trunc('day', now() at time zone 'Europe/Madrid' + interval '5 days') + interval '17 hours';
  v_bono_id      uuid;
  v_pago_id      uuid;
begin
  -- Resolver user ids por email
  select id into v_paciente_uid from auth.users where email = 'usuario@visualizacion.com' limit 1;
  select id into v_admin_uid    from auth.users where email = 'almudena@admin.com'       limit 1;

  if v_paciente_uid is null then
    raise notice 'Demo: paciente usuario@visualizacion.com no existe todavía. Saltando seed.';
    return;
  end if;

  -- Resolver servicios
  select id into v_servicio_ind from public.servicios where nombre = 'Sesión individual' and activo = true limit 1;
  select id into v_servicio_1st from public.servicios where nombre = 'Primera consulta' and activo = true limit 1;

  -- ─── Ficha paciente ───
  select id into v_paciente_id from public.pacientes where user_id = v_paciente_uid limit 1;

  if v_paciente_id is null then
    insert into public.pacientes (
      user_id,
      dni_nie_ciphertext, dni_nie_bidx,
      nombre_completo_ciphertext, nombre_completo_bidx,
      telefono_ciphertext, telefono_bidx,
      fecha_nacimiento, consentimiento_rgpd, activo
    ) values (
      v_paciente_uid,
      'DEMO_CIPHERTEXT_DNI', 'demo_bidx_dni_' || substr(v_paciente_uid::text, 1, 8),
      'DEMO_CIPHERTEXT_NOMBRE', 'demo_bidx_nom_' || substr(v_paciente_uid::text, 1, 8),
      'DEMO_CIPHERTEXT_TEL', 'demo_bidx_tel_' || substr(v_paciente_uid::text, 1, 8),
      date '1992-06-15', true, true
    )
    returning id into v_paciente_id;
  end if;

  -- ─── Conversación ───
  select id into v_conv_id from public.conversaciones where paciente_id = v_paciente_id limit 1;
  if v_conv_id is null then
    insert into public.conversaciones (paciente_id)
      values (v_paciente_id) returning id into v_conv_id;
  end if;

  -- Mensajes (solo si la conversación está vacía)
  if not exists (select 1 from public.mensajes where conversation_id = v_conv_id) then
    insert into public.mensajes (conversation_id, sender_user_id, body_ciphertext, created_at) values
      (v_conv_id, v_paciente_uid, 'Hola Almudena, quería confirmar mi próxima sesión.',       now() - interval '2 days 3 hours'),
      (v_conv_id, coalesce(v_admin_uid, v_paciente_uid), 'Hola, confirmada para el miércoles a las 10:00. Cualquier cosa me dices.', now() - interval '2 days 2 hours 45 minutes'),
      (v_conv_id, v_paciente_uid, 'Perfecto, gracias. Una duda rápida sobre el ejercicio que me asignaste.', now() - interval '1 day 5 hours'),
      (v_conv_id, coalesce(v_admin_uid, v_paciente_uid), 'Claro, dime. Lo miramos en sesión si prefieres.', now() - interval '1 day 4 hours 50 minutes');

    update public.conversaciones
       set last_message_at  = now() - interval '1 day 4 hours 50 minutes',
           unread_paciente  = 1
     where id = v_conv_id;
  end if;

  -- ─── Bono activo ───
  if v_servicio_ind is not null
     and not exists (select 1 from public.bonos_pacientes where paciente_id = v_paciente_id and estado = 'activo')
  then
    insert into public.bonos_pacientes (
      paciente_id, servicio_id, sesiones_totales, sesiones_consumidas, estado, fecha_compra, fecha_expiracion
    ) values (
      v_paciente_id, v_servicio_ind, 4, 1, 'activo', now() - interval '18 days', (current_date + interval '3 months')::date
    ) returning id into v_bono_id;
  end if;

  -- ─── Citas futuras ───
  if v_servicio_ind is not null then
    if not exists (
      select 1 from public.citas
       where paciente_id = v_paciente_id and inicio = v_cita_future1
    ) then
      begin
        insert into public.citas (paciente_id, servicio_id, inicio, fin, estado)
          values (v_paciente_id, v_servicio_ind, v_cita_future1, v_cita_future1 + interval '50 minutes', 'confirmada');
      exception when exclusion_violation then null;
      end;
    end if;

    if not exists (
      select 1 from public.citas
       where paciente_id = v_paciente_id and inicio = v_cita_future2
    ) then
      begin
        insert into public.citas (paciente_id, servicio_id, inicio, fin, estado)
          values (v_paciente_id, v_servicio_ind, v_cita_future2, v_cita_future2 + interval '50 minutes', 'bloqueo_temporal');
      exception when exclusion_violation then null;
      end;
    end if;
  end if;

  -- ─── Recursos ───
  select id into v_recurso_pdf from public.recursos where titulo = 'Registro diario de estado de ánimo' limit 1;
  if v_recurso_pdf is null then
    insert into public.recursos (titulo, descripcion, tipo, categoria, external_url, created_by, activo)
      values (
        'Registro diario de estado de ánimo',
        'Plantilla para el seguimiento diario de emociones, pensamientos y conductas.',
        'pdf', 'tarea', 'https://example.com/registros/diario.pdf', v_admin_uid, true
      )
      returning id into v_recurso_pdf;
  end if;

  select id into v_recurso_aud from public.recursos where titulo = 'Meditación guiada — respiración consciente' limit 1;
  if v_recurso_aud is null then
    insert into public.recursos (titulo, descripcion, tipo, categoria, external_url, created_by, activo)
      values (
        'Meditación guiada — respiración consciente',
        'Audio de 12 minutos para practicar respiración diafragmática y anclaje al presente.',
        'audio', 'ejercicio', 'https://example.com/audios/respiracion.mp3', v_admin_uid, true
      )
      returning id into v_recurso_aud;
  end if;

  insert into public.recurso_asignaciones (recurso_id, paciente_id, assigned_by, assigned_at)
    values
      (v_recurso_pdf, v_paciente_id, v_admin_uid, now() - interval '9 days'),
      (v_recurso_aud, v_paciente_id, v_admin_uid, now() - interval '3 days')
  on conflict (recurso_id, paciente_id) do nothing;

  -- ─── Pago demo (mes actual) ───
  if v_servicio_ind is not null
     and not exists (
       select 1 from public.pagos
        where paciente_id = v_paciente_id
          and fecha_pago >= date_trunc('month', now())
     )
  then
    insert into public.pagos (
      paciente_id, importe_centimos, moneda, estado, fecha_pago,
      stripe_event_id, stripe_session_id
    ) values (
      v_paciente_id, 7500, 'EUR', 'completado', now() - interval '12 days',
      'evt_demo_' || substr(md5(random()::text), 1, 12),
      'cs_demo_' || substr(md5(random()::text), 1, 12)
    ) returning id into v_pago_id;
  end if;

  raise notice 'Seed demo aplicado: paciente %, conversación %, bono %, pago %',
    v_paciente_id, v_conv_id, v_bono_id, v_pago_id;
end $$;
