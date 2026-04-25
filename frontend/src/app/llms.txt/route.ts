import { NextResponse } from 'next/server';

import { CLINIC_PUBLIC_SITE_URL } from '@/lib/clinic';

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
      '# Sitio: Almudena Marchesi (Psicología Clínica) · Madrid (Moncloa / Chamberí)',
      '',
      '## Canonical',
      `${base}/`,
      '',
      '## Resumen estructurado (JSON)',
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

