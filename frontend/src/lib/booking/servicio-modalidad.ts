/**
 * Inferencia de modalidad de sesión para copy UX (reserva / políticas).
 * No sustituye reglas de negocio en servidor: solo texto coherente con nombre + duración.
 */

export interface ServicioModalidadInput {
  readonly nombre: string;
  readonly duracion_minutos: number;
}

export type ServicioModalidad = 'pareja' | 'individual';

export function inferModalidadServicio(s: ServicioModalidadInput): ServicioModalidad {
  const n = s.nombre.trim().toLowerCase();
  if (
    n.includes('pareja') ||
    n.includes('parejas') ||
    n.includes('de pareja') ||
    n.includes('terapia pareja')
  ) {
    return 'pareja';
  }
  if (s.duracion_minutos >= 70) {
    return 'pareja';
  }
  return 'individual';
}
