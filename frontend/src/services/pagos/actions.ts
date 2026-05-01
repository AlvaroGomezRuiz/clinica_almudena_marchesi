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

/**
 * JWT para invocar Edge Functions con `verify_jwt=true`.
 * `getSession()` a veces no devuelve `access_token` en Server Actions;
 * intentamos `refreshSession()` antes de fallar con 401 en el gateway.
 */
async function getAccessTokenForEdgeFunctions(
  supabase: ReturnType<typeof createServerClient>
): Promise<string | null> {
  const {
    data: { session: s1 },
  } = await supabase.auth.getSession();
  if (s1?.access_token) {
    return s1.access_token;
  }
  const { data: refreshed, error } = await supabase.auth.refreshSession();
  if (error || !refreshed.session?.access_token) {
    return null;
  }
  return refreshed.session.access_token;
}

export type CheckoutResult =
  | { readonly ok: true; readonly url: string; readonly sessionId: string }
  | { readonly ok: false; readonly error: string };

const UUID_RE = /^[0-9a-f-]{36}$/i;

async function invokeCheckout(
  body: { kind: 'cita'; cita_id: string } | { kind: 'bono'; bono_config_id: string }
): Promise<CheckoutResult> {
  const env = getSupabaseEnv();
  const supabase = createServerClient();

  const accessToken = await getAccessTokenForEdgeFunctions(supabase);
  if (!accessToken) {
    return {
      ok: false,
      error: 'Sesión caducada o no disponible. Vuelve a iniciar sesión e inténtalo de nuevo.',
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(`${env.url}/functions/v1/stripe-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        apikey: env.anonKey,
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

// ═══════════════════════════════════════════════════════════════════════════
//  PAYMENT INTENT (Payment Element embebido — wallets, Klarna, Bizum)
// ═══════════════════════════════════════════════════════════════════════════

export type PaymentIntentResult =
  | {
      readonly ok: true;
      readonly clientSecret: string;
      readonly paymentIntentId: string;
      readonly amount: number;
      readonly currency: string;
    }
  | { readonly ok: false; readonly error: string };

async function invokePaymentIntent(
  body:
    | { kind: 'cita'; cita_id: string }
    | { kind: 'cita'; servicio_id: string; slot_inicio: string }
    | { kind: 'bono'; bono_config_id: string }
): Promise<PaymentIntentResult> {
  const env = getSupabaseEnv();
  const supabase = createServerClient();

  const accessToken = await getAccessTokenForEdgeFunctions(supabase);
  if (!accessToken) {
    return {
      ok: false,
      error: 'Sesión caducada o no disponible. Vuelve a iniciar sesión e inténtalo de nuevo.',
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(`${env.url}/functions/v1/stripe-payment-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        apikey: env.anonKey,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: 'no-store',
    });

    const data = (await res.json().catch(() => ({}))) as {
      client_secret?: string;
      payment_intent_id?: string;
      amount?: number;
      currency?: string;
      error?: string;
      detail?: string;
    };

    if (!res.ok || !data.client_secret || !data.payment_intent_id) {
      return { ok: false, error: data.detail ?? data.error ?? `http_${res.status}` };
    }

    return {
      ok: true,
      clientSecret: data.client_secret,
      paymentIntentId: data.payment_intent_id,
      amount: data.amount ?? 0,
      currency: data.currency ?? 'eur',
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'network_error';
    return { ok: false, error: msg };
  } finally {
    clearTimeout(timer);
  }
}

export async function crearPaymentIntentCitaAction(
  citaId: string
): Promise<PaymentIntentResult> {
  if (!UUID_RE.test(citaId)) {
    return { ok: false, error: 'Cita inválida.' };
  }
  return invokePaymentIntent({ kind: 'cita', cita_id: citaId });
}

/** Pago de sesión sin fila previa en `citas`: la cita se crea al confirmar el pago (webhook). */
export async function crearPaymentIntentCitaSlotAction(
  servicioId: string,
  slotInicio: string
): Promise<PaymentIntentResult> {
  if (!UUID_RE.test(servicioId)) {
    return { ok: false, error: 'Servicio inválido.' };
  }
  if (!slotInicio || slotInicio.trim().length < 8) {
    return { ok: false, error: 'Horario inválido.' };
  }
  return invokePaymentIntent({ kind: 'cita', servicio_id: servicioId, slot_inicio: slotInicio });
}

export async function crearPaymentIntentBonoAction(
  bonoConfigId: string
): Promise<PaymentIntentResult> {
  if (!UUID_RE.test(bonoConfigId)) {
    return { ok: false, error: 'Bono inválido.' };
  }
  return invokePaymentIntent({ kind: 'bono', bono_config_id: bonoConfigId });
}
