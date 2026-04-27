/**
 * Partes de reloj en Europe/Madrid para alinear agenda y validaciones con la franja clínica.
 */

const MADRID_TZ = 'Europe/Madrid' as const;

export function getMadridHourMinute(date: Date): { readonly hour: number; readonly minute: number } {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: MADRID_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const hourRaw = parts.find((p) => p.type === 'hour')?.value;
  const minuteRaw = parts.find((p) => p.type === 'minute')?.value;
  const hour = hourRaw !== undefined ? Number.parseInt(hourRaw, 10) : 0;
  const minute = minuteRaw !== undefined ? Number.parseInt(minuteRaw, 10) : 0;
  return { hour, minute };
}

export function formatMadridHHmm(date: Date): string {
  const { hour, minute } = getMadridHourMinute(date);
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
