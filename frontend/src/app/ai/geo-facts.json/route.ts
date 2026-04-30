import { NextResponse } from 'next/server';

import { buildGeoEntityFactsJson } from '@/lib/seo/geo-knowledge-v1';

export const dynamic = 'force-static';

/**
 * Núcleo mínimo de hechos para indexación RAG / agentes.
 * Esquema estable: version + kind; ampliar con cuidado para no romper consumidores.
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(buildGeoEntityFactsJson(), {
    headers: {
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
