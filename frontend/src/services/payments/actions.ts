'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

type ErrorPayload = {
  detail?: string;
  message?: string;
};

type CheckoutPayload = {
  checkout_url: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseErrorPayload(data: unknown): ErrorPayload | null {
  if (!isRecord(data)) return null;
  const detail = data['detail'];
  const message = data['message'];
  return {
    ...(typeof detail === 'string' ? { detail } : {}),
    ...(typeof message === 'string' ? { message } : {}),
  };
}

function parseCheckoutPayload(data: unknown): CheckoutPayload | null {
  if (!isRecord(data)) return null;
  const checkoutUrl = data['checkout_url'] ?? data['url'];
  if (typeof checkoutUrl !== 'string' || !checkoutUrl.trim()) return null;
  return { checkout_url: checkoutUrl.trim() };
}

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
    process.env.NEXT_PUBLIC_BACKEND_API_URL ?? 'http://localhost:8000/api/v1';

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
    const err = parseErrorPayload(data);

    const message = err?.detail ?? err?.message ?? `Checkout fallido (${res.status})`;
    const sep = returnTo.includes('?') ? '&' : '?';
    redirect(`${returnTo}${sep}error=${encodeURIComponent(message)}`);
  }

  const parsed = parseCheckoutPayload(data);
  if (!parsed) {
    const sep = returnTo.includes('?') ? '&' : '?';
    redirect(
      `${returnTo}${sep}error=${encodeURIComponent('checkout_url ausente.')}`
    );
  }

  redirect(parsed.checkout_url);
}
