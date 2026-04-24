'use client';

/**
 * PaymentElementDrawer — pago embebido con @stripe/react-stripe-js.
 *
 * Sustituye la redirección a Stripe Checkout hosted por un flow in-page:
 *   1. Al abrirse pide `client_secret` vía Server Action (`crearPaymentIntentCitaAction`
 *      o `crearPaymentIntentBonoAction`).
 *   2. Monta <Elements> con appearance personalizada (match con portal) y
 *      renderiza <PaymentElement> (card, wallets, Klarna, Bizum — lo que
 *      Stripe declare disponible para la cuenta + país del user).
 *   3. Submit → `stripe.confirmPayment` con `return_url = /portal/pagos/success`.
 *   4. El webhook `stripe-webhook` procesa `payment_intent.succeeded` y marca
 *      el pago como `capturado` en BBDD (ya deployado).
 *
 * Notas de arquitectura:
 *   - El `client_secret` se pide lazy (al abrir), NO en el server render, para
 *     evitar PIs huérfanos si el usuario nunca abre el drawer.
 *   - Appearance usa variables Tailwind del tema para respetar dark/light mode.
 *   - El container respeta la clase `max-h-[85vh]` + scroll para móviles.
 */

import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import {
  loadStripe,
  type Stripe,
  type StripeElementsOptions,
} from '@stripe/stripe-js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from 'next-themes';

import { Button } from '@/components/portal-shell/ui';
import {
  crearPaymentIntentBonoAction,
  crearPaymentIntentCitaAction,
  type PaymentIntentResult,
} from '@/services/pagos/actions';

// Singleton: evitamos llamar loadStripe en cada render.
let stripePromise: Promise<Stripe | null> | null = null;
function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!pk) {
      // Fail-fast: si no hay publishable key, el componente muestra error.
      return Promise.resolve(null);
    }
    stripePromise = loadStripe(pk);
  }
  return stripePromise;
}

export interface PaymentElementDrawerProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly target: { kind: 'cita'; citaId: string } | { kind: 'bono'; bonoConfigId: string };
  /** Importe en céntimos para mostrar antes del fetch. */
  readonly amountHint?: number;
  readonly titleHint?: string;
}

export default function PaymentElementDrawer({
  open,
  onClose,
  target,
  amountHint,
  titleHint,
}: PaymentElementDrawerProps): JSX.Element | null {
  const [state, setState] = useState<
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'ready'; clientSecret: string; amount: number; currency: string }
    | { status: 'error'; message: string }
  >({ status: 'idle' });

  const { resolvedTheme } = useTheme();
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      fetchedRef.current = false;
      setState({ status: 'idle' });
      return;
    }
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    setState({ status: 'loading' });
    void (async () => {
      const res: PaymentIntentResult =
        target.kind === 'cita'
          ? await crearPaymentIntentCitaAction(target.citaId)
          : await crearPaymentIntentBonoAction(target.bonoConfigId);
      if (!res.ok) {
        setState({ status: 'error', message: res.error });
        return;
      }
      setState({
        status: 'ready',
        clientSecret: res.clientSecret,
        amount: res.amount,
        currency: res.currency,
      });
    })();
  }, [open, target]);

  const options = useMemo<StripeElementsOptions | null>(() => {
    if (state.status !== 'ready') return null;
    return {
      clientSecret: state.clientSecret,
      locale: 'es',
      appearance: {
        theme: resolvedTheme === 'dark' ? 'night' : 'stripe',
        variables: {
          fontFamily:
            '"Newsreader", "Inter", system-ui, -apple-system, sans-serif',
          borderRadius: '12px',
          colorPrimary: resolvedTheme === 'dark' ? '#c8b79e' : '#4b645f',
        },
      },
    };
  }, [state, resolvedTheme]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-drawer-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-t-3xl bg-[#f5efe4] shadow-2xl dark:bg-[#1b1b18] sm:rounded-3xl">
        <header className="flex items-start justify-between gap-4 px-6 py-5">
          <div>
            <h2
              id="payment-drawer-title"
              className="font-display text-[1.35rem] italic text-ink tracking-[-0.01em] dark:text-white"
            >
              {titleHint ?? 'Completar pago'}
            </h2>
            {state.status === 'ready' ? (
              <p className="mt-1 font-body text-[0.88rem] text-ink-soft dark:text-white/65">
                {formatImporte(state.amount, state.currency)}
              </p>
            ) : amountHint ? (
              <p className="mt-1 font-body text-[0.88rem] text-ink-soft dark:text-white/65">
                {formatImporte(amountHint, 'eur')}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition hover:bg-ink/5 hover:text-ink dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-white"
          >
            <span className="material-symbols-outlined text-[1.2rem]" aria-hidden="true">
              close
            </span>
          </button>
        </header>

        <div className="max-h-[75vh] overflow-y-auto px-6 pb-6">
          {state.status === 'loading' || state.status === 'idle' ? (
            <SkeletonPay />
          ) : state.status === 'error' ? (
            <ErrorPay message={state.message} onRetry={() => {
              fetchedRef.current = false;
              setState({ status: 'idle' });
              onClose();
            }} />
          ) : options ? (
            <Elements stripe={getStripe()} options={options}>
              <CheckoutForm onCancel={onClose} />
            </Elements>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Formulario interno (usa hooks de Elements)
// ───────────────────────────────────────────────────────────────────────────
function CheckoutForm({ onCancel }: { onCancel: () => void }): JSX.Element {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!stripe || !elements) return;

      setSubmitting(true);
      setError(null);

      const returnBase =
        typeof window !== 'undefined' ? window.location.origin : '';
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${returnBase}/portal/pagos/success`,
        },
        redirect: 'if_required',
      });

      if (stripeError) {
        setError(stripeError.message ?? 'No se pudo completar el pago.');
        setSubmitting(false);
        return;
      }

      // Sin error: o bien el usuario va al return_url (3DS u otro redirect),
      // o el pago termina in-page (tarjeta sin 3DS) y debemos ir a /success con
      // ?payment_intent= para que la página resuelva el pago.
      if (paymentIntent) {
        const st = paymentIntent.status;
        if (st === 'succeeded' || st === 'processing' || st === 'requires_capture') {
          const q = new URLSearchParams({ payment_intent: paymentIntent.id });
          window.location.assign(`${returnBase}/portal/pagos/success?${q.toString()}`);
          return;
        }
      }

      setSubmitting(false);
    },
    [stripe, elements]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PaymentElement options={{ layout: 'tabs' }} />

      {error ? (
        <p role="alert" className="font-body text-[0.85rem] text-red-700 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <div className="flex items-center justify-end gap-3">
        <Button variant="ghost" type="button" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          type="submit"
          icon="lock"
          disabled={!stripe || !elements || submitting}
        >
          {submitting ? 'Procesando…' : 'Pagar'}
        </Button>
      </div>

      <p className="font-body text-[0.72rem] leading-relaxed text-ink-muted dark:text-white/50">
        Pago procesado por Stripe. Tus datos de tarjeta nunca pasan por nuestros
        servidores. Al confirmar aceptas los términos del servicio.
      </p>
    </form>
  );
}

function SkeletonPay(): JSX.Element {
  return (
    <div className="space-y-3">
      <div className="h-12 w-full animate-pulse rounded-xl bg-ink/5 dark:bg-white/5" />
      <div className="h-12 w-full animate-pulse rounded-xl bg-ink/5 dark:bg-white/5" />
      <div className="h-12 w-full animate-pulse rounded-xl bg-ink/5 dark:bg-white/5" />
      <div className="h-10 w-32 animate-pulse rounded-full bg-ink/10 dark:bg-white/10" />
    </div>
  );
}

function ErrorPay({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}): JSX.Element {
  return (
    <div className="rounded-xl border border-red-300/50 bg-red-50/80 p-5 dark:border-red-500/30 dark:bg-red-950/30">
      <p className="font-body text-[0.9rem] text-red-900 dark:text-red-200">
        No se ha podido iniciar el pago: <strong>{message}</strong>
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 font-body text-[0.85rem] text-red-700 underline hover:no-underline dark:text-red-300"
      >
        Cerrar y reintentar
      </button>
    </div>
  );
}

function formatImporte(centimos: number, currency: string): string {
  const value = centimos / 100;
  try {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: (currency ?? 'eur').toUpperCase(),
      minimumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency.toUpperCase()}`;
  }
}
