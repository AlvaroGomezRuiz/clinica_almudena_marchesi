'use client';

/**
 * Tarjeta cliente para comprar un bono.
 * Flujo F5: abre el <PaymentElementDrawer/> (embebido) en vez de redirigir
 * a Stripe Checkout. El hosted checkout queda como fallback opcional.
 */

import { useState } from 'react';

import { Button, Chip, SurfaceCard } from '@/components/portal-shell/ui';
import PaymentElementDrawer from '@/components/portal/pagos/PaymentElementDrawer';
import { cn } from '@/lib/utils';

export interface BonoConfigItem {
  readonly id: string;
  readonly nombre: string;
  readonly descripcion: string | null;
  readonly sesiones: number;
  readonly precio_centimos: number;
  readonly validez_dias: number | null;
  readonly destacado: boolean;
  /** Presente cuando el catálogo incluye servicio (agrupar UI individual/pareja). */
  readonly servicio_id?: string;
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
      variant="glass"
      glow={bono.destacado ? 'sage' : 'none'}
      className={cn(
        'flex h-full min-h-0 flex-col',
        bono.destacado &&
          'ring-1 ring-inset ring-primary/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] dark:ring-primary-fixed/35',
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="mb-4 flex shrink-0 items-start justify-between gap-3">
          <Chip tone={bono.destacado ? 'positive' : 'info'}>
            {bono.destacado ? 'Más elegido' : `${bono.sesiones} sesiones`}
          </Chip>
          <p className="font-display text-[1.5rem] italic text-primary tabular-nums tracking-[-0.01em] dark:text-primary-fixed-dim">
            {euro(bono.precio_centimos)}
          </p>
        </header>

        <h3 className="shrink-0 font-display text-[1.35rem] italic leading-tight tracking-[-0.01em] text-ink dark:text-white">
          {bono.nombre}
        </h3>
        {bono.descripcion ? (
          <p className="mt-2 shrink-0 font-body text-[0.88rem] leading-[1.55] text-ink-soft dark:text-white/72">
            {bono.descripcion}
          </p>
        ) : null}

        <div className="min-h-[1rem] flex-1" aria-hidden="true" />

        <dl className="mt-4 grid shrink-0 grid-cols-2 gap-3">
          <div>
            <dt className="font-body text-[0.62rem] uppercase tracking-[0.18em] text-ink-muted dark:text-white/65">
              Por sesión
            </dt>
            <dd className="mt-0.5 font-display text-[1rem] italic tabular-nums text-ink dark:text-white">
              {euro(precioPorSesion)}
            </dd>
          </div>
          {bono.validez_dias ? (
            <div>
              <dt className="font-body text-[0.62rem] uppercase tracking-[0.18em] text-ink-muted dark:text-white/65">
                Validez
              </dt>
              <dd className="mt-0.5 font-body text-[0.88rem] text-ink dark:text-white/90">
                {bono.validez_dias} días
              </dd>
            </div>
          ) : null}
        </dl>
      </div>

      <div className="mt-6 shrink-0">
        <Button
          onClick={() => setOpen(true)}
          variant="surface"
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
