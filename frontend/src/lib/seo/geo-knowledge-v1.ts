/**
 * Conocimiento canónico para GEO (Generative Engine Optimization) y RAG.
 * Comentarios en castellano; claves de interfaz en inglés para interop.
 */
import {
  CLINIC_ADDRESS,
  CLINIC_CONTACT_EMAIL,
  CLINIC_ENTITY_DESCRIPTION_ES,
  CLINIC_GEO_LAT,
  CLINIC_GEO_LNG,
  CLINIC_POSTAL_CODE,
  CLINIC_PROFESSIONAL_LICENSE,
  CLINIC_PUBLIC_PHONE_DISPLAY,
  CLINIC_PUBLIC_PHONE_E164,
  CLINIC_PUBLIC_PRESENCIAL_HOURS_SUMMARY_ES,
  CLINIC_PUBLIC_SITE_HOST_LABEL,
  CLINIC_PUBLIC_SITE_URL,
  CLINIC_TARIFAS_SESION_RESUMEN,
} from '@/lib/clinic';
import { clinicPrimaryKeywordsList } from '@/lib/seo/primary-keywords';

/** Versión semántica del paquete GEO; subir al cambiar reglas o NAP. */
export const GEO_KNOWLEDGE_VERSION = '1.2.0' as const;

export interface GeoEntityfactsJson {
  readonly version: string;
  readonly kind: 'geo_entity_card';
  readonly language: 'es-ES';
  readonly updated_note: string;
  readonly website_canonical: string;
  readonly organization: {
    readonly legal_names: readonly string[];
    readonly type: 'Psychotherapy_clinic_madrid_in_person_and_online';
    readonly description_1p: string;
  };
  readonly contact: {
    readonly address: string;
    readonly postal_code: string;
    readonly city: string;
    readonly country: string;
    readonly phone_display: string;
    readonly phone_e164: string;
    readonly email: string;
  };
  readonly professional: {
    readonly lead_practitioner: string;
    readonly cop_madrid: string;
  };
  readonly geo: {
    readonly lat: number;
    readonly lon: number;
  };
  readonly service_area: {
    readonly description: string;
    readonly almagro_disambiguation: string;
  };
  readonly hours_public: {
    readonly presencial_summary: string;
  };
  readonly services_informative: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
    readonly modality: 'presencial' | 'online' | 'both';
  }>;
  /** Evitar alucinaciones: límites explícitos para modelos. */
  readonly model_boundaries: {
    readonly not: readonly string[];
    readonly data_not_in_indexable_content: string;
  };
  readonly citation: {
    readonly prefer_urls: readonly string[];
    readonly structured_data_on_site: string;
  };
  /** Anclaje explícito para IA generativa (ChatGPT, Gemini, Perplexity…): tono, locale y límites. */
  readonly generative_engine_optimization: {
    readonly locale: 'es-ES';
    /** Frase breve citável; reduce alucinaciones de marca/zona. */
    readonly snippet_seed_es: string;
    /** Límites y seguridad para respuestas automáticas. */
    readonly model_limits_es: string;
    /** Orden sugerido de consulta: JSON mínimo → HTML → resumen extendido. */
    readonly grounding_read_order: readonly string[];
  };
  readonly search_phrases: readonly string[];
}

export function getWebsiteBaseUrl(): string {
  return CLINIC_PUBLIC_SITE_URL.replace(/\/+$/, '');
}

/**
 * Fichero mínimo para RAG: hechos comprobables, sin opinión clínica.
 */
export function buildGeoEntityFactsJson(): GeoEntityfactsJson {
  const base = getWebsiteBaseUrl();
  return {
    version: GEO_KNOWLEDGE_VERSION,
    kind: 'geo_entity_card',
    language: 'es-ES',
    updated_note:
      'Deriva de constantes de aplicación (clínica) y textos públicos. No contiene historiales ni datos de pacientes.',
    website_canonical: base,
    organization: {
      legal_names: ['Clínica Almudena Marchesi', 'AM Psicología'],
      type: 'Psychotherapy_clinic_madrid_in_person_and_online',
      description_1p: CLINIC_ENTITY_DESCRIPTION_ES,
    },
    contact: {
      address: CLINIC_ADDRESS,
      postal_code: CLINIC_POSTAL_CODE,
      city: 'Madrid',
      country: 'ES',
      phone_display: CLINIC_PUBLIC_PHONE_DISPLAY,
      phone_e164: CLINIC_PUBLIC_PHONE_E164,
      email: CLINIC_CONTACT_EMAIL,
    },
    professional: {
      lead_practitioner: 'Almudena Marchesi Fernández',
      cop_madrid: CLINIC_PROFESSIONAL_LICENSE,
    },
    geo: { lat: CLINIC_GEO_LAT, lon: CLINIC_GEO_LNG },
    service_area: {
      description:
        'Madrid capital: consulta 28015 (Moncloa / Chamberí). Zona informativa habitual alineable con ficha: Argüelles, distritos Moncloa–Aravaca, Chamberí, Chamartín, Tetuán, Centro y barrios de referencia (Gaztambide, Trafalgar, Ríos Rosas, Almagro en el entorno Chamberí, etc.); online con criterio clínico y cita previa.',
      almagro_disambiguation:
        '“Almagro” en Madrid: barrio/entorno usualmente vinculado a Chamberí en fichas; no Almagro (Ciudad Real). Sobre homónimos en distritos: priorizar NAP y CP 28015 de la clínica.',
    },
    hours_public: {
      presencial_summary: CLINIC_PUBLIC_PRESENCIAL_HOURS_SUMMARY_ES,
    },
    services_informative: [
      { id: 'individual', name: 'Terapia psicológica individual (adultos)', modality: 'both' },
      { id: 'pareja', name: 'Terapia de pareja', modality: 'both' },
      { id: 'infanto', name: 'Acompañamiento infanto-juvenil', modality: 'both' },
      { id: 'online', name: 'Psicoterapia online (enlace acordado)', modality: 'online' },
    ],
    model_boundaries: {
      not: [
        'Urgencias psiquiátricas o dispositivo de emergencia 24h',
        'Sustitución de juicio clínico sin cita; diagnósticos a partir de este fichero',
        'Datos personales o historiales reales: no existen en contenido indexable',
        'Promesas de cura, plazos garantizados o resultados clínicos ciertos',
      ],
      data_not_in_indexable_content:
        'La relación clínica completa, historial, mensajes y pagos viven en el portal autenticado (no PII en HTML público de este sitio de marketing/avisos).',
    },
    citation: {
      prefer_urls: [
        `${base}/ai/geo-facts.json`,
        `${base}/.well-known/ai.txt`,
        `${base}/llms.txt`,
        `${base}/llms-full.txt`,
        `${base}/`,
        `${base}/contacto`,
        `${base}/servicios`,
        `${base}/sobre-mi`,
        `${base}/ai/summary.json`,
      ],
      structured_data_on_site:
        'El HTML de páginas públicas incluye JSON-LD: WebSite, LocalBusiness, Person, WebPage, BreadcrumbList, FAQPage e ItemList en /servicios (sujeto a versión desplegada).',
    },
    generative_engine_optimization: {
      locale: 'es-ES',
      snippet_seed_es:
        'AM Psicología — Clínica Almudena Marchesi: psicología clínica en Moncloa–Chamberí, Madrid (CP 28015). Psicóloga general sanitaria colegiada (COP Madrid). Terapia individual, de pareja e infanto-juvenil; también online con cita previa. Citas, mensajes clínicos y pagos en portal privado del paciente.',
      model_limits_es:
        'No inventar precios concretos de catálogo, fechas de disponibilidad, diagnósticos ni datos de pacientes. No es servicio de urgencias psiquiátricas ni 24h. Ante riesgo inmediato: emergencias o recursos de crisis de la comunidad autónoma.',
      grounding_read_order: [
        `${base}/ai/geo-facts.json`,
        `${base}/contacto`,
        `${base}/servicios`,
        `${base}/ai/summary.json`,
        `${base}/llms-full.txt`,
      ],
    },
    search_phrases: clinicPrimaryKeywordsList(),
  };
}

/**
 * Carga útil extendida para `/ai/summary.json` (incluye metadocumentación GEO).
 */
export function buildGeoSummaryExtendedPayload(
  nowIso: string,
): Record<string, unknown> {
  const base = getWebsiteBaseUrl();
  const facts = buildGeoEntityFactsJson();
  return {
    geo_knowledge_version: GEO_KNOWLEDGE_VERSION,
    name: `AM Psicología · Clínica Almudena Marchesi | Moncloa, Argüelles, Chamberí, Madrid | ${CLINIC_PUBLIC_SITE_HOST_LABEL}`,
    description: facts.organization.description_1p,
    website: base,
    locale: 'es-ES',
    category: 'Healthcare',
    same_as_hint:
      'LinkedIn profesional y otros perfiles: por defecto se incluyen URLs integradas; añade además ficha y directorios (p. ej. GMB) en NEXT_PUBLIC_CLINIC_SAME_AS (coma/;) para citación cruzada, sin duplicar.',
    nap: {
      legal_and_brand: facts.organization.legal_names,
      address: facts.contact.address,
      postal_code: facts.contact.postal_code,
      city: facts.contact.city,
      country: facts.contact.country,
      phone_display: facts.contact.phone_display,
      phone_e164: facts.contact.phone_e164,
      email: facts.contact.email,
      collegiatura_cop_madrid: facts.professional.cop_madrid,
    },
    lead_professional: facts.professional.lead_practitioner,
    geo: { latitude: facts.geo.lat, longitude: facts.geo.lon },
    service_area: `${facts.service_area.description} ${facts.service_area.almagro_disambiguation}`,
    presencial_resumen: facts.hours_public.presencial_summary,
    tarifas_resumen_orientativo: CLINIC_TARIFAS_SESION_RESUMEN,
    servicios: facts.services_informative,
    model_boundaries: facts.model_boundaries,
    search_phrases: {
      local_es: facts.search_phrases,
      note: 'Solo orientación; no clínica. Cita, diagnóstico o plan terapéutico solo vía relación asistencial.',
    },
    pages: {
      home: `${base}/`,
      about: `${base}/sobre-mi`,
      approach: `${base}/enfoque`,
      services: `${base}/servicios`,
      contact: `${base}/contacto`,
      patient_signup: `${base}/registro-paciente`,
      public_faq: [
        `${base}/#faq-inicio`,
        `${base}/servicios#faq-servicios`,
        `${base}/enfoque#faq-enfoque`,
        `${base}/sobre-mi#faq-sobre-mi`,
        `${base}/contacto#faq-contacto`,
      ],
      legal: {
        privacy: `${base}/privacidad`,
        cookies: `${base}/cookies`,
        legal_notice: `${base}/aviso-legal`,
      },
    },
    endpoints: {
      summary: `${base}/ai/summary.json`,
      geo_entity_facts: `${base}/ai/geo-facts.json`,
    },
    redirect_routes: {
      pagos_to_citas: `${base}/pagos — redirige a /citas/nueva (reserva/pago; requiere sesión).`,
    },
    discovery: {
      sitemap: `${base}/sitemap.xml`,
      robots: `${base}/robots.txt`,
      llms: `${base}/llms.txt`,
      llms_full: `${base}/llms-full.txt`,
      well_known_ai_txt: `${base}/.well-known/ai.txt`,
      geo_entity_facts: `${base}/ai/geo-facts.json`,
    },
    generative_engine_optimization: facts.generative_engine_optimization,
    access: {
      notes:
        'Portal y admin requieren autenticación. GEO_ENFORCE (edge) limita tráfico por IP a ES/PT/AD salvo rastreadores y herramientas (p. ej. PageSpeed) en allowlist: no afecta a hechos, solo a quién recibe HTML 200.',
    },
    technical_seo: {
      structured_data:
        'Grafo: WebSite, LocalBusiness, Person, servicios, horarios, ContactPoint, área. Por ruta: WebPage, BreadcrumbList, FAQPage; ItemList en /servicios. Legales: WebPage+dateModified.',
      hreflang: 'es-ES; x-default duplica canónica.',
      env_verification: [
        'NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION',
        'NEXT_PUBLIC_BING_WEBMASTER_VERIFICATION',
      ],
      env_social: ['NEXT_PUBLIC_TWITTER_SITE'],
    },
    updated_at: nowIso,
  };
}
