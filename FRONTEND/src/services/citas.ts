import type {
  CitaReserveRequest,
  CitaReserveResponse,
  FreeSlotsQuery,
  FreeSlotsResponse,
} from '@/contracts/citas';

const DEFAULT_BACKEND_API_URL = 'http://localhost:8000/api/v1';

function getBackendApiUrl(): string {
  return process.env.NEXT_PUBLIC_BACKEND_API_URL ?? DEFAULT_BACKEND_API_URL;
}

function objectEntries(obj: object): Array<[string, unknown]> {
  return Object.entries(obj) as Array<[string, unknown]>;
}

function toQueryString(query: FreeSlotsQuery): string {
  const params = new URLSearchParams();
  for (const [k, v] of objectEntries(query)) {
    if (v === undefined) continue;
    if (typeof v === 'string' || typeof v === 'number') {
      params.set(k, String(v));
      continue;
    }
    throw new Error(`Parámetro de query inválido: ${k}`);
  }
  const s = params.toString();
  return s ? `?${s}` : '';
}

export async function getFreeSlots(query: FreeSlotsQuery): Promise<FreeSlotsResponse> {
  const base = getBackendApiUrl();
  const qs = toQueryString(query);
  const res = await fetch(`${base}/citas/slots${qs}`, { cache: 'no-store' });
  if (!res.ok) {
    const payload: unknown = await res.json().catch(() => null);
    const msg =
      payload && typeof payload === 'object' && 'detail' in payload
        ? String((payload as { detail: unknown }).detail)
        : `Error (${res.status})`;
    throw new Error(msg);
  }
  return (await res.json()) as FreeSlotsResponse;
}

export async function reserveCita(
  payload: CitaReserveRequest,
  token: string
): Promise<CitaReserveResponse> {
  const base = getBackendApiUrl();
  const res = await fetch(`${base}/citas/reservar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });
  if (!res.ok) {
    const data: unknown = await res.json().catch(() => null);
    const msg =
      data && typeof data === 'object' && 'detail' in data
        ? String((data as { detail: unknown }).detail)
        : `Error (${res.status})`;
    throw new Error(msg);
  }
  return (await res.json()) as CitaReserveResponse;
}

