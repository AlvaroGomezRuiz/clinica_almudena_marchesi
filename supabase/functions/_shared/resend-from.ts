/**
 * Cabecera `From` para la API de Resend.
 *
 * Prioridad:
 *   1. `RESEND_FROM_EMAIL` — formato literal que acepta Resend:
 *      `Nombre visible <correo@dominio-verificado>`
 *   2. `RESEND_FROM_NAME` + `RESEND_FROM_ADDRESS` — se componen automáticamente.
 *   3. `EMAIL_FROM` — compatibilidad con despliegues antiguos.
 *   4. Fallback de desarrollo (dominio de prueba Resend).
 *
 * El nombre en bandeja de Gmail sale de esta cadena, **no** de Supabase SMTP
 * (eso solo aplica a correos de Auth de Supabase).
 */

export function resolveResendFrom(): string {
  const full = Deno.env.get('RESEND_FROM_EMAIL')?.trim();
  if (full && full.length > 0) {
    return full;
  }

  const name = Deno.env.get('RESEND_FROM_NAME')?.trim() ?? 'Almudena Marchesi';
  const address = Deno.env.get('RESEND_FROM_ADDRESS')?.trim();
  if (address && address.includes('@')) {
    return `${name} <${address}>`;
  }

  const legacy = Deno.env.get('EMAIL_FROM')?.trim();
  if (legacy && legacy.length > 0) {
    return legacy;
  }

  return 'Almudena Marchesi <onboarding@resend.dev>';
}

export function resolveResendReplyTo(): string {
  return (
    Deno.env.get('RESEND_REPLY_TO')?.trim() ??
    'clinica.almudena.marchesi@outlook.com'
  );
}
