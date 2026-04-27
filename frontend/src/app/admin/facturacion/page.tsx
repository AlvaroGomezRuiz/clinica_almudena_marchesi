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
import AsignarBonoManualButton from '@/components/admin/facturacion/AsignarBonoManualButton';
import { RedeemGiftIcon } from '@/components/icons/RedeemGiftIcon';
import RealtimeRefresh from '@/components/realtime/RealtimeRefresh';
import { getMetodoFacturacionPantalla } from '@/lib/admin/facturacion-metodo-display';
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
  metodo: string | null;
  excluir_de_facturacion: boolean;
}

interface PagoSumRow {
  readonly importe_centimos: number;
  readonly fecha_pago: string;
  readonly estado: string;
  readonly excluir_de_facturacion: boolean;
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
      .select('importe_centimos, fecha_pago, estado, excluir_de_facturacion')
      .gte('fecha_pago', earliest.toISOString())
      .in('estado', ['completado', 'procesando'])
      .eq('excluir_de_facturacion', false),
    supabase
      .from('pagos')
      .select(
        'id, paciente_id, importe_centimos, moneda, estado, fecha_pago, stripe_payment_intent, metodo, excluir_de_facturacion'
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

  const bonoPacienteIds = Array.from(new Set(bonos.map((b) => b.paciente_id)));
  const { data: resumenUltima } =
    bonoPacienteIds.length > 0
      ? await supabase
          .from('v_pacientes_resumen_admin')
          .select('id, ultima_cita')
          .in('id', bonoPacienteIds)
      : { data: [] as { id: string; ultima_cita: string | null }[] };
  const ultimaCitaPorPaciente = new Map(
    ((resumenUltima as { id: string; ultima_cita: string | null }[] | null) ?? []).map((r) => [
      r.id,
      r.ultima_cita,
    ])
  );

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
  const csvBase = `/api/admin/facturacion/export?from=${csvFrom}&to=${csvTo}`;
  const csvHref = csvBase;
  const csvHrefInclRegalos = `${csvBase}&incluir_regalos=1`;

  return (
    <>
      <RealtimeRefresh
        channelName="admin-facturacion"
        tables={['pagos', 'bonos_pacientes']}
      />
      <PageHeader
        eyebrow={format(now, "LLLL yyyy", { locale: es })}
        title="Facturación"
        description="Ingresos, pagos Stripe, bonos activos y reportes para gestoría. El CSV respeta el filtro de regalos; usa la variante con regalos solo para auditoría interna."
        actions={
          <div className="flex w-full flex-col gap-2 min-[480px]:w-auto min-[480px]:flex-row min-[480px]:flex-wrap min-[480px]:items-center min-[480px]:justify-end">
            <a href={csvHref} download>
              <Button variant="primary" icon="download">
                Exportar CSV
              </Button>
            </a>
            <a href={csvHrefInclRegalos} download>
              <Button
                variant="surface"
                iconNode={<RedeemGiftIcon className="h-[1rem] w-[1rem]" />}
              >
                CSV con regalos
              </Button>
            </a>
            <AsignarBonoManualButton />
          </div>
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
        </div>

        {bonos.length === 0 ? (
          <EmptyState
            icon="confirmation_number"
            title="Sin bonos activos"
            description="Los bonos se crean al confirmar el pago desde la ficha del paciente."
          />
        ) : (
          <div className="-mx-1 overflow-x-auto rounded-md sm:mx-0">
            <table className="w-full min-w-[40rem] text-left">
              <caption className="sr-only">
                Bonos activos: progreso de sesiones y fechas de compra o caducidad
              </caption>
              <thead>
                <tr className="border-b border-ink/5 dark:border-white/10">
                  <Th>Paciente</Th>
                  <Th>Progreso</Th>
                  <Th>Total sesiones</Th>
                  <Th>Última cita</Th>
                  <Th>Caduca</Th>
                  <Th>Comprado</Th>
                </tr>
              </thead>
              <tbody>
                {bonos.map((b, idx) => {
                  const restantes = Math.max(
                    0,
                    b.sesiones_totales - b.sesiones_consumidas
                  );
                  const pct = Math.round(
                    (b.sesiones_consumidas / b.sesiones_totales) * 100
                  );
                  const low = restantes <= 2;
                  const zebra =
                    idx % 2 === 1
                      ? 'bg-ink/[0.06] dark:bg-white/[0.08]'
                      : 'bg-ink/[0.02] dark:bg-white/[0.02]';
                  return (
                    <tr
                      key={b.id}
                      className={`border-b border-ink/5 transition-colors dark:border-white/5 ${zebra} hover:bg-primary/[0.06] dark:hover:bg-white/[0.08]`}
                    >
                      <th scope="row" className="px-2 py-2 text-left sm:px-4 sm:py-3">
                        <Link
                          href={`/admin/pacientes/${b.paciente_id}`}
                          className="font-body text-[0.78rem] text-ink hover:underline sm:text-[0.85rem] dark:text-white"
                        >
                          #{b.paciente_id.slice(0, 8)}
                        </Link>
                      </th>
                      <td className="px-2 py-2 sm:px-4 sm:py-3">
                        <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
                          <div className="h-2 w-20 shrink-0 overflow-hidden rounded-full bg-ink/10 sm:w-24 dark:bg-white/10">
                            <div
                              className={`h-full ${low ? 'bg-amber-600' : 'bg-primary'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span
                            className={`font-body text-[0.7rem] tabular-nums sm:text-[0.75rem] ${low ? 'text-amber-700 dark:text-amber-300' : 'text-ink-muted dark:text-white/55'}`}
                          >
                            {b.sesiones_consumidas}/{b.sesiones_totales}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-2 font-body text-[0.76rem] tabular-nums text-ink sm:px-4 sm:py-3 sm:text-[0.82rem] dark:text-white">
                        {b.sesiones_totales}
                      </td>
                      <td className="px-2 py-2 text-center font-body text-[0.74rem] text-ink-muted sm:px-4 sm:py-3 sm:text-[0.8rem] dark:text-white/55">
                        {(() => {
                          const u = ultimaCitaPorPaciente.get(b.paciente_id);
                          return u
                            ? format(new Date(u), "d MMM yyyy · HH:mm", { locale: es })
                            : '—';
                        })()}
                      </td>
                      <td className="px-2 py-2 font-body text-[0.74rem] text-ink-muted sm:px-4 sm:py-3 sm:text-[0.8rem] dark:text-white/55">
                        {b.fecha_expiracion
                          ? format(new Date(b.fecha_expiracion), "d MMM yyyy", { locale: es })
                          : '—'}
                      </td>
                      <td className="px-2 py-2 font-body text-[0.74rem] text-ink-muted sm:px-4 sm:py-3 sm:text-[0.8rem] dark:text-white/55">
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
        <header className="border-b border-ink/5 p-4 sm:p-6 dark:border-white/10">
          <h2 className="font-display text-[1.15rem] italic text-ink sm:text-[1.25rem] dark:text-white">
            Últimos pagos
          </h2>
          <p className="mt-1 font-body text-[0.75rem] text-ink-muted sm:text-[0.8rem] dark:text-white/55">
            Ordenados por fecha
          </p>
        </header>

        {ultimos.length === 0 ? (
          <div className="p-8 sm:p-12">
            <EmptyState icon="receipt" title="Sin pagos registrados" />
          </div>
        ) : (
          <div className="-mx-1 overflow-x-auto px-0 sm:mx-0">
            <table className="w-full min-w-[42rem] text-left">
              <caption className="sr-only">
                Últimos pagos del sistema, del más reciente al más antiguo
              </caption>
              <thead>
                <tr className="border-b border-ink/5 dark:border-white/10">
                  <Th>Fecha</Th>
                  <Th>Importe</Th>
                  <Th>Medio</Th>
                  <Th>Estado</Th>
                  <Th>Paciente</Th>
                  <Th>Ref. pago</Th>
                </tr>
              </thead>
              <tbody>
                {ultimos.map((p, idx) => {
                  const med = getMetodoFacturacionPantalla({
                    metodo: p.metodo,
                    stripePaymentIntent: p.stripe_payment_intent,
                  });
                  const zebra =
                    idx % 2 === 1
                      ? 'bg-ink/[0.035] dark:bg-white/[0.045]'
                      : 'bg-transparent';
                  return (
                    <tr
                      key={p.id}
                      className={`border-b border-ink/5 transition-colors dark:border-white/5 ${zebra} hover:bg-primary/[0.06] dark:hover:bg-white/[0.08]`}
                    >
                      <th
                        scope="row"
                        className="px-2 py-2 text-left font-body text-[0.74rem] font-normal text-ink-soft sm:px-4 sm:py-3 sm:text-[0.85rem] dark:text-white/70"
                      >
                        {format(new Date(p.fecha_pago), "d MMM yyyy · HH:mm", {
                          locale: es,
                        })}
                      </th>
                      <td className="px-2 py-2 font-display text-[0.82rem] tabular-nums text-ink sm:px-4 sm:py-3 sm:text-[0.95rem] dark:text-white">
                        {euro(p.importe_centimos)}
                      </td>
                      <td className="px-2 py-2 sm:px-4 sm:py-3">
                        <div className="inline-flex min-w-0 max-w-[14rem] flex-col items-start gap-1 sm:max-w-none sm:flex-row sm:items-center sm:gap-2">
                          <span className="inline-flex min-w-0 items-center gap-1.5">
                            <span
                              className="material-symbols-outlined shrink-0 text-[1rem] text-ink-muted dark:text-white/50"
                              aria-hidden="true"
                            >
                              {med.icon}
                            </span>
                            <span className="min-w-0 break-words font-body text-[0.7rem] text-ink sm:text-[0.75rem] dark:text-white">
                              {med.shortLabel}
                            </span>
                          </span>
                          {p.excluir_de_facturacion ? <Chip tone="info">regalo</Chip> : null}
                        </div>
                      </td>
                      <td className="px-2 py-2 sm:px-4 sm:py-3">
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
                      <td className="px-2 py-2 sm:px-4 sm:py-3">
                        <Link
                          href={`/admin/pacientes/${p.paciente_id}`}
                          className="font-body text-[0.74rem] text-ink hover:underline sm:text-[0.8rem] dark:text-white"
                        >
                          #{p.paciente_id.slice(0, 8)}
                        </Link>
                      </td>
                      <td className="px-2 py-2 font-mono text-[0.62rem] text-ink-muted sm:px-4 sm:py-3 sm:text-[0.7rem] dark:text-white/55">
                        {p.stripe_payment_intent
                          ? `${p.stripe_payment_intent.slice(0, 16)}…`
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
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
    <th
      scope="col"
      className="whitespace-nowrap px-2 py-2 font-body text-[0.62rem] uppercase tracking-[0.12em] text-ink-muted sm:px-4 sm:py-3 sm:text-[0.7rem] sm:tracking-[0.15em] dark:text-white/55"
    >
      {children}
    </th>
  );
}
