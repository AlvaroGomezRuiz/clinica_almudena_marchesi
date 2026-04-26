/**
 * Saludo en español según hora local del cliente/servidor (Madrid implícita vía Date del caller).
 */
export type SaludoDiurno = 'Buenos días' | 'Buenas tardes' | 'Buenas noches';

export function saludoDiurnoEs(date: Date): SaludoDiurno {
  const h = date.getHours();
  if (h >= 6 && h < 12) return 'Buenos días';
  if (h >= 12 && h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

/** Primera palabra del nombre para títulos (evita email/slug). */
export function primerNombre(displayName: string | null | undefined, fallback: string): string {
  const t = displayName?.trim();
  if (!t) return fallback;
  return t.split(/\s+/)[0] ?? fallback;
}
