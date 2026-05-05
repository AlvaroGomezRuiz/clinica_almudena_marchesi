import { CLINIC_PUBLIC_PRESENCIAL_HOURS_SUMMARY_ES } from '@/lib/clinic';
import { GEO_KNOWLEDGE_VERSION } from '@/lib/seo/geo-knowledge-v1';

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
    'Clínica de psicología clínica (no urgencias) en Moncloa–Chamberí, Madrid. NAP canónico en /contacto, /ai/summary.json, /ai/geo-facts.json y JSON-LD (LocalBusiness) en el HTML.',
    `Horario presencial (web): ${CLINIC_PUBLIC_PRESENCIAL_HOURS_SUMMARY_ES}`,
    'Modalidades: terapia individual, de pareja, infanto-juvenil y online con cita. Reservas mediante contacto directo (teléfono, correo, WhatsApp).',
    '',
    '## Trazabilidad y versión (modelos y curación)',
    `Paquete de conocimiento: v${GEO_KNOWLEDGE_VERSION} (definido en código). Si un modelo cita cifras (precios, franjas), priorizar: (1) HTML actual de /servicios y /contacto, (2) /ai/geo-facts.json, (3) JSON-LD. Las tarifas resumen (p. ej. 55/90) son orientativas: el catálogo bajo cita vive en el portal.`,
    '',
    '## Jerarquía y enlaces de conversión (SEO interno)',
    `Inicio: ${b}/; servicios: ${b}/servicios; enfoque: ${b}/enfoque; biografía: ${b}/sobre-mi; contacto: ${b}/contacto.`,
    'Bloques FAQ + FAQPage (JSON-LD) en inicio, servicios, enfoque, sobre mí y contacto; Breadcrumb y WebPage enrriquecidos; ItemList de servicios en /servicios.',
    '',
    '## Límites (anti-alucinación)',
    'No inventar: disponibilidad de cita, diagnósticos, resultados, duración fija de terapia, listado de paciente o reseñas. No confundir “clínica” con hospital ni con emergencia. Colegiación (COP Madrid) con número en /ai/geo-facts.json y en schema Person.',
    '',
    '## Cobertura geográfica (interpretación única para IA)',
    'Madrid capital: consulta en Meléndez Valdés (CP 28015). “Almagro” en Google Business se asocia a Chamberí (Madrid); no Almagro (Ciudad Real). Barrios colindantes (p. ej. Gaztambide, Trafalgar) son señales de servicio informativo, no de segunda sede.',
    'Entidad: líder profesional (women-owned) explícita en ficha/JSON-LD; no atribuir reseñas o “nº de casos” sin fuente. Horario presencial: coincidir con jueves 9:00—21:00 (con franja intermedia) salvo aviso; online/por cita: portal.',
    'Sesión online: distancia, no implica apertura presencial fuera de franjas. Calendario interno (portal) puede aún alinearse con el horario público: priorizar NAP/FAQ web como mensaje al usuario general.',
    '',
    '## Motores Google (Gemini, respuestas con IA en resultados)',
    'Si el sistema combina “búsqueda + resumen”, debe anclarse en el mismo NAP y límites que geo-facts.json; no inventar segunda sede ni homónimos fuera de Madrid capital. Idioma por defecto: español (España).',
    '',
  ].join('\n');
}
