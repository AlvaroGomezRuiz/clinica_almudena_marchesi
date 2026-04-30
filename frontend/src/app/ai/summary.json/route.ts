import { NextResponse } from 'next/server';

import { buildGeoSummaryExtendedPayload } from '@/lib/seo/geo-knowledge-v1';

export const dynamic = 'force-static';

/**
 * Resumen estructurado enriquecido (GEO + SEO técnico) para descubrimiento de IA.
 */
export async function GET(): Promise<NextResponse> {
  const now = new Date().toISOString();
  const payload = buildGeoSummaryExtendedPayload(now);
  const base = String(payload.website ?? '').replace(/\/+$/, '');
  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': 'public, max-age=7200',
      'Access-Control-Allow-Origin': '*',
      ...(base
        ? {
            Link: `<${base}/llms.txt>; rel="describedby", <${base}/ai/geo-facts.json>; rel="related"`,
          }
        : {}),
    },
  });
}
