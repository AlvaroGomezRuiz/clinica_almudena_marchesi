'use client';

/**
 * Tarjeta cliente para comprar un bono. Crea la sesión Stripe vía Server Action
 * y redirige al hosted checkout. Si falla, muestra el error inline.
 */

import { useTransition, useState } from 'react';

import { Button, Chip, SurfaceCard } from '@/components/portal-shell/ui';
import { crearCheckoutBonoAction } from '@/services/pagos/actions';

export interface BonoConfigItem {
  readonly id: string;
  readonly nombre: string;
  readonly descripcion: string | null;
  readonly sesiones: number;
  readonly precio_centimos: number;
  readonly validez_dias: number | null;
  readonly destacado: boolean;
}

interface Props {
  readonly bono: BonoConfigItem;
}

function euro(c: number): string {
  return (c / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

export default function BonoCompraCard({ bono }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const precioPorSesion = bono.precio_centimos / bono.sesiones;

  const handleCheckout = () => {
    setError(null);
    startTransition(async () => {
      const res = await crearCheckoutBonoAction(bono.id);
      if (!res.ok) {
        setError('No pudimos iniciar el pago. Reintenta.');
        return;
      }
      window.location.href = res.url;
    });
  };

  return (
    <SurfaceCard
      variant={bono.destacado ? 'hero' : 'glass'}
      bezel={bono.destacado}
      glow={bono.destacado ? 'sage' : 'none'}
    >
      <header className="mb-4 flex items-start justify-between gap-3">
        <Chip tone={bono.destacado ? 'positive' : 'info'}>
          {bono.destacado ? 'Más elegido' : `${bono.sesiones} sesiones`}
        </Chip>
        <p className="font-display text-[1.5rem] italic text-primary tabular-nums tracking-[-0.01em]">
          {euro(bono.precio_centimos)}
        </p>
      </header>

      <h3 className="font-display text-[1.35rem] italic text-ink leading-tight tracking-[-0.01em]">
        {bono.nombre}
      </h3>
      {bono.descripcion ? (
        <p className="mt-2 font-body text-[0.88rem] text-ink-soft leading-[1.55]">
          {bono.descripcion}
        </p>
      ) : null}

      <dl className="mt-5 grid grid-cols-2 gap-3">
        <div>
          <dt className="font-body text-[0.62rem] uppercase tracking-[0.18em] text-ink-muted">
            Por sesión
          </dt>
          <dd className="mt-0.5 font-display text-[1rem] italic text-ink tabular-nums">
            {euro(precioPorSesion)}
          </dd>
        </div>
        {bono.validez_dias ? (
          <div>
            <dt className="font-body text-[0.62rem] uppercase tracking-[0.18em] text-ink-muted">
              Validez
            </dt>
            <dd className="mt-0.5 font-body text-[0.88rem] text-ink">
              {bono.validez_dias} días
            </dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-6">
        <Button
          onClick={handleCheckout}
          variant={bono.destacado ? 'primary' : 'surface'}
          icon={isPending ? 'sync' : 'shopping_bag'}
          disabled={isPending}
          className="w-full justify-between"
        >
          {isPending ? 'Redirigiendo a Stripe…' : 'Comprar ahora'}
        </Button>
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#b2675e]/12 ring-1 ring-inset ring-[#b2675e]/22 px-3 py-1.5 font-body text-[0.78rem] text-[#8c4d44]"
        >
          <span className="material-symbols-outlined text-[0.95rem]" aria-hidden="true">
            error
          </span>
          {error}
        </p>
      ) : null}
    </SurfaceCard>
  );
}
