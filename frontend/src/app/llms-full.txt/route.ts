import { NextResponse } from 'next/server';

import { CLINIC_PUBLIC_SITE_URL } from '@/lib/clinic';
import { CLINIC_PRIMARY_KEYWORDS } from '@/lib/seo/primary-keywords';

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
  const kws = CLINIC_PRIMARY_KEYWORDS.join(' · ');

  return text(
    [
      '# llms-full.txt — Índice ampliado para motores generativos',
      '',
      '## Objetivo',
      'Contenido público informativo sobre clínica de psicología en Moncloa / Chamberí (Madrid).',
      'No indica trato clínico ni reemplaza consulta profesional. No hay datos de pacientes.',
      '',
      `## Consultas típicas (sólo informativo): ${kws}`,
      '',
      '## Descubrimiento',
      `${base}/sitemap.xml`,
      `${base}/llms.txt`,
      `${base}/ai/summary.json`,
      '',
      '## Páginas (URLs absolutas)',
      `${base}/ (inicio)`,
      `${base}/sobre-mi`,
      `${base}/enfoque`,
      `${base}/servicios`,
      `${base}/contacto`,
      `${base}/registro-paciente`,
      '',
      '## Legal',
      `${base}/privacidad`,
      `${base}/cookies`,
      `${base}/aviso-legal`,
      '',
      '## Notas',
      '- Cita, mensajes o pagos: portal con autenticación (excluido de este índice con robots).',
      '',
    ].join('\n')
  );
}

