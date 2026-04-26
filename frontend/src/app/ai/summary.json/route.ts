import { NextResponse } from 'next/server';

import { CLINIC_PUBLIC_SITE_URL } from '@/lib/clinic';
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
        public_pricing: `${baseUrl}/pagos`,
        legal: {
          privacy: `${baseUrl}/privacidad`,
          cookies: `${baseUrl}/cookies`,
          legal_notice: `${baseUrl}/aviso-legal`,
        },
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
      updated_at: new Date().toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=3600',
      },
    }
  );
}
