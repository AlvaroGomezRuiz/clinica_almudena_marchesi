import { redirect } from 'next/navigation';

import { PageHeader } from '@/components/portal-shell/ui';
import { fetchPaymentIntentResumenForUser } from '@/lib/stripe/paymentIntentLookup.server';
import { createServerClient } from '@/lib/supabase/server';

import PagoSuccessPanel, {
  type PagoSuccessBonoResumen,
  type PagoSuccessRow,
  type StripeResumen,
} from './PagoSuccessPanel';

type PagoBase = Omit<PagoSuccessRow, 'bono_resumen'>;

async function withBonoResumen(
  supabase: ReturnType<typeof createServerClient>,
  row: PagoBase
): Promise<PagoSuccessRow> {
  if (!row.bono_id) {
    return { ...row, bono_resumen: null, descripcion: row.descripcion ?? null };
  }
  const { data: b } = await supabase
    .from('bonos_pacientes')
    .select('sesiones_totales, fecha_expiracion')
    .eq('id', row.bono_id)
    .maybeSingle<PagoSuccessBonoResumen>();
  return {
    ...row,
    descripcion: row.descripcion ?? null,
    bono_resumen: b ?? null,
  };
}

export const metadata = { title: 'Pago realizado | Portal Paciente' };
export const dynamic = 'force-dynamic';

interface Props {
  readonly searchParams: Promise<{
    session_id?: string;
    /** Payment Element: Stripe añade ?payment_intent=… al return_url. */
    payment_intent?: string;
    /** Añadida por PaymentElementDrawer para retrieve en cliente (misma lógica que 3DS). */
    payment_intent_client_secret?: string;
    redirect_status?: string;
  }>;
}

export default async function PagoSuccessPage({ searchParams }: Props) {
  const sp = await searchParams;
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login?reason=no_session');
  }

  const baseSelect =
    'id, importe_centimos, moneda, metodo, cita_id, bono_id, fecha_pago, descripcion';

  let pago: PagoSuccessRow | null = null;
  if (sp.session_id) {
    const { data: row } = await supabase
      .from('pagos')
      .select(baseSelect)
      .eq('stripe_session_id', sp.session_id)
      .maybeSingle<PagoBase>();
    pago = row ? await withBonoResumen(supabase, row) : null;
  } else if (sp.payment_intent) {
    const { data: row } = await supabase
      .from('pagos')
      .select(baseSelect)
      .eq('stripe_payment_intent', sp.payment_intent)
      .maybeSingle<PagoBase>();
    pago = row ? await withBonoResumen(supabase, row) : null;
  }

  let stripeResumen: StripeResumen | null = null;
  if (!pago && sp.payment_intent) {
    stripeResumen = await fetchPaymentIntentResumenForUser(sp.payment_intent, user.id);
  }

  return (
    <>
      <PageHeader
        eyebrow="Confirmación"
        title="Pago realizado correctamente"
        description="Gracias. El detalle aparece a continuación; si acabas de completar el pago, a veces tarda unos segundos mientras se registra."
      />

      <PagoSuccessPanel
        initialPago={pago}
        initialStripeResumen={stripeResumen}
        sessionId={sp.session_id}
        paymentIntentId={sp.payment_intent}
        paymentIntentClientSecret={sp.payment_intent_client_secret}
        userId={user.id}
      />
    </>
  );
}
