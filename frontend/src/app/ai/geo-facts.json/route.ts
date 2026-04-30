import { NextResponse } from 'next/server';

import { buildGeoEntityFactsJson } from '@/lib/seo/geo-knowledge-v1';

export const dynamic = 'force-static';

/**
 * Núcleo mínimo de hechos para indexación RAG / agentes.
 * Esquema estable: version + kind; ampliar con cuidado para no romper consumidores.
 */
export async function GET(): Promise<NextResponse> {
  const payload = buildGeoEntityFactsJson();
  const base = payload.website_canonical;
  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': 'public, max-age=7200',
      'Access-Control-Allow-Origin': '*',
      Link: `<${base}/llms.txt>; rel="describedby", <${base}/.well-known/ai.txt>; rel="related"`,
    },
  });
}
