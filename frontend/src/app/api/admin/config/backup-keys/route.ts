import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getBackendApiUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BACKEND_API_URL ?? 'http://localhost:8000/api/v1'
  );
}

export async function GET() {
  const token = cookies().get('auth_token')?.value;
  if (!token) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  const backendApiUrl = getBackendApiUrl();
  const upstream = await fetch(`${backendApiUrl}/admin/config/backup-keys`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  const body = await upstream.arrayBuffer();

  const headers = new Headers();
  headers.set(
    'Content-Type',
    upstream.headers.get('content-type') ?? 'application/octet-stream'
  );
  headers.set('Cache-Control', 'no-store');

  const contentDisposition = upstream.headers.get('content-disposition');
  if (contentDisposition) {
    headers.set('Content-Disposition', contentDisposition);
  }

  return new NextResponse(body, {
    status: upstream.status,
    headers,
  });
}
