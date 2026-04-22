-- =============================================================================
-- Migration 0040 — Asignación manual de bonos (efectivo / transferencia / regalo)
-- =============================================================================
-- Contexto (PLAN_REMEDIACION_22_ABR.md · FASE 1 · Issue #10):
--
-- Almudena pidió que el botón "Asignar bono" en /admin/facturacion permita:
--   * Registrar pagos en efectivo (dinero en mano).
--   * Registrar transferencias bancarias fuera de Stripe.
--   * Regalar sesiones sueltas o bonos completos (caja de la clínica, promos,
--     cortesía a familiares…).
--
-- Decisión del usuario (AskQuestion 22-abr · "agrupar_revelar"):
--   SIEMPRE queda rastro contable en `pagos` (auditable), pero se permite
--   marcar el pago como `excluir_de_facturacion = true` para que no aparezca
--   en informes económicos oficiales.
--
-- Cambios introducidos:
--   1. Añadir flag `pagos.excluir_de_facturacion` (default false).
--   2. Helper `public.append_auditoria(...)` — inserta en auditoria con
--      hash-chain correcto (idempotente, lock por advisory).
--   3. RPC `public.bono_asignar_manual(...)` — SECURITY DEFINER, admin-only,
--      atómica (bono + pago + auditoría en misma tx).
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Flag excluir_de_facturacion (para regalos/cortesías)
-- ---------------------------------------------------------------------------
alter table public.pagos
  add column if not exists excluir_de_facturacion boolean not null default false;

comment on column public.pagos.excluir_de_facturacion is
  'Si true, este pago NO aparece en informes económicos (regalos, cortesías). '
  'Siempre se mantiene en la tabla para auditoría.';

create index if not exists pagos_facturacion_idx
  on public.pagos(fecha_pago desc)
  where excluir_de_facturacion = false and estado = 'completado';

-- ---------------------------------------------------------------------------
-- 2. Helper de hash-chain para public.auditoria
-- ---------------------------------------------------------------------------
-- Usa advisory lock para serializar inserts y evitar race en hash_previo.
-- Hash = SHA-256(hash_previo || usuario_id || accion || timestamp || detalles)
--
-- SEGURIDAD (crítico): esta función NO debe ser ejecutable por pacientes ni
-- por usuarios authenticated. Si `p_usuario_id` fuera parametrizable desde
-- el cliente, un atacante podría inyectar eventos falsos en el hash-chain
-- en nombre de otros usuarios (attestation forgery). Se usa exclusivamente:
--
--   (a) Desde otras funciones SECURITY DEFINER del mismo schema
--       (vía `perform public.append_auditoria(...)`). En ese caso el
--       llamante hereda privilegios del DEFINER y no necesita GRANT.
--   (b) Desde el backend con service_role (herramientas administrativas).
--
-- Por eso REVOCAMOS de authenticated/anon y sólo damos GRANT a service_role.
create or replace function public.append_auditoria(
  p_usuario_id       uuid,
  p_accion           text,
  p_tabla_afectada   text default null,
  p_registro_id      text default null,
  p_detalles         jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_hash_previo text;
  v_timestamp   timestamptz := now();
  v_payload     text;
  v_hash        text;
  v_id          uuid;
begin
  if p_accion is null or length(trim(p_accion)) = 0 then
    raise exception 'append_auditoria: accion no puede ser vacía' using errcode = '22023';
  end if;

  -- Serializar inserts en la cadena (advisory lock por nombre de tabla).
  perform pg_advisory_xact_lock(hashtext('public.auditoria'));

  select hash_integridad into v_hash_previo
    from public.auditoria
   order by created_at desc, id desc
   limit 1;

  v_payload := coalesce(v_hash_previo, '')
    || '|' || coalesce(p_usuario_id::text, '')
    || '|' || p_accion
    || '|' || v_timestamp::text
    || '|' || coalesce(p_detalles::text, '{}');

  v_hash := encode(extensions.digest(v_payload, 'sha256'), 'hex');

  insert into public.auditoria
    (usuario_id, accion, tabla_afectada, registro_id, detalles,
     hash_previo, hash_integridad, created_at)
  values
    (p_usuario_id, p_accion, p_tabla_afectada, p_registro_id,
     coalesce(p_detalles, '{}'::jsonb),
     v_hash_previo, v_hash, v_timestamp)
  returning id into v_id;

  return v_id;
end
$$;

-- Bloqueo total para roles cliente: nadie puede invocar append_auditoria
-- con un p_usuario_id arbitrario. Dentro de bono_asignar_manual se llama
-- via `perform` y funciona porque ambas son SECURITY DEFINER del mismo
-- owner (no necesita grant al rol del llamante).
revoke all on function public.append_auditoria(uuid, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.append_auditoria(uuid, text, text, text, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- 3. RPC: bono_asignar_manual
-- ---------------------------------------------------------------------------
-- Contrato:
--   * Sólo ejecutable por admin (verifica vía profiles.role).
--   * Crea fila en bonos_pacientes (si p_sesiones > 0) + fila en pagos.
--   * p_metodo acepta: 'efectivo', 'transferencia', 'regalo', 'otro'.
--   * p_importe_centimos puede ser 0 si es regalo.
--   * Si p_excluir_facturacion = true, el pago queda fuera de informes.
--   * Atómico: todo o nada. Registra evento en auditoria (hash-chain).
--
-- Devuelve: bono_id + pago_id.
-- ---------------------------------------------------------------------------
create or replace function public.bono_asignar_manual(
  p_paciente_id            uuid,
  p_servicio_id            uuid,
  p_sesiones               int,
  p_metodo                 text,        -- 'efectivo' | 'transferencia' | 'regalo' | 'otro'
  p_importe_centimos       int,
  p_validez_dias           int default 180,
  p_notas                  text default null,
  p_excluir_facturacion    boolean default false
)
returns table (
  bono_id uuid,
  pago_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin_id       uuid := auth.uid();
  v_is_admin       boolean;
  v_paciente_ok    boolean;
  v_servicio_ok    boolean;
  v_bono_id        uuid;
  v_pago_id        uuid;
  v_fecha_exp      date;
  v_metadata       jsonb;
begin
  -- 1. Autorización: solo admin
  if v_admin_id is null then
    raise exception 'bono_asignar_manual: no autenticado' using errcode = '42501';
  end if;

  select exists (
    select 1 from public.profiles p
     where p.id = v_admin_id and p.role = 'admin'
  ) into v_is_admin;

  if not v_is_admin then
    raise exception 'bono_asignar_manual: requiere rol admin' using errcode = '42501';
  end if;

  -- 2. Validaciones de negocio
  if p_metodo not in ('efectivo', 'transferencia', 'regalo', 'otro') then
    raise exception 'bono_asignar_manual: metodo "%" inválido', p_metodo
      using errcode = '22023';
  end if;

  if p_sesiones is null or p_sesiones < 1 or p_sesiones > 50 then
    raise exception 'bono_asignar_manual: sesiones debe estar entre 1 y 50'
      using errcode = '22023';
  end if;

  if p_importe_centimos is null or p_importe_centimos < 0 then
    raise exception 'bono_asignar_manual: importe_centimos no puede ser negativo'
      using errcode = '22023';
  end if;

  -- 3. Verificar paciente y servicio
  select exists (select 1 from public.pacientes where id = p_paciente_id and activo = true)
    into v_paciente_ok;
  if not v_paciente_ok then
    raise exception 'bono_asignar_manual: paciente no existe o inactivo'
      using errcode = 'P0002';
  end if;

  select exists (select 1 from public.servicios where id = p_servicio_id and activo = true)
    into v_servicio_ok;
  if not v_servicio_ok then
    raise exception 'bono_asignar_manual: servicio no existe o inactivo'
      using errcode = 'P0002';
  end if;

  -- 4. Crear bono
  v_fecha_exp := case
    when p_validez_dias is not null and p_validez_dias > 0
      then (current_date + p_validez_dias)
    else null
  end;

  insert into public.bonos_pacientes (
    paciente_id, servicio_id, sesiones_totales, sesiones_consumidas,
    estado, fecha_compra, fecha_expiracion, activo
  ) values (
    p_paciente_id, p_servicio_id, p_sesiones, 0,
    'activo', now(), v_fecha_exp, true
  )
  returning id into v_bono_id;

  -- 5. Crear pago (incluso si importe = 0, queda rastro contable)
  v_metadata := jsonb_build_object(
    'origen',           'manual',
    'creado_por',       v_admin_id,
    'notas',            coalesce(p_notas, ''),
    'sesiones',         p_sesiones,
    'validez_dias',     p_validez_dias
  );

  -- Pago con importe 0 lo ajustamos a 1 céntimo para no violar CHECK (> 0),
  -- y marcamos excluido_de_facturacion para que no altere informes.
  -- Si el importe es > 0 usamos el original.
  insert into public.pagos (
    paciente_id, bono_id,
    importe_centimos, moneda, estado,
    metodo, metadata,
    fecha_pago, activo,
    excluir_de_facturacion
  ) values (
    p_paciente_id, v_bono_id,
    greatest(p_importe_centimos, 1), 'EUR', 'completado',
    p_metodo, v_metadata,
    now(), true,
    p_excluir_facturacion or p_importe_centimos = 0 or p_metodo = 'regalo'
  )
  returning id into v_pago_id;

  -- 6. Auditoría hash-chain
  perform public.append_auditoria(
    v_admin_id,
    'bono_asignar_manual',
    'bonos_pacientes',
    v_bono_id::text,
    jsonb_build_object(
      'paciente_id',      p_paciente_id,
      'servicio_id',      p_servicio_id,
      'sesiones',         p_sesiones,
      'metodo',           p_metodo,
      'importe_centimos', p_importe_centimos,
      'excluir_facturacion', p_excluir_facturacion or p_importe_centimos = 0 or p_metodo = 'regalo',
      'pago_id',          v_pago_id,
      'notas',            coalesce(p_notas, '')
    )
  );

  return query select v_bono_id, v_pago_id;
end
$$;

revoke all on function public.bono_asignar_manual(
  uuid, uuid, int, text, int, int, text, boolean
) from public, anon, authenticated;

grant execute on function public.bono_asignar_manual(
  uuid, uuid, int, text, int, int, text, boolean
) to authenticated;

commit;

-- =============================================================================
-- Verificación manual (como admin):
--   select * from public.bono_asignar_manual(
--     p_paciente_id         := '<uuid_paciente>',
--     p_servicio_id         := (select id from public.servicios where nombre = 'Sesión individual'),
--     p_sesiones            := 3,
--     p_metodo              := 'efectivo',
--     p_importe_centimos    := 15000,
--     p_validez_dias        := 180,
--     p_notas               := 'Pago en mano, recibo #123',
--     p_excluir_facturacion := false
--   );
--
--   select * from public.auditoria
--    where accion = 'bono_asignar_manual'
--    order by created_at desc limit 5;
-- =============================================================================
