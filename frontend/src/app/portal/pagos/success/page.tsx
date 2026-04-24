import { redirect } from 'next/navigation';

import { PageHeader } from '@/components/portal-shell/ui';
import { createServerClient } from '@/lib/supabase/server';

import PagoSuccessPanel, { type PagoSuccessRow } from './PagoSuccessPanel';

export const metadata = { title: 'Pago realizado | Portal Paciente' };
export const dynamic = 'force-dynamic';

interface Props {
  readonly searchParams: Promise<{
    session_id?: string;
    /** Payment Element: Stripe añade ?payment_intent=… al return_url. */
    payment_intent?: string;
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

  let pago: PagoSuccessRow | null = null;
  if (sp.session_id) {
    const { data } = await supabase
      .from('pagos')
      .select('id, importe_centimos, moneda, metodo, cita_id, bono_id, fecha_pago')
      .eq('stripe_session_id', sp.session_id)
      .maybeSingle<PagoSuccessRow>();
    pago = data ?? null;
  } else if (sp.payment_intent) {
    const { data } = await supabase
      .from('pagos')
      .select('id, importe_centimos, moneda, metodo, cita_id, bono_id, fecha_pago')
      .eq('stripe_payment_intent', sp.payment_intent)
      .maybeSingle<PagoSuccessRow>();
    pago = data ?? null;
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
        sessionId={sp.session_id}
        paymentIntentId={sp.payment_intent}
      />
    </>
  );
}
