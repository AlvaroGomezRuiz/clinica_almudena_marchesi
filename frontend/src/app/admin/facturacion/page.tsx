import { format, startOfMonth, startOfYear, subMonths, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

import {
  Button,
  Chip,
  EmptyState,
  PageHeader,
  StatCard,
  SectionDivider,
  SurfaceCard,
} from '@/components/portal-shell/ui';
import { createServerClient } from '@/lib/supabase/server';
import type { BonoPaciente } from '@/lib/supabase/types';

export const metadata = { title: 'Facturación | Panel Almudena' };
export const dynamic = 'force-dynamic';

interface PagoRow {
  id: string;
  importe_centimos: number;
  moneda: string;
  estado: string;
  fecha_pago: string;
  stripe_payment_intent: string | null;
  paciente_id: string;
}

interface PagoSumRow {
  readonly importe_centimos: number;
  readonly fecha_pago: string;
  readonly estado: string;
}

interface BonoRow extends BonoPaciente {
  servicio_id: string;
}

function euro(centimos: number): string {
  return (centimos / 100).toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR',
  });
}

export default async function AdminFacturacionPage(): Promise<JSX.Element> {
  const supabase = createServerClient();
  const now = new Date();

  // Últimos 12 meses completos (including current)
  const monthsBack = 12;
  const earliest = startOfMonth(subMonths(now, monthsBack - 1));

  const [
    { data: pagosAnualRaw },
    { data: ultimosRaw },
    { data: bonosRaw },
  ] = await Promise.all([
    supabase
      .from('pagos')
      .select('importe_centimos, fecha_pago, estado')
      .gte('fecha_pago', earliest.toISOString())
      .in('estado', ['completado', 'procesando']),
    supabase
      .from('pagos')
      .select(
        'id, paciente_id, importe_centimos, moneda, estado, fecha_pago, stripe_payment_intent'
      )
      .order('fecha_pago', { ascending: false })
      .limit(30),
    supabase
      .from('bonos_pacientes')
      .select('*')
      .eq('activo', true)
      .eq('estado', 'activo')
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  const pagosAnual = (pagosAnualRaw as PagoSumRow[] | null) ?? [];
  const ultimos = (ultimosRaw as PagoRow[] | null) ?? [];
  const bonos = (bonosRaw as BonoRow[] | null) ?? [];

  const totalMes = pagosAnual
    .filter(
      (p) =>
        p.estado === 'completado' &&
        new Date(p.fecha_pago) >= startOfMonth(now)
    )
    .reduce((a, p) => a + p.importe_centimos, 0);

  const totalAno = pagosAnual
    .filter(
      (p) =>
        p.estado === 'completado' &&
        new Date(p.fecha_pago) >= startOfYear(now)
    )
    .reduce((a, p) => a + p.importe_centimos, 0);

  const pagosAnoCount = pagosAnual.filter(
    (p) =>
      p.estado === 'completado' && new Date(p.fecha_pago) >= startOfYear(now)
  ).length;

  // Agregación últimos 12 meses
  const meses: { label: string; key: string; total: number }[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const m = subMonths(now, i);
    meses.push({
      label: format(m, 'MMM', { locale: es }),
      key: format(m, 'yyyy-MM'),
      total: 0,
    });
  }
  for (const p of pagosAnual) {
    if (p.estado !== 'completado') continue;
    const k = format(new Date(p.fecha_pago), 'yyyy-MM');
    const slot = meses.find((m) => m.key === k);
    if (slot) slot.total += p.importe_centimos;
  }
  const maxMes = Math.max(1, ...meses.map((m) => m.total));

  // CSV URL (rango: últimos 12 meses)
  const csvFrom = format(earliest, 'yyyy-MM-dd');
  const csvTo = format(endOfMonth(now), 'yyyy-MM-dd');
  const csvHref = `/api/admin/facturacion/export?from=${csvFrom}&to=${csvTo}`;

  return (
    <>
      <PageHeader
        eyebrow={format(now, "LLLL yyyy", { locale: es })}
        title="Facturación"
        description="Ingresos, pagos Stripe, bonos activos y reportes para gestoría."
        actions={
          <a href={csvHref} download>
            <Button variant="primary" icon="download">Exportar CSV</Button>
          </a>
        }
      />

      <section className="mb-10 grid grid-cols-1 gap-5 sm:grid-cols-3 portal-rise">
        <StatCard label="Ingresos del mes" value={euro(totalMes)} icon="payments" />
        <StatCard label="Ingresos del año" value={euro(totalAno)} icon="trending_up" />
        <StatCard
          label="Pagos procesados"
          value={pagosAnoCount}
          icon="receipt_long"
          footnote="Este año"
        />
      </section>

      {/* ─── Evolución 12 meses ─── */}
      <SurfaceCard className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-[1.25rem] italic text-ink dark:text-white">
              Evolución mensual
            </h2>
            <p className="font-body text-[0.75rem] text-ink-muted dark:text-white/55">
              Últimos 12 meses · solo pagos completados
            </p>
          </div>
          <Chip tone="info">{euro(meses.reduce((a, m) => a + m.total, 0))}</Chip>
        </div>

        <div className="grid grid-cols-12 gap-2 items-end h-40">
          {meses.map((m) => {
            const h = (m.total / maxMes) * 100;
            return (
              <div
                key={m.key}
                className="flex flex-col items-center justify-end h-full"
                title={`${m.label}: ${euro(m.total)}`}
              >
                <div
                  className="w-full rounded-t-md bg-primary/80 dark:bg-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] transition-all"
                  style={{ height: `${h}%`, minHeight: m.total > 0 ? 2 : 0 }}
                  aria-label={`${m.label}: ${euro(m.total)}`}
                />
                <span className="mt-1 font-body text-[0.62rem] text-ink-muted dark:text-white/55">
                  {m.label}
                </span>
              </div>
            );
          })}
        </div>
      </SurfaceCard>

      {/* ─── Bonos activos ─── */}
      <SurfaceCard className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-[1.25rem] italic text-ink dark:text-white">
              Bonos activos
            </h2>
            <p className="font-body text-[0.75rem] text-ink-muted dark:text-white/55">
              {bonos.length} bono{bonos.length === 1 ? '' : 's'} en curso
            </p>
          </div>
          <Link href="/admin/pacientes">
            <Button variant="surface" icon="add">
              Asignar bono
            </Button>
          </Link>
        </div>

        {bonos.length === 0 ? (
          <EmptyState
            icon="confirmation_number"
            title="Sin bonos activos"
            description="Los bonos se crean al confirmar el pago desde la ficha del paciente."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-ink/5 dark:border-white/10">
                  <Th>Paciente</Th>
                  <Th>Progreso</Th>
                  <Th>Total sesiones</Th>
                  <Th>Caduca</Th>
                  <Th>Comprado</Th>
                </tr>
              </thead>
              <tbody>
                {bonos.map((b) => {
                  const restantes = Math.max(
                    0,
                    b.sesiones_totales - b.sesiones_consumidas
                  );
                  const pct = Math.round(
                    (b.sesiones_consumidas / b.sesiones_totales) * 100
                  );
                  const low = restantes <= 2;
                  return (
                    <tr
                      key={b.id}
                      className="border-b border-ink/5 hover:bg-white/40 dark:border-white/5 dark:hover:bg-white/5"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/pacientes/${b.paciente_id}`}
                          className="font-body text-[0.85rem] text-ink hover:underline dark:text-white"
                        >
                          #{b.paciente_id.slice(0, 8)}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-ink/10 dark:bg-white/10">
                            <div
                              className={`h-full ${low ? 'bg-amber-600' : 'bg-primary'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span
                            className={`font-body text-[0.75rem] tabular-nums ${low ? 'text-amber-700 dark:text-amber-300' : 'text-ink-muted dark:text-white/55'}`}
                          >
                            {b.sesiones_consumidas}/{b.sesiones_totales}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-body text-[0.82rem] text-ink dark:text-white tabular-nums">
                        {b.sesiones_totales}
                      </td>
                      <td className="px-4 py-3 font-body text-[0.8rem] text-ink-muted dark:text-white/55">
                        {b.fecha_expiracion
                          ? format(new Date(b.fecha_expiracion), "d MMM yyyy", { locale: es })
                          : '—'}
                      </td>
                      <td className="px-4 py-3 font-body text-[0.8rem] text-ink-muted dark:text-white/55">
                        {format(new Date(b.fecha_compra), 'd MMM yyyy', { locale: es })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SurfaceCard>

      <SectionDivider />

      {/* ─── Últimos pagos ─── */}
      <SurfaceCard className="p-0 overflow-hidden">
        <header className="border-b border-ink/5 p-6 dark:border-white/10">
          <h2 className="font-display text-[1.25rem] italic text-ink dark:text-white">
            Últimos pagos
          </h2>
          <p className="mt-1 font-body text-[0.8rem] text-ink-muted dark:text-white/55">
            Ordenados por fecha
          </p>
        </header>

        {ultimos.length === 0 ? (
          <div className="p-12">
            <EmptyState icon="receipt" title="Sin pagos registrados" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-ink/5 dark:border-white/10">
                  <Th>Fecha</Th>
                  <Th>Importe</Th>
                  <Th>Estado</Th>
                  <Th>Paciente</Th>
                  <Th>Stripe PI</Th>
                </tr>
              </thead>
              <tbody>
                {ultimos.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-ink/5 hover:bg-white/40 dark:border-white/5 dark:hover:bg-white/5"
                  >
                    <td className="px-6 py-4 font-body text-[0.85rem] text-ink-soft dark:text-white/70">
                      {format(new Date(p.fecha_pago), "d MMM yyyy · HH:mm", {
                        locale: es,
                      })}
                    </td>
                    <td className="px-6 py-4 font-display text-[0.95rem] text-ink tabular-nums dark:text-white">
                      {euro(p.importe_centimos)}
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
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/pacientes/${p.paciente_id}`}
                        className="font-body text-[0.8rem] text-ink hover:underline dark:text-white"
                      >
                        #{p.paciente_id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-6 py-4 font-mono text-[0.7rem] text-ink-muted dark:text-white/55">
                      {p.stripe_payment_intent
                        ? p.stripe_payment_intent.slice(0, 16) + '…'
                        : '—'}
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

function Th({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <th className="px-4 py-3 font-body text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted dark:text-white/55">
      {children}
    </th>
  );
}
