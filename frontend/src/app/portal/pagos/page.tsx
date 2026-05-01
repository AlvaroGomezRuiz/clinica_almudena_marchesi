import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

import BonoCompraCard, {
  type BonoConfigItem,
} from '@/components/pagos/BonoCompraCard';
import SesionSueltaInfoCard from '@/components/pagos/SesionSueltaInfoCard';
import {
  Chip,
  EmptyState,
  PageHeader,
  SectionDivider,
  StatCard,
  SurfaceCard,
} from '@/components/portal-shell/ui';
import { CLINIC_TARIFAS_SESION_RESUMEN, CLINIC_PUBLIC_SITE_HOST_LABEL } from '@/lib/clinic';
import {
  CLINIC_STRIPE_PAYMENT_ORDER_LABEL_ES,
  clinicStripePaymentKeywordsList,
} from '@/lib/seo/stripe-payment-keywords';
import type { Metadata } from 'next';
import RealtimeRefresh from '@/components/realtime/RealtimeRefresh';
import { createServerClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: `Bonos y pagos | ${CLINIC_PUBLIC_SITE_HOST_LABEL}`,
  description: `Compra bonos y revisa pagos. Métodos: ${CLINIC_STRIPE_PAYMENT_ORDER_LABEL_ES} vía Stripe (EUR).`,
  keywords: clinicStripePaymentKeywordsList(),
};
export const dynamic = 'force-dynamic';

interface PacienteRow {
  readonly id: string;
}

interface BonoPacienteRow {
  readonly id: string;
  readonly servicio_id: string;
  readonly sesiones_totales: number;
  readonly sesiones_consumidas: number;
  readonly estado: 'activo' | 'agotado' | 'expirado' | 'cancelado';
  readonly fecha_compra: string;
  readonly fecha_expiracion: string | null;
  readonly activo: boolean;
}

interface PagoRow {
  readonly id: string;
  readonly importe_centimos: number;
  readonly moneda: string;
  readonly estado:
    | 'pendiente'
    | 'procesando'
    | 'completado'
    | 'fallido'
    | 'reembolsado';
  readonly metodo: string | null;
  readonly fecha_pago: string;
  readonly descripcion: string | null;
}

interface ServicioRef {
  readonly id: string;
  readonly nombre: string;
  readonly precio_centimos: number;
  readonly activo: boolean;
}

function euro(c: number): string {
  return (c / 100).toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR',
  });
}

function chipToneFromEstado(
  estado: PagoRow['estado']
): 'positive' | 'critical' | 'warning' | 'neutral' {
  if (estado === 'completado') return 'positive';
  if (estado === 'fallido') return 'critical';
  if (estado === 'reembolsado') return 'neutral';
  return 'warning';
}

function estadoLabel(estado: PagoRow['estado']): string {
  const map: Record<PagoRow['estado'], string> = {
    pendiente: 'Pendiente',
    procesando: 'Procesando',
    completado: 'Completado',
    fallido: 'Fallido',
    reembolsado: 'Reembolsado',
  };
  return map[estado];
}

function metodoIcon(metodo: string | null | undefined): string {
  if (!metodo) return 'payments';
  const m = metodo.toLowerCase();
  if (m.includes('klarna')) return 'schedule';
  if (m.includes('apple')) return 'apple';
  if (m.includes('google')) return 'google_fill';
  if (m.includes('bizum')) return 'contactless';
  if (m.includes('transfer')) return 'account_balance';
  return 'credit_card';
}

interface PagosAgrupados {
  readonly key: string;
  readonly label: string;
  readonly total: number;
  readonly items: readonly PagoRow[];
}

function agruparPorMes(pagos: readonly PagoRow[]): readonly PagosAgrupados[] {
  const map = new Map<string, PagoRow[]>();
  for (const p of pagos) {
    const d = new Date(p.fecha_pago);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const arr = map.get(key) ?? [];
    arr.push(p);
    map.set(key, arr);
  }
  return Array.from(map.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([key, items]) => {
      const d = new Date(`${key}-01`);
      return {
        key,
        label: format(d, "LLLL yyyy", { locale: es }),
        total: items
          .filter((p) => p.estado === 'completado')
          .reduce((acc, p) => acc + p.importe_centimos, 0),
        items,
      };
    });
}

export default async function PortalPagosPage(): Promise<JSX.Element | null> {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: paciente } = await supabase
    .from('pacientes')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle<PacienteRow>();

  const [
    { data: bonosRaw },
    { data: pagosRaw },
    { data: configRaw },
    { data: serviciosRaw },
  ] = await Promise.all([
    paciente
      ? supabase
          .from('bonos_pacientes')
          .select(
            'id, servicio_id, sesiones_totales, sesiones_consumidas, estado, fecha_compra, fecha_expiracion, activo'
          )
          .eq('paciente_id', paciente.id)
          .order('fecha_compra', { ascending: false })
      : Promise.resolve({ data: [] as BonoPacienteRow[] }),
    paciente
      ? supabase
          .from('pagos')
          .select(
            'id, importe_centimos, moneda, estado, metodo, fecha_pago, descripcion'
          )
          .eq('paciente_id', paciente.id)
          .order('fecha_pago', { ascending: false })
          .limit(50)
      : Promise.resolve({ data: [] as PagoRow[] }),
    supabase
      .from('bonos_config')
      .select(
        'id, nombre, descripcion, servicio_id, sesiones, precio_centimos, validez_dias, destacado, orden'
      )
      .eq('activo', true)
      .order('orden', { ascending: true }),
    supabase
      .from('servicios')
      .select('id, nombre, precio_centimos, activo')
      .eq('activo', true),
  ]);

  const bonos = (bonosRaw as BonoPacienteRow[] | null) ?? [];
  const pagos = (pagosRaw as PagoRow[] | null) ?? [];
  const bonosConfig = (configRaw as BonoConfigItem[] | null) ?? [];
  const servicios = (serviciosRaw as ServicioRef[] | null) ?? [];

  const servicioNombre = (id: string): string =>
    servicios.find((s) => s.id === id)?.nombre ?? 'Servicio';

  const servicioIndividual = servicios.find((s) => s.nombre === 'Sesión individual');
  const servicioPareja = servicios.find((s) => s.nombre === 'Terapia de pareja');
  const servicioIndividualPareja = servicios.find(
    (s) => s.nombre === 'Sesión individual pareja'
  );

  const bonosConfigTyped = bonosConfig as (BonoConfigItem & { readonly servicio_id?: string })[];
  const bonosCatalogoIndividual = bonosConfigTyped.filter((b) => {
    if (servicioIndividual && b.servicio_id) {
      return b.servicio_id === servicioIndividual.id;
    }
    return /Individual/i.test(b.nombre);
  });
  const bonosCatalogoPareja = bonosConfigTyped.filter((b) => {
    if (servicioPareja && b.servicio_id) {
      return b.servicio_id === servicioPareja.id;
    }
    return /Pareja/i.test(b.nombre) && !/Individual/i.test(b.nombre);
  });

  const bonosConSaldo = bonos.filter(
    (b) =>
      b.activo &&
      b.estado === 'activo' &&
      b.sesiones_consumidas < b.sesiones_totales
  );
  const sesionesDisponibles = bonosConSaldo.reduce(
    (sum, b) => sum + (b.sesiones_totales - b.sesiones_consumidas),
    0
  );
  const bonoActivo = bonosConSaldo[0];

  const totalGastado = pagos
    .filter((p) => p.estado === 'completado')
    .reduce((acc, p) => acc + p.importe_centimos, 0);

  const pagosPorMes = agruparPorMes(pagos);

  return (
    <>
      {paciente ? (
        <RealtimeRefresh
          channelName={`portal-pagos-${paciente.id}`}
          tables={['pagos', 'bonos_pacientes']}
          filter={`paciente_id=eq.${paciente.id}`}
        />
      ) : null}
      <PageHeader
        eyebrow="Bonos y pagos"
        title="Tu cuenta"
        description="Compra sesiones, consulta tus bonos activos y descarga tus facturas."
      />

      <section className="mb-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Sesiones disponibles"
          value={sesionesDisponibles}
          icon="account_balance_wallet"
          footnote={
            bonosConSaldo.length > 0
              ? `${bonosConSaldo.length} bono(s) con saldo · ${sesionesDisponibles} sesión(es) en total${
                  bonoActivo
                    ? ` (principal: ${servicioNombre(bonoActivo.servicio_id)})`
                    : ''
                }`
              : 'Sin bono activo'
          }
        />
        <StatCard label="Total invertido" value={euro(totalGastado)} icon="euro" />
        <StatCard
          label="Pagos completados"
          value={pagos.filter((p) => p.estado === 'completado').length}
          icon="receipt_long"
        />
      </section>

      <SectionDivider label="Precio de una sesión suelta" />
      <p className="mb-5 font-body text-[0.82rem] leading-relaxed text-ink-soft text-pretty dark:text-white/65">
        Tarifas vigentes: <strong className="text-ink dark:text-white">{CLINIC_TARIFAS_SESION_RESUMEN}</strong>.
        El importe cobrado coincide con el servicio que elijas al reservar o comprar el bono.
      </p>
      {servicioIndividual || servicioPareja || servicioIndividualPareja ? (
        <div className="mb-8 grid items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {servicioIndividual ? (
            <SesionSueltaInfoCard
              titulo="Sesión individual"
              descripcion={`Una sesión de terapia individual. Al reservar eliges franja; el pago se realiza con la cita (${CLINIC_STRIPE_PAYMENT_ORDER_LABEL_ES}, según Stripe).`}
              precioCentimos={servicioIndividual.precio_centimos}
              servicioId={servicioIndividual.id}
            />
          ) : null}
          {servicioIndividualPareja ? (
            <SesionSueltaInfoCard
              titulo="Sesión individual pareja"
              descripcion="Sesión más breve para dos personas cuando conviene otro ritmo que la sesión larga de pareja. Reserva y pago con la cita."
              precioCentimos={servicioIndividualPareja.precio_centimos}
              servicioId={servicioIndividualPareja.id}
            />
          ) : null}
          {servicioPareja ? (
            <SesionSueltaInfoCard
              titulo="Terapia de pareja"
              descripcion="Sesión para dos personas. Reserva y pago vinculados a la cita, con los mismos métodos de pago seguros."
              precioCentimos={servicioPareja.precio_centimos}
              servicioId={servicioPareja.id}
            />
          ) : null}
        </div>
      ) : null}

      <SectionDivider label="Bonos (varias sesiones)" />
      {bonosConfig.length === 0 ? (
        <EmptyState
          icon="card_membership"
          title="Catálogo no disponible"
          description="Contacta con la consulta si necesitas reservar o comprar un bono."
        />
      ) : (
        <>
          <p className="mb-5 font-body text-[0.85rem] text-ink-soft dark:text-white/60">
            Pago con Stripe: {CLINIC_STRIPE_PAYMENT_ORDER_LABEL_ES}. Los bonos aplican a la
            modalidad indicada (individual o pareja).
          </p>
          {bonosCatalogoIndividual.length > 0 ? (
            <>
              <h3 className="mb-3 font-display text-[1.05rem] italic text-ink dark:text-white">
                Psicoterapia individual
              </h3>
              <div className="mb-8 grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {bonosCatalogoIndividual.map((bono) => (
                  <BonoCompraCard key={bono.id} bono={bono} />
                ))}
              </div>
            </>
          ) : null}
          {bonosCatalogoPareja.length > 0 ? (
            <>
              <h3 className="mb-3 font-display text-[1.05rem] italic text-ink dark:text-white">
                Terapia de pareja
              </h3>
              <div className="mb-10 grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {bonosCatalogoPareja.map((bono) => (
                  <BonoCompraCard key={bono.id} bono={bono} />
                ))}
              </div>
            </>
          ) : null}
        </>
      )}

      <SectionDivider label="Tus bonos activos" />

      {bonos.length === 0 ? (
        <EmptyState
          icon="confirmation_number"
          title="Todavía no tienes bonos"
          description="Cuando compres uno aparecerá aquí con su progreso."
        />
      ) : (
        <div className="mb-10 grid gap-4 sm:grid-cols-2">
          {bonos.map((b) => {
            const restantes = b.sesiones_totales - b.sesiones_consumidas;
            // Barra = sesiones disponibles (coherente con "X restantes de Y").
            const pct = Math.min(
              100,
              Math.round((restantes / b.sesiones_totales) * 100)
            );
            const activo = b.activo && b.estado === 'activo' && restantes > 0;
            const expiraProximo =
              b.fecha_expiracion && activo
                ? new Date(b.fecha_expiracion).getTime() - Date.now() <
                  1000 * 60 * 60 * 24 * 14
                : false;

            return (
              <SurfaceCard key={b.id}>
                <header className="mb-4 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <Chip tone={activo ? 'positive' : 'neutral'}>
                      {activo ? 'Activo' : b.estado}
                    </Chip>
                    <h3 className="mt-3 font-display text-[1.25rem] italic text-ink dark:text-white">
                      Bono · {b.sesiones_totales} sesiones
                    </h3>
                    <p className="mt-1 font-body text-[0.78rem] text-ink-muted dark:text-white/55">
                      {servicioNombre(b.servicio_id)}
                    </p>
                  </div>
                  {expiraProximo && b.fecha_expiracion ? (
                    <Chip tone="warning">
                      Vence{' '}
                      {formatDistanceToNow(new Date(b.fecha_expiracion), {
                        locale: es,
                        addSuffix: true,
                      })}
                    </Chip>
                  ) : null}
                </header>

                <div className="mb-2 flex items-baseline justify-between">
                  <span className="font-body text-[0.82rem] text-ink-soft dark:text-white/65">
                    {restantes} restantes de {b.sesiones_totales}
                  </span>
                  <span className="font-body text-[0.75rem] text-ink-muted tabular-nums dark:text-white/55">
                    {pct}%
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink/5 dark:bg-white/10">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${pct}%` }}
                    aria-hidden="true"
                  />
                </div>

                <footer className="mt-4 flex flex-wrap items-center justify-between gap-2 font-body text-[0.7rem] text-ink-muted dark:text-white/55">
                  <span>
                    Comprado el{' '}
                    {format(new Date(b.fecha_compra), "d MMM yyyy", {
                      locale: es,
                    })}
                  </span>
                  {b.fecha_expiracion ? (
                    <span>
                      Vence{' '}
                      {format(new Date(b.fecha_expiracion), "d MMM yyyy", {
                        locale: es,
                      })}
                    </span>
                  ) : null}
                </footer>

                <div className="mt-4">
                  <Link
                    href="/portal/citas/reservar"
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5 font-body text-[0.78rem] text-ink ring-1 ring-inset ring-ink/10 transition hover:bg-white dark:bg-white/10 dark:text-white dark:ring-white/15 dark:hover:bg-white/15"
                  >
                    <span
                      className="material-symbols-outlined text-[1rem]"
                      aria-hidden="true"
                    >
                      event_available
                    </span>
                    Usar sesión
                  </Link>
                </div>
              </SurfaceCard>
            );
          })}
        </div>
      )}

      <SectionDivider label="Historial de pagos" />

      {pagos.length === 0 ? (
        <EmptyState
          icon="receipt"
          title="Sin pagos registrados"
          description="Aquí aparecerán todas tus compras y facturas cuando realices un pago."
        />
      ) : (
        <div className="space-y-6">
          {pagosPorMes.map((grupo) => (
            <SurfaceCard key={grupo.key} className="p-0 overflow-hidden">
              <header className="flex items-center justify-between gap-3 border-b border-ink/5 px-5 py-3 dark:border-white/5">
                <h3 className="font-display text-[0.95rem] italic text-ink first-letter:uppercase dark:text-white">
                  {grupo.label}
                </h3>
                <span className="font-body text-[0.75rem] text-ink-muted tabular-nums dark:text-white/55">
                  {euro(grupo.total)} · {grupo.items.length} pagos
                </span>
              </header>
              <ul className="divide-y divide-ink/5 dark:divide-white/5">
                {grupo.items.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span
                        className="grid h-10 w-10 shrink-0 place-items-center self-center rounded-xl bg-primary/10 ring-1 ring-inset ring-primary/15 dark:bg-primary/25 dark:ring-primary/30"
                        aria-hidden="true"
                      >
                        <span className="material-symbols-outlined text-[1.15rem] text-primary">
                          {metodoIcon(p.metodo)}
                        </span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-body text-[0.92rem] text-ink tabular-nums dark:text-white">
                          {euro(p.importe_centimos)}
                        </p>
                        <p className="mt-0.5 line-clamp-2 font-body text-[0.72rem] text-ink-muted dark:text-white/55">
                          {format(new Date(p.fecha_pago), "d MMM · HH:mm", {
                            locale: es,
                          })}
                          {p.metodo ? ` · ${p.metodo}` : ''}
                          {p.descripcion ? ` · ${p.descripcion}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:justify-end">
                      <Chip tone={chipToneFromEstado(p.estado)}>
                        {estadoLabel(p.estado)}
                      </Chip>
                      {p.estado === 'completado' ? (
                        <a
                          href={`/api/portal/factura/${p.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-2 font-body text-[0.74rem] text-ink ring-1 ring-inset ring-ink/10 transition hover:bg-white dark:bg-white/10 dark:text-white dark:ring-white/15 dark:hover:bg-white/15"
                          title="Descargar factura PDF"
                        >
                          <span
                            className="material-symbols-outlined text-[0.95rem]"
                            aria-hidden="true"
                          >
                            download
                          </span>
                          Factura
                        </a>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </SurfaceCard>
          ))}
        </div>
      )}
    </>
  );
}
