-- ============================================================================
-- 0005_seed_servicios.sql — Catálogo inicial de servicios
-- ----------------------------------------------------------------------------
-- Idempotente: usa ON CONFLICT para evitar duplicación en re-ejecución.
-- ============================================================================

insert into public.servicios (id, nombre, descripcion, duracion_minutos, precio_centimos, activo) values
  (
    gen_random_uuid(),
    'Primera consulta',
    'Sesión inicial de evaluación y diagnóstico. Incluye entrevista clínica estructurada y establecimiento de objetivos terapéuticos.',
    60,
    9000,   -- 90€
    true
  ),
  (
    gen_random_uuid(),
    'Sesión individual',
    'Sesión de psicoterapia individual. Enfoque integrativo (cognitivo-conductual, humanista, sistémico).',
    50,
    7500,   -- 75€
    true
  ),
  (
    gen_random_uuid(),
    'Terapia de pareja',
    'Sesión de terapia de pareja con enfoque sistémico y comunicación consciente.',
    75,
    10500,  -- 105€
    true
  ),
  (
    gen_random_uuid(),
    'Bono 4 sesiones',
    'Paquete de 4 sesiones individuales con descuento. Validez 3 meses desde la compra.',
    50,
    28000,  -- 280€ (ahorra 20€)
    true
  )
on conflict do nothing;
