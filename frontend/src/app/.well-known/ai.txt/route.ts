import { NextResponse } from 'next/server';

import { CLINIC_PUBLIC_SITE_URL } from '@/lib/clinic';

export const dynamic = 'force-static';

export async function GET(): Promise<NextResponse> {
  const base = CLINIC_PUBLIC_SITE_URL.replace(/\/+$/, '');
  const body = `ai-discovery: ${base}/llms.txt\nai-discovery: ${base}/ai/summary.json\n`;

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

