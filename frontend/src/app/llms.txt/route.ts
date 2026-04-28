import { NextResponse } from 'next/server';

import {
  CLINIC_ADDRESS,
  CLINIC_CONTACT_EMAIL,
  CLINIC_PUBLIC_PHONE_DISPLAY,
  CLINIC_PUBLIC_PRESENCIAL_HOURS_SUMMARY_ES,
  CLINIC_PUBLIC_SITE_URL,
} from '@/lib/clinic';
import { clinicPrimaryKeywordsText } from '@/lib/seo/primary-keywords';

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
      '# Sitio: Clínica Almudena Marchesi · psicología clínica (Moncloa, Chamberí, Madrid)',
      '# Términos de descubrimiento (no clínico, solo orientación pública):',
      `#   ${clinicPrimaryKeywordsText()}`,
      '',
      '## NAP (canónico web; alinear con ficha local en Google al verificar)',
      `Dirección: ${CLINIC_ADDRESS} (CP 28015).`,
      `Tel: ${CLINIC_PUBLIC_PHONE_DISPLAY}. Email: ${CLINIC_CONTACT_EMAIL}.`,
      `Presencial: ${CLINIC_PUBLIC_PRESENCIAL_HOURS_SUMMARY_ES}`,
      '',
      '## JSON-LD',
      'Todas las URLs públicas incluyen un @graph (WebSite + LocalBusiness + Person) y, por página, Breadcrumb; varias incluyen FAQPage. Coherente con /ai/summary.json.',
      '',
      '## Canonical',
      `${base}/`,
      '',
      '## Resumen estructurado (JSON, GEO/IA)',
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

