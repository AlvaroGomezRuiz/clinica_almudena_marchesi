import Link from 'next/link';

import CheckoutButton from '@/components/payments/CheckoutButton';
import { CLINIC_SESSION_PRICE_LABEL } from '@/lib/clinic';
import { createCheckoutAction } from '@/services/payments/actions';

async function checkoutFormAction(formData: FormData): Promise<void> {
  'use server';
  await createCheckoutAction(formData);
}

type Plan = {
  id: string;
  title: string;
  description: string;
  priceLabel: string;
  icon: string;
  recommended?: boolean;
};

const PLANS: Plan[] = [
  {
    id: 'individual',
    title: 'Terapia Individual',
    description: 'Sesión individual de 50 minutos. Ideal para iniciar tu proceso.',
    priceLabel: CLINIC_SESSION_PRICE_LABEL,
    icon: 'person',
  },
  {
    id: 'pareja',
    title: 'Terapia de Pareja',
    description: 'Sesión conjunta de 90 minutos. Restaurar vínculo y comunicación.',
    priceLabel: '90€',
    icon: 'diversity_1',
  },
  {
    id: 'bono5',
    title: 'Bono 5',
    description: 'Pack de 5 sesiones. Continuidad y ahorro.',
    priceLabel: '275€',
    icon: 'workspace_premium',
    recommended: true,
  },
  {
    id: 'bono10',
    title: 'Bono 10',
    description: 'Tratamiento intensivo. Máximo compromiso y ahorro.',
    priceLabel: '530€',
    icon: 'military_tech',
  },
] as const;

function getSelectedPlanId(raw: unknown): string {
  const candidate = typeof raw === 'string' ? raw : '';
  const isValid = PLANS.some((p) => p.id === candidate);
  return isValid ? candidate : 'individual';
}

type PagosPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function PagosPage({ searchParams }: PagosPageProps) {
  const selectedPlanId = getSelectedPlanId(searchParams?.plan);
  const selectedPlan = PLANS.find((p) => p.id === selectedPlanId) ?? PLANS[0];
  const errorRaw = searchParams?.error;
  const error = typeof errorRaw === 'string' ? errorRaw : undefined;

  return (
    <main className="pt-32 pb-20 px-4 md:px-8 max-w-7xl mx-auto min-h-screen bg-background text-on-surface font-body selection:bg-primary-container selection:text-on-primary-container">
      <header className="mb-12 text-center max-w-2xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4 leading-tight">
          Reserva y pagos
        </h1>
        <p className="text-secondary font-body text-lg leading-relaxed">
          Selecciona tu plan y finaliza el pago en un entorno seguro.
        </p>
        {error ? (
          <div className="mt-6 bg-error-container text-on-error-container border border-error/20 rounded-xl p-4 text-sm">
            {error}
          </div>
        ) : null}
      </header>

      <section className="space-y-10">
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-primary-dim flex items-center gap-2">
            <span className="material-symbols-outlined">auto_awesome</span>
            Selecciona tu plan
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map((p) => {
              const isSelected = p.id === selectedPlanId;

              return (
                <Link
                  key={p.id}
                  href={`/pagos?plan=${encodeURIComponent(p.id)}`}
                  className={
                    isSelected
                      ? 'relative bg-primary-container border-2 border-primary rounded-xl p-6 transition-all cursor-pointer editorial-shadow'
                      : 'relative bg-surface-container-lowest border-2 border-outline-variant/20 rounded-xl p-6 hover:border-primary transition-all cursor-pointer'
                  }
                >
                  {p.recommended ? (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-on-primary px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
                      Recomendado
                    </div>
                  ) : null}

                  <div className="flex justify-between items-start mb-4">
                    <span
                      className={
                        isSelected
                          ? 'bg-surface-container-lowest p-2 rounded-lg'
                          : 'bg-surface-container-high p-2 rounded-lg'
                      }
                    >
                      <span className="material-symbols-outlined text-primary">
                        {p.icon}
                      </span>
                    </span>
                    <span className="text-2xl font-headline font-bold text-primary">
                      {p.priceLabel}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold mb-2">{p.title}</h3>
                  <p
                    className={
                      isSelected
                        ? 'text-on-primary-container mb-6'
                        : 'text-secondary mb-6'
                    }
                  >
                    {p.description}
                  </p>

                  <div
                    className={
                      isSelected
                        ? 'flex items-center gap-2 text-primary font-bold text-sm'
                        : 'flex items-center gap-2 text-primary font-semibold text-sm'
                    }
                  >
                    <span>{isSelected ? 'Seleccionado' : 'Seleccionar'}</span>
                    <span
                      className="material-symbols-outlined text-sm"
                      style={
                        isSelected ? { fontVariationSettings: '"FILL" 1' } : undefined
                      }
                    >
                      {isSelected ? 'check_circle' : 'arrow_forward'}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="bg-surface-container-low rounded-xl p-8 space-y-6 border border-outline-variant/10 editorial-shadow">
          <h2 className="text-2xl font-semibold text-primary-dim flex items-center gap-2">
            <span className="material-symbols-outlined">payments</span>
            Finalizar pago
          </h2>

          <div className="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/15">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="font-label text-xs uppercase tracking-widest text-secondary font-bold">
                  Plan seleccionado
                </p>
                <p className="font-headline text-2xl text-primary mt-2">
                  {selectedPlan.title}
                </p>
                <p className="text-on-surface-variant mt-1">
                  {selectedPlan.priceLabel}
                </p>
              </div>

              <div className="flex items-center gap-2 text-outline">
                <span className="material-symbols-outlined text-lg" data-icon="shield">
                  shield
                </span>
                <span className="text-[10px] uppercase tracking-widest font-bold">
                  Pago seguro
                </span>
              </div>
            </div>

            <form action={checkoutFormAction} className="mt-8">
              <input type="hidden" name="servicio_id" value={selectedPlanId} />
              <input
                type="hidden"
                name="return_to"
                value={`/pagos?plan=${encodeURIComponent(selectedPlanId)}`}
              />
              <CheckoutButton label="Pagar ahora" />
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}

