'use client';

/**
 * Tarjeta cliente para comprar un bono.
 * Flujo F5: abre el <PaymentElementDrawer/> (embebido) en vez de redirigir
 * a Stripe Checkout. El hosted checkout queda como fallback opcional.
 */

import { useState } from 'react';

import { Button, Chip, SurfaceCard } from '@/components/portal-shell/ui';
import PaymentElementDrawer from '@/components/portal/pagos/PaymentElementDrawer';

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
  const [open, setOpen] = useState(false);

  const precioPorSesion = bono.precio_centimos / bono.sesiones;

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
          onClick={() => setOpen(true)}
          variant={bono.destacado ? 'primary' : 'surface'}
          icon="shopping_bag"
          className="w-full justify-between"
        >
          Comprar ahora
        </Button>
      </div>

      <PaymentElementDrawer
        open={open}
        onClose={() => setOpen(false)}
        target={{ kind: 'bono', bonoConfigId: bono.id }}
        amountHint={bono.precio_centimos}
        titleHint={bono.nombre}
      />
    </SurfaceCard>
  );
}
