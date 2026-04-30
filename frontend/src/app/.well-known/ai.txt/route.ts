import { NextResponse } from 'next/server';

import { CLINIC_PUBLIC_SITE_URL } from '@/lib/clinic';

export const dynamic = 'force-static';

export async function GET(): Promise<NextResponse> {
  const base = CLINIC_PUBLIC_SITE_URL.replace(/\/+$/, '');
  const body = [
    `# Clínica psicología Moncloa / Chamberí, Madrid (contenido público)`,
    `ai-discovery: ${base}/llms.txt`,
    `ai-discovery: ${base}/llms-full.txt`,
    `ai-discovery: ${base}/ai/summary.json`,
    `ai-discovery: ${base}/ai/geo-facts.json`,
    '',
  ].join('\n');

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

