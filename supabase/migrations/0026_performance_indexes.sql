-- ============================================================================
-- 0026_performance_indexes.sql
-- ----------------------------------------------------------------------------
-- Índices compuestos para queries frecuentes detectadas en auditoría senior.
--
-- Patrones de query optimizados:
--   1. Ficha de paciente: últimas citas → paciente + inicio DESC
--   2. Agenda admin por rango: rango tstzrange + estado
--   3. Pagos del paciente: paciente + fecha_pago DESC
--   4. Facturación por rango: fecha_pago + estado
--   5. Mensajes por conversación: conversacion + created_at DESC
--   6. Adjuntos por mensaje: mensaje_id + created_at
--
-- Estos NO reemplazan índices ya existentes; los COMPLEMENTAN.
-- `CONCURRENTLY` no se usa porque Supabase CLI no lo soporta en migrations.
-- En cambio, usamos `IF NOT EXISTS` para reejecución idempotente.
--
-- Todos los índices son B-tree salvo el GIST ya existente sobre tstzrange.
-- ============================================================================

-- ── 1. citas: patrón "últimas N citas de un paciente" (ficha) ──
create index if not exists citas_paciente_inicio_idx
  on public.citas(paciente_id, inicio desc);

-- ── 2. citas por estado (ej: listar "pendientes") ──
-- Ya existen citas_estado_idx, pero añadimos parcial para estados "activos" si
-- Supabase lo permite (acelera filtros típicos del dashboard).
create index if not exists citas_estado_activas_idx
  on public.citas(inicio)
  where estado in ('confirmada', 'propuesta');

-- ── 3. pagos: historial de pagos por paciente ordenado por fecha ──
create index if not exists pagos_paciente_fecha_idx
  on public.pagos(paciente_id, fecha_pago desc);

-- ── 4. pagos por estado + fecha (facturación, exports) ──
create index if not exists pagos_estado_fecha_idx
  on public.pagos(estado, fecha_pago desc);

-- ── 5. mensajes por conversación ordenados por fecha ──
-- Si la tabla no existe (chat aún no desplegado en algún entorno), saltamos.
do $$
begin
  if to_regclass('public.mensajes') is not null then
    execute 'create index if not exists mensajes_conversacion_created_idx
             on public.mensajes(conversacion_id, created_at desc)';
  end if;
end $$;

-- ── 6. adjuntos por mensaje ──
do $$
begin
  if to_regclass('public.mensajes_adjuntos') is not null then
    execute 'create index if not exists mensajes_adjuntos_mensaje_idx
             on public.mensajes_adjuntos(mensaje_id, created_at asc)';
  end if;
end $$;

-- ── 7. Stripe webhook idempotency: si existe tabla ──
do $$
begin
  if to_regclass('public.stripe_webhook_events') is not null then
    execute 'create index if not exists stripe_webhook_events_processed_idx
             on public.stripe_webhook_events(processed_at)
             where processed_at is null';
  end if;
end $$;

-- ── 8. Auditoría: índice por actor + fecha para reviews RGPD ──
do $$
begin
  if to_regclass('public.ficha_clinica_auditoria') is not null then
    execute 'create index if not exists ficha_auditoria_actor_fecha_idx
             on public.ficha_clinica_auditoria(actor_id, created_at desc)';
  end if;
end $$;

-- ── 9. Profiles por rol (admin queries "listar pacientes") ──
-- Ya hay PK en id; añadimos por rol para filtros rápidos.
create index if not exists profiles_role_idx on public.profiles(role);

-- Mantener estadísticas frescas tras crear índices.
analyze public.citas;
analyze public.pagos;
analyze public.profiles;
