'use client';

import { useSearchParams } from 'next/navigation';
import { useFormStatus } from 'react-dom';
import { createCheckoutAction } from '@/lib/payments/actions';

function PayButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="w-full bg-primary text-on-primary px-10 py-5 rounded-xl font-label text-xs uppercase tracking-[0.2em] font-bold editorial-shadow hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
      type="submit"
      disabled={pending}
    >
      {pending ? 'Procesando...' : 'Pagar Sesión (50€)'}
    </button>
  );
}

export default function PortalCitasPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  return (
    <main className="min-h-screen bg-background text-on-surface font-body selection:bg-primary-container selection:text-on-primary-container">
      <div className="max-w-6xl mx-auto px-8 py-16">
        <header className="mb-12">
          <span className="text-secondary font-medium tracking-widest text-xs uppercase mb-2 block">
            Portal del Paciente
          </span>
          <h1 className="text-4xl md:text-5xl font-headline text-primary tracking-tight">
            Citas
          </h1>
          <p className="text-on-surface-variant mt-2 max-w-2xl leading-relaxed">
            Inicia el pago seguro de tu sesión mediante Stripe.
          </p>
          {error ? (
            <div className="mt-6 bg-error-container text-on-error-container border border-error/20 rounded-xl p-4 text-sm max-w-2xl">
              {error}
            </div>
          ) : null}
        </header>

        <section className="bg-surface-container-lowest p-10 rounded-xl editorial-shadow border border-outline-variant/10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div>
              <p className="font-label text-xs uppercase tracking-widest text-secondary font-bold">
                Pago
              </p>
              <h2 className="font-headline text-2xl text-primary font-bold mt-2">
                Sesión Individual
              </h2>
              <p className="text-on-surface-variant mt-1">50,00 €</p>
            </div>

            <form action={createCheckoutAction} className="w-full md:w-auto">
              <input type="hidden" name="servicio_id" value="sesion_50_eur" />
              <input type="hidden" name="return_to" value="/portal/citas" />
              <PayButton />
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
