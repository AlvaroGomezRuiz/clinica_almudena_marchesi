/**
 * Etiquetas comunes a todos los envíos vía `sendViaResend` (auditoría en el panel
 * de Resend). La API acota a **3** tags: brand + type + 1 extra opcional.
 */
import { CLINIC_RESEND_TAG_BRAND } from './clinic-brand.ts';

const MAX_RESEND_TAGS = 3 as const;

export function resendEmailTags(
  type: string,
  extra?: ReadonlyArray<{ name: string; value: string }>
): Array<{ name: string; value: string }> {
  const out: Array<{ name: string; value: string }> = [
    { name: 'brand', value: CLINIC_RESEND_TAG_BRAND },
    { name: 'type', value: type },
  ];
  if (extra == null) return out;
  for (let i = 0; i < extra.length; i += 1) {
    if (out.length >= MAX_RESEND_TAGS) break;
    const t = extra[i];
    if (t) out.push(t);
  }
  return out;
}
