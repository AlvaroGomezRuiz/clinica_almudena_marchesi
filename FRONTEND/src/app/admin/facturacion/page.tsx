import { format, startOfMonth, startOfYear } from 'date-fns';
import { es } from 'date-fns/locale';

import {
  Chip,
  EmptyState,
  PageHeader,
  StatCard,
  SurfaceCard,
} from '@/components/portal-shell/ui';
import { createServerClient } from '@/lib/supabase/server';

export const metadata = { title: 'Facturación | Panel Almudena' };
export const dynamic = 'force-dynamic';

interface PagoRow {
  id: string;
  importe_centimos: number;
  moneda: string;
  estado: string;
  metodo: string | null;
  fecha_pago: string;
  stripe_payment_intent_id: string | null;
}

interface PagoSumRow {
  readonly importe_centimos: number;
}

function euro(centimos: number): string {
  return (centimos / 100).toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR',
  });
}

export default async function AdminFacturacionPage() {
  const supabase = createServerClient();
  const now = new Date();

  const [{ data: pagosMes }, { data: pagosAno }, { data: pagosUltimos }] = await Promise.all([
    supabase
      .from('pagos')
      .select('importe_centimos, estado')
      .gte('fecha_pago', startOfMonth(now).toISOString())
      .eq('estado', 'completado'),
    supabase
      .from('pagos')
      .select('importe_centimos, estado')
      .gte('fecha_pago', startOfYear(now).toISOString())
      .eq('estado', 'completado'),
    supabase
      .from('pagos')
      .select('id, importe_centimos, moneda, estado, metodo, fecha_pago, stripe_payment_intent_id')
      .order('fecha_pago', { ascending: false })
      .limit(30),
  ]);

  const totalMes =
    (pagosMes as PagoSumRow[] | null)?.reduce((a, p) => a + p.importe_centimos, 0) ?? 0;
  const totalAno =
    (pagosAno as PagoSumRow[] | null)?.reduce((a, p) => a + p.importe_centimos, 0) ?? 0;
  const ultimos = (pagosUltimos as PagoRow[] | null) ?? [];

  return (
    <>
      <PageHeader
        eyebrow={format(now, "LLLL yyyy", { locale: es })}
        title="Facturación"
        description="Ingresos, pagos Stripe y notas simples para tu gestoría."
      />

      <section className="mb-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatCard label="Ingresos del mes" value={euro(totalMes)} icon="payments" />
        <StatCard label="Ingresos del año" value={euro(totalAno)} icon="trending_up" />
        <StatCard label="Pagos procesados" value={pagosAno?.length ?? 0} icon="receipt_long" footnote="Este año" />
      </section>

      <SurfaceCard className="p-0 overflow-hidden">
        <header className="border-b border-ink/5 p-6">
          <h2 className="font-display text-[1.25rem] italic text-ink">Últimos pagos</h2>
          <p className="mt-1 font-body text-[0.8rem] text-ink-muted">Ordenados por fecha</p>
        </header>

        {ultimos.length === 0 ? (
          <div className="p-12">
            <EmptyState icon="receipt" title="Sin pagos registrados" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-ink/5">
                  <th className="px-6 py-3 font-body text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">Fecha</th>
                  <th className="px-6 py-3 font-body text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">Importe</th>
                  <th className="px-6 py-3 font-body text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">Método</th>
                  <th className="px-6 py-3 font-body text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">Estado</th>
                  <th className="px-6 py-3 font-body text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">Stripe</th>
                </tr>
              </thead>
              <tbody>
                {ultimos.map((p) => (
                  <tr key={p.id} className="border-b border-ink/5 hover:bg-white/40">
                    <td className="px-6 py-4 font-body text-[0.85rem] text-ink-soft">
                      {format(new Date(p.fecha_pago), "d MMM yyyy · HH:mm", { locale: es })}
                    </td>
                    <td className="px-6 py-4 font-display text-[0.95rem] text-ink tabular-nums">
                      {euro(p.importe_centimos)}
                    </td>
                    <td className="px-6 py-4 font-body text-[0.8rem] text-ink-soft capitalize">
                      {p.metodo ?? '—'}
                    </td>
                    <td className="px-6 py-4">
                      <Chip
                        tone={
                          p.estado === 'completado'
                            ? 'positive'
                            : p.estado === 'fallido'
                              ? 'critical'
                              : 'warning'
                        }
                      >
                        {p.estado}
                      </Chip>
                    </td>
                    <td className="px-6 py-4 font-mono text-[0.7rem] text-ink-muted">
                      {p.stripe_payment_intent_id ? p.stripe_payment_intent_id.slice(0, 16) + '…' : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SurfaceCard>
    </>
  );
}
