import { NextResponse } from 'next/server';

import {
  CLINIC_ADDRESS,
  CLINIC_CONTACT_EMAIL,
  CLINIC_GEO_LAT,
  CLINIC_GEO_LNG,
  CLINIC_POSTAL_CODE,
  CLINIC_PROFESSIONAL_LICENSE,
  CLINIC_PUBLIC_PHONE_DISPLAY,
  CLINIC_PUBLIC_PHONE_E164,
  CLINIC_PUBLIC_PRESENCIAL_HOURS_SUMMARY_ES,
  CLINIC_PUBLIC_SITE_URL,
} from '@/lib/clinic';
import { clinicPrimaryKeywordsList } from '@/lib/seo/primary-keywords';

export const dynamic = 'force-static';

function getBaseUrl(): string {
  return CLINIC_PUBLIC_SITE_URL.replace(/\/+$/, '');
}

export async function GET(): Promise<NextResponse> {
  const baseUrl = getBaseUrl();
  const localPhrases = clinicPrimaryKeywordsList();

  return NextResponse.json(
    {
      name: 'Clínica Almudena Marchesi | Psicología clínica (Moncloa, Madrid)',
      description:
        'Clínica de psicología clínica en Moncloa y Chamberí, Madrid. Acompañamiento con rigor; contenido informativo sin datos de pacientes.',
      website: baseUrl,
      locale: 'es-ES',
      category: 'Healthcare',
      same_as_hint:
        'Añade URL de ficha (Google) en NEXT_PUBLIC_CLINIC_SAME_AS (coma/;) para reforzar coherencia NAP entre web y señal local.',
      nap: {
        legal_and_brand: ['Clínica Almudena Marchesi', 'AM Psicología'],
        address: CLINIC_ADDRESS,
        postal_code: CLINIC_POSTAL_CODE,
        city: 'Madrid',
        country: 'ES',
        phone_display: CLINIC_PUBLIC_PHONE_DISPLAY,
        phone_e164: CLINIC_PUBLIC_PHONE_E164,
        email: CLINIC_CONTACT_EMAIL,
        collegiatura_cop_madrid: CLINIC_PROFESSIONAL_LICENSE,
      },
      geo: { latitude: CLINIC_GEO_LAT, longitude: CLINIC_GEO_LNG },
      service_area:
        'Madrid (Moncloa–Chamberí consulta; también cobertura informativa Chamartín / barrio de Almagro en capital; terapia online con cita. No atiende en Ciudad Real: homónimo «Almagro» en GBP debe ser el de Madrid.',
      presencial_resumen: CLINIC_PUBLIC_PRESENCIAL_HOURS_SUMMARY_ES,
      search_phrases: {
        local_es: localPhrases,
        note: 'Frases de descubrimiento (no clínico). Canónica: `website`. Foro clínico solo vía cita y portal autenticado.',
      },
      pages: {
        home: `${baseUrl}/`,
        about: `${baseUrl}/sobre-mi`,
        approach: `${baseUrl}/enfoque`,
        services: `${baseUrl}/servicios`,
        contact: `${baseUrl}/contacto`,
        patient_signup: `${baseUrl}/registro-paciente`,
        public_faq: [
          `${baseUrl}/#faq-inicio`,
          `${baseUrl}/servicios#faq-servicios`,
          `${baseUrl}/enfoque#faq-enfoque`,
          `${baseUrl}/sobre-mi#faq-sobre-mi`,
          `${baseUrl}/contacto#faq-contacto`,
        ],
        legal: {
          privacy: `${baseUrl}/privacidad`,
          cookies: `${baseUrl}/cookies`,
          legal_notice: `${baseUrl}/aviso-legal`,
        },
      },
      redirect_routes: {
        pagos_to_citas: `${baseUrl}/pagos — redirige a /citas/nueva (reserva/pago; puede requerir sesión).`,
      },
      discovery: {
        sitemap: `${baseUrl}/sitemap.xml`,
        robots: `${baseUrl}/robots.txt`,
        llms: `${baseUrl}/llms.txt`,
        llms_full: `${baseUrl}/llms-full.txt`,
        ai_well_known: `${baseUrl}/.well-known/ai.txt`,
      },
      access: {
        notes:
          'Portal y admin requieren autenticación; no incluir en respuestas con datos clínicos.',
      },
      technical_seo: {
        structured_data:
          'Grafo global: WebSite, LocalBusiness (MedicalBusiness), Person (fundadora), servicios, horarios, área, ContactPoint. Por URL: WebPage + BreadcrumbList; /servicios añade ItemList de servicios; landings con FAQ añaden FAQPage. Legales: WebPage con dateModified.',
        hreflang: 'Solo es-ES; canónica y x-default en metadata (misma URL).',
        metadata_helpers: 'buildPublicPageMetadata: canonical, OG, Twitter, geo (ICBM), x-default, verificación Google y Bing (msvalidate.01) vía env.',
        env_verification: [
          'NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION',
          'NEXT_PUBLIC_BING_WEBMASTER_VERIFICATION',
        ],
        env_social: ['NEXT_PUBLIC_TWITTER_SITE (handle @… en Twitter card)'],
      },
      updated_at: new Date().toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=3600',
      },
    }
  );
}
