import { NextResponse } from 'next/server';

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
  return text(
    [
      '# llms.txt — Superficie de descubrimiento para motores generativos',
      '# Sitio: Almudena Marchesi (Psicología Clínica)',
      '',
      '## Canonical',
      '/',
      '',
      '## Sitemap',
      '/sitemap.xml',
      '',
      '## Páginas clave',
      '/sobre-mi',
      '/enfoque',
      '/servicios',
      '/contacto',
      '',
      '## Legal',
      '/privacidad',
      '/cookies',
      '/aviso-legal',
      '',
    ].join('\n')
  );
}

