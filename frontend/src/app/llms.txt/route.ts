import { NextResponse } from 'next/server';

import {
  CLINIC_ADDRESS,
  CLINIC_CONTACT_EMAIL,
  CLINIC_PUBLIC_PHONE_DISPLAY,
  CLINIC_PUBLIC_PRESENCIAL_HOURS_SUMMARY_ES,
  CLINIC_PUBLIC_SITE_HOST_LABEL,
  CLINIC_PUBLIC_SITE_URL,
} from '@/lib/clinic';
import { clinicPrimaryKeywordsText } from '@/lib/seo/primary-keywords';
import { GEO_KNOWLEDGE_VERSION } from '@/lib/seo/geo-knowledge-v1';

export const dynamic = 'force-static';

function text(body: string): NextResponse {
  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

export async function GET(): Promise<NextResponse> {
  const base = CLINIC_PUBLIC_SITE_URL.replace(/\/+$/, '');

  return text(
    [
      '# llms.txt — Superficie de descubrimiento para motores generativos',
      `# Conocimiento canónico: geo_knowledge v${GEO_KNOWLEDGE_VERSION} (ver /ai/summary.json).`,
      `# Marca y <title> del sitio: ${CLINIC_PUBLIC_SITE_HOST_LABEL} (AM Psicología / Clínica Almudena Marchesi) · Moncloa, Chamberí, Madrid`,
      '# Términos de descubrimiento (no clínico, solo orientación pública):',
      `#   ${clinicPrimaryKeywordsText()}`,
      '',
      '## NAP (canónico web; alinear con ficha local en Google al verificar)',
      `Dirección: ${CLINIC_ADDRESS} (CP 28015).`,
      `Tel: ${CLINIC_PUBLIC_PHONE_DISPLAY}. Email: ${CLINIC_CONTACT_EMAIL}.`,
      `Presencial: ${CLINIC_PUBLIC_PRESENCIAL_HOURS_SUMMARY_ES}`,
      '',
      '## JSON-LD',
      'Todas las URLs públicas incluyen un @graph (WebSite + LocalBusiness + Person) y, por página, Breadcrumb; varias incluyen FAQPage. Coherente con /ai/summary.json y /ai/geo-facts.json.',
      '',
      '## Canonical',
      `${base}/`,
      '',
      '## Ficha de hechos mínima (RAG, JSON, GEO/IA)',
      `${base}/ai/geo-facts.json`,
      '',
      '## Resumen estructurado (JSON, GEO/IA ampliado)',
      `${base}/ai/summary.json`,
      '',
      '## Sitemap',
      `${base}/sitemap.xml`,
      '',
      '## Páginas clave',
      `${base}/sobre-mi`,
      `${base}/enfoque`,
      `${base}/servicios`,
      `${base}/contacto`,
      '',
      '## Legal',
      `${base}/privacidad`,
      `${base}/cookies`,
      `${base}/aviso-legal`,
      '',
    ].join('\n')
  );
}

