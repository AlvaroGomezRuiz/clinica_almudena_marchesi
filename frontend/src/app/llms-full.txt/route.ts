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
      '# llms-full.txt — Índice ampliado para motores generativos',
      '',
      '## Objetivo',
      'Contenido público informativo. No incluye áreas privadas (portal/admin) ni datos clínicos.',
      '',
      '## Descubrimiento',
      '/sitemap.xml',
      '/llms.txt',
      '',
      '## Páginas',
      '/ (inicio)',
      '/sobre-mi',
      '/enfoque',
      '/servicios',
      '/contacto',
      '/pagos',
      '',
      '## Legal',
      '/privacidad',
      '/cookies',
      '/aviso-legal',
      '',
      '## Notas',
      '- Para reservar o gestionar citas, usar el portal seguro (requiere autenticación).',
      '',
    ].join('\n')
  );
}

