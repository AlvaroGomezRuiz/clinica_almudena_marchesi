-- =============================================================================
-- Migration 0039 — Catálogo de servicios y bonos (precios + pareja)
-- =============================================================================
-- Contexto (PLAN_REMEDIACION_22_ABR.md · FASE 1 · Issue #2 y #7):
--
-- Issue #2 (Almudena): "falta sesión individual suelta y bonos y luego la
--   de pareja" — el portal no ofrece bonos de terapia de pareja.
--
-- Issue #7 (Almudena): la vista "Bonos y Pagos" del paciente mezcla
--   etiquetas sin servicio → los bonos existentes deben llamarse
--   explícitamente "Bono N sesiones · Individual" para disambiguar.
--
-- Decisiones del usuario (mensaje literal 22-abr):
--   "la sesion individual son 55€ la pareja calcula mas o menso
--    los bonos calcula mas o menos la primera no es gratuita"
--
-- Traducción a esquema:
--   * Sesión individual suelta: 75 → 55 €.
--   * Terapia de pareja suelta: 105 → 105 € (SIN cambiar; "calcula más o
--     menos" no es instrucción de bajar y el precio actual es real).
--   * Bonos INDIVIDUALES existentes (165 / 270 / 510): SE MANTIENEN TAL
--     CUAL. Sólo se renombran para llevar el sufijo "· Individual" y
--     facilitar el rediseño de la vista del paciente.
--   * Bonos de PAREJA: nuevos. 3 sesiones a 305 € y 5 sesiones a 495 €
--     (precios proporcionales a la sesión de pareja 105 € con descuento
--     progresivo 3 % / 6 %).
--   * Primera consulta 90 €: sin cambios ("no es gratuita").
--
-- Idempotencia:
--   Usamos UPDATE por `nombre` para los existentes (preserva UUIDs) y
--   UPSERT por clave natural (servicio_id, sesiones) para los nuevos.
--   Re-ejecutar la migración deja la tabla en el mismo estado.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Precios de servicios — sólo el que el usuario pidió bajar explícitamente
-- ---------------------------------------------------------------------------

update public.servicios
   set precio_centimos = 5500,  -- 55 €
       updated_at      = now()
 where nombre = 'Sesión individual';

-- "Terapia de pareja" y "Primera consulta" NO se tocan. El usuario dijo
-- "calcula más o menos" para pareja y "no es gratuita" para la primera.
-- Ninguna instrucción de bajar precios existentes → se mantienen.

-- "Bono 4 sesiones" fue modelado por error como servicio en 0005.
-- No lo borramos (por si alguna cita histórica lo referencia vía FK
-- servicio_id), pero lo desactivamos para que no aparezca en el selector
-- de reserva.
update public.servicios
   set activo = false,
       updated_at = now()
 where nombre = 'Bono 4 sesiones';

-- ---------------------------------------------------------------------------
-- 2. Garantizar unicidad (servicio_id, sesiones) en bonos_config
-- ---------------------------------------------------------------------------
-- Sin esto el ON CONFLICT del UPSERT fallaría. Mantiene idempotencia.

create unique index if not exists bonos_config_servicio_sesiones_uk
  on public.bonos_config(servicio_id, sesiones);

-- ---------------------------------------------------------------------------
-- 3. Renombrar bonos INDIVIDUALES existentes y asegurar servicio correcto
-- ---------------------------------------------------------------------------
-- Precios NO se tocan (165/270/510 € son las instrucciones de Almudena).
-- Sólo el nombre se enriquece con el sufijo "· Individual" y se enlaza
-- explícitamente al servicio "Sesión individual" (en 0010 se usaba el
-- primer servicio encontrado como fallback arbitrario).

do $mig$
declare
  v_servicio_individual uuid;
  v_servicio_pareja     uuid;
begin
  select id into v_servicio_individual
    from public.servicios
   where nombre = 'Sesión individual'
   order by created_at asc  -- determinista si hubiese duplicados
   limit 1;

  select id into v_servicio_pareja
    from public.servicios
   where nombre = 'Terapia de pareja'
   order by created_at asc
   limit 1;

  if v_servicio_individual is null then
    raise exception
      'Migration 0039: falta servicio "Sesión individual" — aplica 0005_seed_servicios.sql';
  end if;

  if v_servicio_pareja is null then
    raise exception
      'Migration 0039: falta servicio "Terapia de pareja" — aplica 0005_seed_servicios.sql';
  end if;

  -- 3a. Rename + re-link bonos individuales existentes (NO cambiar precio)
  update public.bonos_config
     set nombre      = 'Bono 3 sesiones · Individual',
         descripcion = 'Tres sesiones de psicoterapia individual con descuento. Validez 120 días desde la compra.',
         servicio_id = v_servicio_individual,
         validez_dias = coalesce(validez_dias, 120),
         orden        = 10,
         updated_at   = now()
   where nombre in ('Bono 3 sesiones', 'Bono 3 sesiones · Individual')
     and sesiones = 3;

  update public.bonos_config
     set nombre      = 'Bono 5 sesiones · Individual',
         descripcion = 'Cinco sesiones de psicoterapia individual con descuento. Validez 180 días.',
         servicio_id = v_servicio_individual,
         validez_dias = coalesce(validez_dias, 180),
         orden        = 20,
         destacado    = true,
         updated_at   = now()
   where nombre in ('Bono 5 sesiones', 'Bono 5 sesiones · Individual')
     and sesiones = 5;

  update public.bonos_config
     set nombre      = 'Bono 10 sesiones · Individual',
         descripcion = 'Diez sesiones de psicoterapia individual con descuento máximo. Validez 365 días.',
         servicio_id = v_servicio_individual,
         validez_dias = coalesce(validez_dias, 365),
         orden        = 30,
         updated_at   = now()
   where nombre in ('Bono 10 sesiones', 'Bono 10 sesiones · Individual')
     and sesiones = 10;

  -- 3b. Insertar bonos de PAREJA si no existían
  insert into public.bonos_config
    (nombre, descripcion, servicio_id, sesiones, precio_centimos,
     validez_dias, destacado, activo, orden)
  values
    ('Bono 3 sesiones · Pareja',
     'Tres sesiones de terapia de pareja con descuento. Validez 120 días.',
     v_servicio_pareja, 3, 30500, 120, false, true, 40),
    ('Bono 5 sesiones · Pareja',
     'Cinco sesiones de terapia de pareja con descuento. Validez 180 días.',
     v_servicio_pareja, 5, 49500, 180, false, true, 50)
  on conflict (servicio_id, sesiones) do update
    set nombre       = excluded.nombre,
        descripcion  = excluded.descripcion,
        precio_centimos = case
          when bonos_config.precio_centimos is distinct from 0
            then bonos_config.precio_centimos  -- respetar precio manual si existía
          else excluded.precio_centimos
        end,
        validez_dias = coalesce(bonos_config.validez_dias, excluded.validez_dias),
        activo       = true,
        orden        = excluded.orden,
        updated_at   = now();
end
$mig$;

commit;

-- =============================================================================
-- Verificación (debe devolver 5 filas con los precios correctos):
--   select nombre, sesiones, precio_centimos/100 as eur, orden
--     from public.bonos_config
--    where activo = true
--    order by orden;
--
-- Esperado:
--   Bono 3 sesiones · Individual   |  3 | 165 |  10
--   Bono 5 sesiones · Individual   |  5 | 270 |  20
--   Bono 10 sesiones · Individual  | 10 | 510 |  30
--   Bono 3 sesiones · Pareja       |  3 | 305 |  40
--   Bono 5 sesiones · Pareja       |  5 | 495 |  50
-- =============================================================================
