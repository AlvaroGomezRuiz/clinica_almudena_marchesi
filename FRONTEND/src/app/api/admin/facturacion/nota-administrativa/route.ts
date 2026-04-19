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
  const upstream = await fetch(
    `${backendApiUrl}/facturas/nota-administrativa`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    }
  );

  let payload: unknown = null;
  try {
    payload = await upstream.json();
  } catch {
    payload = { detail: 'Upstream returned non-JSON response' };
  }

  return NextResponse.json(payload, { status: upstream.status });
}

export async function PUT(req: Request) {
  const token = cookies().get('auth_token')?.value;
  if (!token) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    nota?: unknown;
  } | null;

  const nota = typeof body?.nota === 'string' ? body.nota : '';

  const backendApiUrl = getBackendApiUrl();
  const upstream = await fetch(
    `${backendApiUrl}/facturas/nota-administrativa`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ nota }),
      cache: 'no-store',
    }
  );

  let payload: unknown = null;
  try {
    payload = await upstream.json();
  } catch {
    payload = { detail: 'Upstream returned non-JSON response' };
  }

  return NextResponse.json(payload, { status: upstream.status });
}
