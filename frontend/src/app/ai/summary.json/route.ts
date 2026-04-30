import { NextResponse } from 'next/server';

import { buildGeoSummaryExtendedPayload } from '@/lib/seo/geo-knowledge-v1';

export const dynamic = 'force-static';

/**
 * Resumen estructurado enriquecido (GEO + SEO técnico) para descubrimiento de IA.
 */
export async function GET(): Promise<NextResponse> {
  const now = new Date().toISOString();
  return NextResponse.json(buildGeoSummaryExtendedPayload(now), {
    headers: {
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
