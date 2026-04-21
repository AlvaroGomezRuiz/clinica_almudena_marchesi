import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

export async function GET(): Promise<NextResponse> {
  return new NextResponse('ai-discovery: /llms.txt\nai-discovery: /ai/summary.json\n', {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

