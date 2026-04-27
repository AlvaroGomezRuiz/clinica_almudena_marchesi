import type { MetodoPagoManual } from '@/services/admin/actions';

const ASIGNAR_ORDER: readonly MetodoPagoManual[] = [
  'tarjeta',
  'transferencia',
  'regalo',
  'efectivo',
  'klarna',
];

const DETALLE: { readonly [K in MetodoPagoManual]: { label: string; icon: string } } = {
  tarjeta: { label: 'Tarjeta', icon: 'credit_card' },
  transferencia: { label: 'Transferencia', icon: 'account_balance' },
  regalo: { label: 'Regalo', icon: 'card_giftcard' },
  efectivo: { label: 'Efectivo', icon: 'euro' },
  klarna: { label: 'Klarna', icon: 'payments' },
};

/**
 * Opciones del modal «Asignar bono» (mismo criterio visual que en tablas y CSV).
 */
export const METODOS_ASIGNAR_BONO: readonly {
  value: MetodoPagoManual;
  label: string;
  icon: string;
  /** Si true, se pinta `RedeemGiftIcon` en lugar del glifo Material. */
  redeemSvg?: boolean;
}[] = ASIGNAR_ORDER.map((value) => {
  const d = DETALLE[value];
  return {
    value,
    label: d.label,
    icon: d.icon,
    redeemSvg: value === 'regalo',
  };
});

export interface MetodoFacturacionPantalla {
  /** Nombre de icono Material Symbols (subset alojado). */
  icon: string;
  /** Texto breve para la celda. */
  shortLabel: string;
}

function normalizeMetodo(raw: string | null | undefined): string {
  return raw === null || raw === undefined ? '' : raw.trim().toLowerCase();
}

/**
 * Mapea `pagos.metodo` + pista Stripe a icono y etiqueta corta para el panel.
 */
export function getMetodoFacturacionPantalla(params: {
  metodo: string | null;
  stripePaymentIntent: string | null;
}): MetodoFacturacionPantalla {
  const m = normalizeMetodo(params.metodo);
  if (
    m === 'tarjeta' ||
    m === 'transferencia' ||
    m === 'regalo' ||
    m === 'efectivo' ||
    m === 'klarna'
  ) {
    const d = DETALLE[m];
    return { icon: d.icon, shortLabel: d.label };
  }
  if (m === 'stripe' || (m === '' && params.stripePaymentIntent)) {
    return { icon: 'payment', shortLabel: 'Online (Stripe)' };
  }
  if (m === '') {
    return { icon: 'help', shortLabel: '—' };
  }
  return { icon: 'receipt', shortLabel: m };
}
