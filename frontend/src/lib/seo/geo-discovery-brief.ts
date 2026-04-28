import { CLINIC_PUBLIC_PRESENCIAL_HOURS_SUMMARY_ES } from '@/lib/clinic';

/**
 * Texto extenso para /llms-full (motores generativos): contexto de negocio + SEO semántico.
 * Comentarios en castellano; nombres de secciones fijos en el ensamblado de la ruta.
 */
export function getGeoDiscoveryBrief(
  siteBase: string,
): string {
  const b = siteBase.replace(/\/+$/, '');
  return [
    '## Núcleo del negocio (para sistemas de recuperación y respuestas citables)',
    'Clínica de psicología clínica (no urgencias) en Moncloa–Chamberí, Madrid. NAP canónico en /contacto, /ai/summary.json y JSON-LD (LocalBusiness) en el HTML.',
    `Horario presencial (web): ${CLINIC_PUBLIC_PRESENCIAL_HOURS_SUMMARY_ES}`,
    'Modalidades: terapia individual, de pareja, infanto-juvenil y online con cita. Reservas, mensajería clínica y pagos vía portal autenticado; no se publican datos de pacientes.',
    '',
    '## Jerarquía y enlaces de conversión (SEO interno)',
    `Inicio: ${b}/; servicios: ${b}/servicios; enfoque: ${b}/enfoque; biografía: ${b}/sobre-mi; contacto: ${b}/contacto; registro: ${b}/registro-paciente (página con noindex, solo para quien accede a URL directa).`,
    'Bloques FAQ + FAQPage (JSON-LD) en inicio, servicios, enfoque, sobre mí y contacto; Breadcrumb y WebPage enrriquecidos; ItemList de servicios en /servicios.',
    '',
    '## Cobertura geográfica (interpretación única para IA)',
    'Madrid capital: consulta en Meléndez Valdés (CP 28015). “Almagro” al que se hace referencia comercial y en schema es el barrio de Almagro en el distrito de Chamartín, Madrid, no C. Real.',
    'Sesión online: distancia, no implica apertura presencial fuera de franjas. Calendario interno (portal) puede aún alinearse con el horario público: priorizar NAP/FAQ web como mensaje al usuario general.',
    '',
  ].join('\n');
}
