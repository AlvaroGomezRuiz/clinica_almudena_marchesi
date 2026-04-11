'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function createCheckoutAction(formData: FormData): Promise<void> {
  const token = cookies().get('auth_token')?.value;
  const cita_id = String(formData.get('cita_id') ?? '').trim() || null;
  const servicio_id = String(formData.get('servicio_id') ?? '').trim() || null;
  const returnToRaw = String(formData.get('return_to') ?? '').trim();
  const returnTo =
    returnToRaw && returnToRaw.startsWith('/') && !returnToRaw.startsWith('//')
      ? returnToRaw
      : '/pagos';

  if (!token) {
    const nextPath = servicio_id
      ? `/pagos?plan=${encodeURIComponent(servicio_id)}`
      : '/pagos';
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  const backendUrl =
    process.env.BACKEND_API_URL ?? 'http://localhost:8000/api/v1';

  const res = await fetch(`${backendUrl}/stripe/create-checkout-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ cita_id, servicio_id }),
    cache: 'no-store',
  });

  const data: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const detail =
      typeof (data as any)?.detail === 'string' ? (data as any).detail : null;
    const message =
      typeof (data as any)?.message === 'string' ? (data as any).message : null;

    const err = detail ?? message ?? `Checkout fallido (${res.status})`;
    const sep = returnTo.includes('?') ? '&' : '?';
    redirect(`${returnTo}${sep}error=${encodeURIComponent(err)}`);
  }

  const url =
    typeof (data as any)?.checkout_url === 'string'
      ? (data as any).checkout_url
      : typeof (data as any)?.url === 'string'
        ? (data as any).url
        : null;

  if (!url) {
    const sep = returnTo.includes('?') ? '&' : '?';
    redirect(
      `${returnTo}${sep}error=${encodeURIComponent('checkout_url ausente.')}`
    );
  }

  redirect(url);
}
