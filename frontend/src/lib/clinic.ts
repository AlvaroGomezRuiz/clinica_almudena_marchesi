import { z } from 'zod';

/**
 * URL canónica del sitio. En Vercel debe coincidir con NEXT_PUBLIC_SITE_URL (p. ej. https://ampsicologia.es).
 * Orden: env de despliegue → fallback seguro para metadata/OG en build.
 */
export const CLINIC_PUBLIC_SITE_URL: string =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  'https://ampsicologia.es';

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
export const CLINIC_PRICE_INDIVIDUAL_CENTIMOS = 5500;

/** Tarifa terapia de pareja (céntimos). = "Terapia de pareja" activo. */
export const CLINIC_PRICE_PAREJA_CENTIMOS = 9000;

/** Packs = `bonos_config` nombres "Bono N sesiones · Individual" / "· Pareja". */
export const CLINIC_CATALOGO_BONO_INDIVIDUAL_3_CENTIMOS = 16500;

export const CLINIC_CATALOGO_BONO_INDIVIDUAL_5_CENTIMOS = 27000;
export const CLINIC_CATALOGO_BONO_INDIVIDUAL_10_CENTIMOS = 51000;

/**
 * Tras `0058` (90 €/sesión pareja): 30500→26143, 49500→42429
 * (proporcional, coherentes con catálogo).
 */
export const CLINIC_CATALOGO_BONO_PAREJA_3_CENTIMOS = 26143;
export const CLINIC_CATALOGO_BONO_PAREJA_5_CENTIMOS = 42429;

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
export const CLINIC_TARIFAS_SESION_RESUMEN = 'Individual 55 € · Pareja 90 €' as const;

/**
 * @deprecated Prefer `formatClinicPrecioEUR` o `CLINIC_TARIFAS_SESION_RESUMEN`.
 * Se mantiene para imports legacy; ya no oculta precio en producción.
 */
export const CLINIC_SESSION_PRICE_LABEL = CLINIC_TARIFAS_SESION_RESUMEN;

export const CLINIC_ADDRESS_LINE1 =
  'Calle de Meléndez Valdés número 22, piso 1D';
export const CLINIC_ADDRESS_LINE2 = 'Madrid';

export const CLINIC_ADDRESS = `${CLINIC_ADDRESS_LINE1}, ${CLINIC_ADDRESS_LINE2}`;

/** Código postal de la consulta (JSON-LD, GEO). */
export const CLINIC_POSTAL_CODE = '28015' as const;

/**
 * Coordenadas aproximadas de la consulta (Moncloa–Chamberí) para JSON-LD, ICBM y señales GEO.
 * Ajustar si la ubicación exacta cambia.
 */
export const CLINIC_GEO_LAT = 40.4347;
export const CLINIC_GEO_LNG = -3.7049;

/** Número de colegiación oficial (pie de correo, RGPD, cabeceras clínicas). */
export const CLINIC_PROFESSIONAL_LICENSE = 'M-38427' as const;

/** Teléfono de contacto público (NAP, JSON-LD, pie de página). */
export const CLINIC_PUBLIC_PHONE_DISPLAY = '+34 646 445 991' as const;

/** Mismo número en formato E.164 para `tel:` y schema.org `telephone`. */
export const CLINIC_PUBLIC_PHONE_E164 = '+34646445991' as const;

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
  if (raw == null || raw.trim() === '') {
    return [];
  }
  const parts = raw
    .split(/[,;]/u)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  const urlSchema = z.string().url();
  const out: string[] = [];
  for (const p of parts) {
    const parsed = urlSchema.safeParse(p);
    if (parsed.success) {
      out.push(parsed.data);
    }
  }
  return out;
}

export function getClinicAbsoluteImageUrl(path: string): string {
  const base = CLINIC_PUBLIC_SITE_URL.replace(/\/+$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}
