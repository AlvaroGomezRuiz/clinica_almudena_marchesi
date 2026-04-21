'use server';

/**
 * Server Actions para Stripe Checkout.
 *
 * Flujo:
 *   1. Server Action recibe { cita_id | bono_config_id }.
 *   2. Invoca Edge Function `stripe-checkout` con el JWT del usuario.
 *   3. Edge Function valida ownership via RPC y crea la sesión.
 *   4. Devolvemos { url } para redirección client-side.
 */

import { createServerClient } from '@/lib/supabase/server';
import { getSupabaseEnv } from '@/lib/supabase/env';

export type CheckoutResult =
  | { readonly ok: true; readonly url: string; readonly sessionId: string }
  | { readonly ok: false; readonly error: string };

const UUID_RE = /^[0-9a-f-]{36}$/i;

async function invokeCheckout(
  body: { kind: 'cita'; cita_id: string } | { kind: 'bono'; bono_config_id: string }
): Promise<CheckoutResult> {
  const env = getSupabaseEnv();
  const supabase = createServerClient();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return { ok: false, error: 'No estás autenticado.' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(`${env.url}/functions/v1/stripe-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: 'no-store',
    });

    const data = (await res.json().catch(() => ({}))) as {
      url?: string;
      session_id?: string;
      error?: string;
      detail?: string;
    };

    if (!res.ok || !data.url) {
      return { ok: false, error: data.detail ?? data.error ?? `http_${res.status}` };
    }

    return { ok: true, url: data.url, sessionId: data.session_id ?? '' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'network_error';
    return { ok: false, error: msg };
  } finally {
    clearTimeout(timer);
  }
}

export async function crearCheckoutCitaAction(citaId: string): Promise<CheckoutResult> {
  if (!UUID_RE.test(citaId)) {
    return { ok: false, error: 'Cita inválida.' };
  }
  return invokeCheckout({ kind: 'cita', cita_id: citaId });
}

export async function crearCheckoutBonoAction(bonoConfigId: string): Promise<CheckoutResult> {
  if (!UUID_RE.test(bonoConfigId)) {
    return { ok: false, error: 'Bono inválido.' };
  }
  return invokeCheckout({ kind: 'bono', bono_config_id: bonoConfigId });
}
