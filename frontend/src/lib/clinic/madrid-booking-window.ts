import { getMadridHourMinute } from '@/lib/agenda/madrid-wall-clock';

/**
 * Ventana de inicio de sesión en la consulta (Europe/Madrid): 09:00–21:59.
 */
export function isMadridInstantWithinClinicBookingWindow(instant: Date): boolean {
  const { hour, minute } = getMadridHourMinute(instant);
  const mins = hour * 60 + minute;
  return mins >= 9 * 60 && mins <= 21 * 60 + 59;
}
