import { z } from 'zod';

/**
 * URL canónica del sitio. En Vercel debe coincidir con NEXT_PUBLIC_SITE_URL (p. ej. https://ampsicologia.es).
 * Orden: env de despliegue → fallback seguro para metadata/OG en build.
 */
export const CLINIC_PUBLIC_SITE_URL: string =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  'https://ampsicologia.es';

/**
 * Host público sin `www.` para `<title>`, PWA y Open Graph `siteName`
 * (p. ej. `ampsicologia.es` si la canónica es `https://www.ampsicologia.es/`).
 */
export const CLINIC_PUBLIC_SITE_HOST_LABEL: string = ((): string => {
  try {
    const h = new URL(CLINIC_PUBLIC_SITE_URL).hostname.toLowerCase();
    if (h === '') {
      return 'ampsicologia.es';
    }
    return h.startsWith('www.') ? h.slice(4) : h;
  } catch {
    return 'ampsicologia.es';
  }
})();

/** Contacto único clínico (público, RGPD, facturación manual referida). */
export const CLINIC_CONTACT_EMAIL = 'clinica.almudena.marchesi@outlook.com' as const;

export const CLINIC_SESSION_DURATION_MIN = 50;

/**
 * Tarifas y packs deben coincidir con:
 * - `public.servicios` (precio por servicio, activo, nombres canónicos)
 * - `public.bonos_config` (packs, `precio_centimos` por `servicio_id` + `sesiones`)
 * Migración de referencia: `0039`, `0058` (sobre todo 90 € pareja, bonos 55/90 y
 * reescala de bonos de pareja).
 */

/** Tarifa sesión individual (céntimos). = `services` "Sesión individual" activo. */
export const CLINIC_PRICE_INDIVIDUAL_CENTIMOS = 6500;

/** Tarifa terapia de pareja (céntimos). = "Terapia de pareja" activo. */
export const CLINIC_PRICE_PAREJA_CENTIMOS = 7500;

/** Packs = `bonos_config` nombres "Bono N sesiones · Individual" / "· Pareja". */
export const CLINIC_CATALOGO_BONO_INDIVIDUAL_3_CENTIMOS = 19500;

export const CLINIC_CATALOGO_BONO_INDIVIDUAL_5_CENTIMOS = 32000;
export const CLINIC_CATALOGO_BONO_INDIVIDUAL_10_CENTIMOS = 61000;

/**
 * Tras reescala a 75 €/sesión pareja (desde 90 € y 105 € históricos): proporcionales.
 */
export const CLINIC_CATALOGO_BONO_PAREJA_3_CENTIMOS = 21786;
export const CLINIC_CATALOGO_BONO_PAREJA_5_CENTIMOS = 35357;

export function formatClinicPrecioEUR(centimos: number): string {
  return (centimos / 100).toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  });
}

/**
 * Ahorro del pack frente a N pagos a tarifa de sesión (copys bonos, landing).
 */
export function formatClinicBonoAhorroVsSueltoIndividual(
  numSesiones: 5 | 10
): string {
  const packCents =
    numSesiones === 5
      ? CLINIC_CATALOGO_BONO_INDIVIDUAL_5_CENTIMOS
      : CLINIC_CATALOGO_BONO_INDIVIDUAL_10_CENTIMOS;
  const suelto = numSesiones * CLINIC_PRICE_INDIVIDUAL_CENTIMOS;
  const ahorro = suelto - packCents;
  if (ahorro < 0) {
    return `Pack ${formatClinicPrecioEUR(packCents)}`;
  }
  return `Ahorro ${formatClinicPrecioEUR(ahorro)} frente a ${numSesiones} × ${formatClinicPrecioEUR(CLINIC_PRICE_INDIVIDUAL_CENTIMOS)} sueltas`;
}

export function formatClinicBonoAhorroVsSueltoPareja(
  numSesiones: 3 | 5
): string {
  const packCents =
    numSesiones === 3
      ? CLINIC_CATALOGO_BONO_PAREJA_3_CENTIMOS
      : CLINIC_CATALOGO_BONO_PAREJA_5_CENTIMOS;
  const suelto = numSesiones * CLINIC_PRICE_PAREJA_CENTIMOS;
  const ahorro = suelto - packCents;
  if (ahorro < 0) {
    return `Pack ${formatClinicPrecioEUR(packCents)}`;
  }
  return `Ahorro ${formatClinicPrecioEUR(ahorro)} frente a ${numSesiones} × ${formatClinicPrecioEUR(CLINIC_PRICE_PAREJA_CENTIMOS)} sueltas`;
}

/** Texto compacto para hero, pies y copy legal. */
export const CLINIC_TARIFAS_SESION_RESUMEN = 'Individual 65 € · Pareja 75 € · Infanto-Juvenil 65 €' as const;

/**
 * @deprecated Prefer `formatClinicPrecioEUR` o `CLINIC_TARIFAS_SESION_RESUMEN`.
 * Se mantiene para imports legacy; ya no oculta precio en producción.
 */
export const CLINIC_SESSION_PRICE_LABEL = CLINIC_TARIFAS_SESION_RESUMEN;

export const CLINIC_ADDRESS_LINE1 =
  'Calle de Meléndez Valdés';
export const CLINIC_ADDRESS_LINE2 = 'Madrid';

export const CLINIC_ADDRESS = `${CLINIC_ADDRESS_LINE1}, ${CLINIC_ADDRESS_LINE2}`;

/** Código postal de la consulta (JSON-LD, GEO). */
export const CLINIC_POSTAL_CODE = '28015' as const;

/**
 * Fecha de apertura del negocio (NAP/entidad; AAAA-MM-DD) — alinear con ficha
 * pública (p. ej. Google Business) cuando se actualice.
 */
export const CLINIC_BUSINESS_OPENING_DATE_ISO = '2026-04-13' as const;

/**
 * Descripción canónica de entidad (JSON-LD, GEO) — informativa, alineable con
 * ficha; no sustituye consentimiento clínico ni cita.
 */
export const CLINIC_ENTITY_DESCRIPTION_ES: string =
  'AM Psicología (Clínica Almudena Marchesi): psicoterapia con Almudena Marchesi Fernández en Moncloa, Argüelles y Chamberí, Madrid. Enfoque integrador: ansiedad, depresión, estrés, duelo y dificultades relacionales; individual, pareja, infanto-juvenil y online con criterio. Portal del paciente para citas, pago y mensajería. Cita en Calle de Meléndez Valdés, 1D, 28015. Presencial: jueves; consulta disponibilidad online en portal.';

/** Meta description de la home: orientada a CTR; la dirección detallada queda en FAQ/contacto/JSON-LD de negocio. */
export const CLINIC_HOME_META_DESCRIPTION_ES: string =
  'Psicología clínica en Moncloa y Chamberí, Madrid: terapia individual, de pareja e infanto-juvenil. Ansiedad, estado de ánimo, estrés y duelo. Psicóloga colegiada M-38427. Reserva y seguimiento en el portal del paciente.';

/**
 * Perfiles sociales verificados a incluir en `sameAs` si no vienen en env
 * (deduplicado por URL en `getClinicSameAsUrls`).
 */
const CLINIC_SAME_AS_BUILTIN: readonly [string, ...string[]] = [
  'https://es.linkedin.com/in/almudena-marchesi-fern%C3%A1ndez-06448817b',
] as const;

/**
 * Coordenadas aproximadas de la consulta (Moncloa–Chamberí) para JSON-LD, ICBM y señales GEO.
 * Ajustar si la ubicación exacta cambia.
 */
export const CLINIC_GEO_LAT = 40.4347;
export const CLINIC_GEO_LNG = -3.7049;

/** Número de colegiación oficial (pie de correo, RGPD, cabeceras clínicas). */
export const CLINIC_PROFESSIONAL_LICENSE = 'M-38427' as const;

/** Teléfono de contacto público (NAP, JSON-LD, pie de página; alineado con GMB). */
export const CLINIC_PUBLIC_PHONE_DISPLAY = '+34 646 44 59 91' as const;

/** Mismo número en formato E.164 para `tel:` y schema.org `telephone`. */
export const CLINIC_PUBLIC_PHONE_E164 = '+34646445991' as const;

/**
 * Filas de horario **presencial** en página Contacto, FAQ y JSON-LD `LocalBusiness`.
 * Puede no coincidir todavía con la agenda interna del portal hasta alineación operativa.
 * De momento: apertura presencial solo jueves (mañana y tarde con franja intermedia).
 */
export const CLINIC_PUBLIC_PRESENCIAL_SCHEDULE_ROWS: ReadonlyArray<{
  readonly day: string;
  readonly hours: string;
}> = [
  { day: 'Lunes — Miércoles', hours: 'Cerrado (presencial)' },
  { day: 'Jueves', hours: '9:00 — 15:00 · 16:00 — 21:00' },
  { day: 'Viernes — Domingo', hours: 'Cerrado (presencial)' },
] as const;

/**
 * Resumen en prosa para metadatos y FAQ (no afecta a lógica de reservas del portal).
 */
export const CLINIC_PUBLIC_PRESENCIAL_HOURS_SUMMARY_ES: string =
  'Atención presencial en el consultorio: de momento solo los jueves, en franja de mañana (9:00—15:00) y de tarde (16:00—21:00). El resto de días el consultorio permanece cerrado en lo presencial. El calendario de huecos en el portal y otras modalidades (p. ej. online) siguen su propia disponibilidad hasta alinear criterios operativos.';

export const CLINIC_PAYMENT_METHODS = [
  'Efectivo',
  'Transferencia',
  'Stripe',
] as const;

export const CLINIC_GOOGLE_MAPS_QUERY = 'Calle de Meléndez Valdés 22, Madrid';

export function getClinicGoogleMapsHref(): string {
  return `https://maps.google.com/?q=${encodeURIComponent(CLINIC_GOOGLE_MAPS_QUERY)}`;
}

/**
 * URLs externas verificadas (p. ej. ficha de Google) para `sameAs` en JSON-LD.
 * `NEXT_PUBLIC_CLINIC_SAME_AS`: varias URL separadas por coma o `;` (solo `https:`).
 */
export function getClinicSameAsUrls(): readonly string[] {
  const raw = process.env.NEXT_PUBLIC_CLINIC_SAME_AS;
  const fromEnv: string[] = [];
  if (raw != null && raw.trim() !== '') {
    const parts = raw
      .split(/[,;]/u)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    const urlSchema = z.string().url();
    for (const p of parts) {
      const parsed = urlSchema.safeParse(p);
      if (parsed.success) {
        fromEnv.push(parsed.data);
      }
    }
  }
  const merged = [...fromEnv, ...CLINIC_SAME_AS_BUILTIN] as const;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of merged) {
    if (!seen.has(u)) {
      seen.add(u);
      out.push(u);
    }
  }
  return out;
}

export function getClinicAbsoluteImageUrl(path: string): string {
  const base = CLINIC_PUBLIC_SITE_URL.replace(/\/+$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}
