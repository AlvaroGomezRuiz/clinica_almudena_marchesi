-- =============================================================================
-- 0044 — Servicio "Sesión individual pareja" (90 € / 50 min)
-- =============================================================================
-- Sesión para dos personas en formato breve (distinta de "Terapia de pareja"
-- 75 min / 105 €). Aparece en /portal/citas/reservar junto al resto de activos.
-- Idempotente: solo inserta si no existe el nombre.
-- =============================================================================

begin;

insert into public.servicios (
  nombre,
  descripcion,
  duracion_minutos,
  precio_centimos,
  activo
)
select
  'Sesión individual pareja',
  'Sesión para dos personas cuando conviene un formato más breve que la sesión completa de pareja. Ideal para focos concretos o seguimiento.',
  50,
  9000,
  true
where not exists (
  select 1 from public.servicios where nombre = 'Sesión individual pareja'
);

commit;
