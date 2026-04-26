-- ============================================================================
-- 0058_servicios_tarifas_55_90_limpiar_catalogo.sql
--
-- Coherencia con frontend: `frontend/src/lib/clinic.ts` (CLINIC_PRICE_*,
-- CLINIC_CATALOGO_BONO_* y helpers de ahorro). Tras cambiar cifras aquí,
-- actualizar esas constantes y la landing `/servicios`.
--
-- Catálogo de sesiones alineado con tarifas actuales de la consulta:
--   * Sesión individual: 55 €
--   * Terapia de pareja: 90 €
--
-- Limpieza UX (portal reserva / pagos):
--   * "Primera consulta" se desactiva (evita duplicar primera sesión a 90 €).
--   * "Sesión individual pareja" se desactiva (misma franja que pareja 90 €).
--
-- Bonos_config: los bonos de pareja existentes se reescalan ~proporcional
-- (105 € → 90 € sesión de referencia) para no vender packs incoherentes.
-- ============================================================================

begin;

update public.servicios
   set precio_centimos = 5500,
       updated_at      = now()
 where nombre = 'Sesión individual'
   and activo = true;

update public.servicios
   set precio_centimos = 9000,
       updated_at      = now()
 where nombre = 'Terapia de pareja'
   and activo = true;

update public.servicios
   set activo     = false,
       updated_at = now()
 where nombre = 'Primera consulta';

update public.servicios
   set activo     = false,
       updated_at = now()
 where nombre = 'Sesión individual pareja';

-- Reescala bonos de pareja sólo si siguen en los importes de la migración 0039
-- (idempotente si 0058 se reaplica o los precios ya se ajustaron a mano).
update public.bonos_config
   set precio_centimos = 26143,
       updated_at      = now()
 where nombre = 'Bono 3 sesiones · Pareja'
   and activo = true
   and precio_centimos = 30500;

update public.bonos_config
   set precio_centimos = 42429,
       updated_at      = now()
 where nombre = 'Bono 5 sesiones · Pareja'
   and activo = true
   and precio_centimos = 49500;

commit;
