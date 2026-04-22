-- ============================================================================
-- 0026_performance_indexes.sql
-- ----------------------------------------------------------------------------
-- Índices compuestos para queries clínicas frecuentes. Idempotente (IF NOT EXISTS).
--
-- Patrones optimizados:
--   1. Ficha de paciente: últimas citas → (paciente_id, inicio DESC)
--   2. Dashboard admin: citas activas del día → parcial por estado
--   3. Historial de pagos del paciente → (paciente_id, fecha_pago DESC)
--   4. Facturación por estado + fecha → (estado, fecha_pago DESC)
--   5. Chat: mensajes por conversación → (conversation_id, created_at DESC)
--   6. Adjuntos: por mensaje → (mensaje_id, created_at ASC)
--   7. Stripe events pendientes → parcial WHERE processed_at IS NULL
--   8. Filtro admin por rol en profiles
--
-- Estos NO reemplazan índices existentes; los COMPLEMENTAN.
-- `CONCURRENTLY` no se usa porque Supabase migrations corren en transacción.
-- Al final, ANALYZE de las tablas para refrescar estadísticas del planner.
-- ============================================================================

-- 1. citas por paciente + inicio desc (ficha paciente, últimas N citas)
create index if not exists citas_paciente_inicio_idx
  on public.citas(paciente_id, inicio desc);

-- 2. citas activas del dashboard (confirmadas + bloqueos temporales).
--    Enum `cita_estado` no tiene 'propuesta'; estados reales son
--    bloqueo_temporal, confirmada, completada, cancelada, no_asistio.
create index if not exists citas_estado_activas_idx
  on public.citas(inicio)
  where estado in ('confirmada', 'bloqueo_temporal');

-- 3. pagos: historial por paciente ordenado por fecha desc
create index if not exists pagos_paciente_fecha_idx
  on public.pagos(paciente_id, fecha_pago desc);

-- 4. pagos por estado + fecha (facturación, exports CSV)
create index if not exists pagos_estado_fecha_idx
  on public.pagos(estado, fecha_pago desc);

-- 5. mensajes por conversación ordenados por fecha (chat realtime)
create index if not exists mensajes_conversation_created_idx
  on public.mensajes(conversation_id, created_at desc);

-- 6. adjuntos por mensaje
create index if not exists mensajes_adjuntos_mensaje_idx
  on public.mensajes_adjuntos(mensaje_id, created_at asc);

-- 7. stripe_events pendientes de procesar (retry queue, webhook idempotency)
create index if not exists stripe_events_processed_at_idx
  on public.stripe_events(received_at desc)
  where processed_at is null;

-- 8. Profiles por rol (filtros admin "listar pacientes")
create index if not exists profiles_role_idx
  on public.profiles(role);

-- Refrescar estadísticas del planner tras crear índices.
analyze public.citas;
analyze public.pagos;
analyze public.profiles;
analyze public.mensajes;
analyze public.mensajes_adjuntos;
analyze public.stripe_events;
