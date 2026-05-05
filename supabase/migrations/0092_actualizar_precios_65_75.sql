-- ============================================================================
-- 0092_actualizar_precios_65_75.sql
--
-- Coherencia con frontend: `frontend/src/lib/clinic.ts` (CLINIC_PRICE_*,
-- CLINIC_CATALOGO_BONO_*).
--
-- Catálogo de sesiones:
--   * Sesión individual: 65 € (antes 55 €)
--   * Terapia de pareja: 75 € (antes 90 €)
--
-- Bonos_config individuales:
--   * Bono 3: 195 € (sin ahorro)
--   * Bono 5: 320 € (ahorro 5 €)
--   * Bono 10: 610 € (ahorro 40 €)
--
-- Bonos_config pareja (proporcionales al histórico de escalado):
--   * Bono 3: 217.86 €
--   * Bono 5: 353.57 €
-- ============================================================================

begin;

update public.servicios
   set precio_centimos = 6500,
       updated_at      = now()
 where nombre = 'Sesión individual'
   and activo = true;

update public.servicios
   set precio_centimos = 7500,
       updated_at      = now()
 where nombre = 'Terapia de pareja'
   and activo = true;

-- Actualización bonos individuales
update public.bonos_config
   set precio_centimos = 19500,
       updated_at      = now()
 where nombre = 'Bono 3 sesiones · Individual'
   and activo = true;

update public.bonos_config
   set precio_centimos = 32000,
       updated_at      = now()
 where nombre = 'Bono 5 sesiones · Individual'
   and activo = true;

update public.bonos_config
   set precio_centimos = 61000,
       updated_at      = now()
 where nombre = 'Bono 10 sesiones · Individual'
   and activo = true;

-- Actualización bonos de pareja
update public.bonos_config
   set precio_centimos = 21786,
       updated_at      = now()
 where nombre = 'Bono 3 sesiones · Pareja'
   and activo = true;

update public.bonos_config
   set precio_centimos = 35357,
       updated_at      = now()
 where nombre = 'Bono 5 sesiones · Pareja'
   and activo = true;

commit;
