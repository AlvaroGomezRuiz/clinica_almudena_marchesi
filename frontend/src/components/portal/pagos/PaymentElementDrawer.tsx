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
 *   401 en `api.stripe.com/.../elements/sessions` en consola: la clave publicable
 *   `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (Vercel) y `STRIPE_SECRET_KEY` (Supabase, Edge
 *   stripe-payment-intent) deben ser de la *misma* cuenta y modo (test o live)
 *   que el PaymentIntent. Si mezclas cuentas o test/live, Elements no carga.
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
import { formatUserFacingError } from '@/lib/formatUserFacingError';
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
    | {
        status: 'ready';
        clientSecret: string;
        paymentIntentId: string;
        amount: number;
        currency: string;
      }
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
        setState({ status: 'error', message: formatUserFacingError(res.error) });
        return;
      }
      setState({
        status: 'ready',
        clientSecret: res.clientSecret,
        paymentIntentId: res.paymentIntentId,
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
              <CheckoutForm
                onCancel={onClose}
                clientSecret={state.clientSecret}
                createdPaymentIntentId={state.paymentIntentId}
              />
            </Elements>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
/** Evita un await a Stripe colgado indefinidamente (3DS, wallet, red). */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('__stripe_timeout__')), ms);
    promise
      .then(
        (v) => {
          clearTimeout(t);
          resolve(v);
        },
        (e) => {
          clearTimeout(t);
          reject(e);
        }
      );
  });
}

// Formulario interno (usa hooks de Elements)
// ───────────────────────────────────────────────────────────────────────────
function CheckoutForm({
  onCancel,
  clientSecret,
  createdPaymentIntentId,
}: {
  onCancel: () => void;
  clientSecret: string;
  createdPaymentIntentId: string;
}): JSX.Element {
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
      let willNavigate = false;

      try {
        // OBLIGATORIO (Payment Element v2+): validar el formulario antes de confirmar.
        // Si no se llama, `confirmPayment` puede quedarse colgado en algunos flujos.
        const { error: submitErr } = await elements.submit();
        if (submitErr) {
          setError(
            formatUserFacingError(submitErr) || 'Revisa los datos del método de pago.'
          );
          return;
        }

        let paymentIntent: import('@stripe/stripe-js').PaymentIntent | null | undefined;
        let stripeError: import('@stripe/stripe-js').StripeError | null | undefined;

        try {
          const out = await withTimeout(
            stripe.confirmPayment({
              elements,
              confirmParams: {
                return_url: `${returnBase}/portal/pagos/success`,
              },
              redirect: 'if_required',
            }),
            150_000
          );
          stripeError = out.error;
          paymentIntent = out.paymentIntent;
        } catch (te) {
          if (te instanceof Error && te.message === '__stripe_timeout__') {
            setError(
              'La operación tarda demasiado. Revisa en Bonos y pagos, o cierra e inténtalo de nuevo (si se abrió 3D Secure, complétalo en esa ventana).'
            );
            return;
          }
          throw te;
        }

        if (stripeError) {
          setError(
            formatUserFacingError(stripeError) || 'No se pudo completar el pago.'
          );
          return;
        }

        let pi: import('@stripe/stripe-js').PaymentIntent | null = paymentIntent ?? null;
        if (!pi) {
          let retrieved: Awaited<ReturnType<typeof stripe.retrievePaymentIntent>>;
          try {
            retrieved = await withTimeout(
              stripe.retrievePaymentIntent(clientSecret),
              25_000
            );
          } catch (re) {
            if (re instanceof Error && re.message === '__stripe_timeout__') {
              setError(
                'No hemos podido comprobar el pago. Revisa conexión o mira en Bonos y pagos en unos segundos.'
              );
              return;
            }
            throw re;
          }
          if (retrieved.error) {
            setError(
              formatUserFacingError(retrieved.error) ||
                'No se pudo verificar el estado del pago. Vuelve a intentarlo.'
            );
            return;
          }
          pi = retrieved.paymentIntent;
        }

        const st = pi?.status;
        if (st === 'requires_payment_method' || st === 'canceled') {
          setError(
            st === 'canceled'
              ? 'Pago cancelado. Prueba con otro método o tarjeta.'
              : 'El pago no se pudo completar. Revisa el método e inténtalo de nuevo.'
          );
          return;
        }
        if (st === 'requires_action') {
          setError(
            'Completa la autenticación bancaria (3D Secure) o cierra e inténtalo de nuevo.'
          );
          return;
        }

        if (
          st === 'succeeded' ||
          st === 'processing' ||
          st === 'requires_capture' ||
          (st == null && pi == null)
        ) {
          const id = pi?.id ?? createdPaymentIntentId;
          if (id) {
            willNavigate = true;
            const q = new URLSearchParams({ payment_intent: id });
            window.location.assign(`${returnBase}/portal/pagos/success?${q.toString()}`);
            return;
          }
          setError('No hemos recibido el id del pago. Revisa en Bonos y pagos o contacta.');
          return;
        }

        setError('Estado de pago imprevisto. Revisa en Bonos y pagos.');
      } catch (u: unknown) {
        setError(
          formatUserFacingError(u) || 'Error inesperado. Inténtalo de nuevo.'
        );
      } finally {
        if (!willNavigate) {
          setSubmitting(false);
        }
      }
    },
    [stripe, elements, clientSecret, createdPaymentIntentId]
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
      <p className="mt-2 font-body text-[0.75rem] leading-relaxed text-red-800/90 dark:text-red-300/90">
        Si no aparece el formulario de tarjeta o ves 401 en consola, revisa que la clave
        publicable (Vercel) y la secreta (Supabase) sean de la <strong>misma</strong> cuenta
        de Stripe y el <strong>mismo</strong> modo (pruebas o real).
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
