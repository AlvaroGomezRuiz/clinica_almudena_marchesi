/**
 * Datos de marca para cabecera/pie de correo (Resend / Edge).
 * Mantener alineado con `frontend/src/lib/clinic.ts` y drawer público.
 */

/** Título de documento <title> y línea de copyright bajo el bloque principal. */
export const CLINIC_EMAIL_DOC_TITLE = 'Clínica Almudena Marchesi Fernández' as const;

/**
 * Filtro en [Resend](https://resend.com) → **Emails** → *Tags* (`brand:almudena`).
 * Misma clave en todos los envíos transaccionales (auditoría).
 */
export const CLINIC_RESEND_TAG_BRAND = 'almudena' as const;

export const CLINIC_EMAIL_HEADER_LINE1 = 'Almudena Marchesi Fernández';
export const CLINIC_EMAIL_HEADER_LINE2 = 'Psicología clínica · Moncloa, Madrid';

/** Misma bandeja que `CLINIC_CONTACT_EMAIL` en el frontend. */
export const CLINIC_EMAIL_CONTACT_ADDRESS = 'clinica.almudena.marchesi@outlook.com' as const;

export const CLINIC_EMAIL_FOOTER_LEGAL =
  'Clínica Almudena Marchesi Fernández · Colegiada nº M-38427';

/** Dirección (sin teléfono); el teléfono va con enlace `tel:` en la plantilla. */
export const CLINIC_EMAIL_FOOTER_ADDRESS =
  'Calle de Meléndez Valdés número 22, piso 1D, Madrid';

/** Mismo valor que `frontend/src/lib/clinic.ts` (visible en pie de correo). */
export const CLINIC_PUBLIC_PHONE_DISPLAY = '+34 646 445 991' as const;

/** Solo dígitos y + para `href="tel:"`. */
export const CLINIC_PUBLIC_PHONE_TEL = '+34646445991' as const;
