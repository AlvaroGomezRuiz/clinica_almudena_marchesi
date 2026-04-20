import { cookies } from 'next/headers';
import Link from 'next/link';

import AdminNotaAdministrativaSticker from '@/components/admin/AdminNotaAdministrativaSticker';

type FacturaItem = {
  id: string;
  paciente_id: string;
  paciente_nombre: string;
  cita_id?: string | null;
  bono_id?: string | null;
  referencia_redsys?: string | null;
  stripe_event_id?: string | null;
  importe_centimos: number;
  estado_transaccion: string;
  fecha_pago: string;
  activo: boolean;
};

type FacturasResponse = {
  total: number;
  skip: number;
  limit: number;
  items: FacturaItem[];
};

type FacturacionDetalleResponse = {
  from_date?: string | null;
  to_date?: string | null;
  sesiones_total: number;
  clientes_total: number;
  pagos_total: number;
  importe_total_centimos: number;
  iva_percent?: number | null;
  iva_total_centimos?: number | null;
};

type FacturacionNotaAdministrativaResponse = {
  nota: string;
  updated_at?: string | null;
};

type AdminBonoAlertaItem = {
  bono_id: string;
  paciente_id: string;
  paciente_nombre: string;
  servicio_id: string;
  servicio_nombre: string;
  sesiones_totales: number;
  sesiones_consumidas: number;
  sesiones_restantes: number;
  estado: string;
};

type AdminStatsResponse = {
  week_start: string;
  week_end: string;
  citas_semana_total: number;
  pacientes_activos_total: number;
  pacientes_nuevos_semana: number;
  ingresos_semana_centimos: number;
  agenda_hoy: unknown[];
  alertas_bonos: AdminBonoAlertaItem[];
};

function getBackendApiUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BACKEND_API_URL ?? 'http://localhost:8000/api/v1'
  );
}

function toIsoDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function daysInMonth(d: Date): number {
  return endOfMonth(d).getDate();
}

async function fetchJson<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Fetch failed (${res.status})`);
  }

  return (await res.json()) as T;
}

function eurosFromCentimos(centimos: number): string {
  const value = Number.isFinite(centimos) ? centimos / 100 : 0;
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(value);
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function initialsFromName(name: string): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '—';
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

function normalizeEstado(estado: string): string {
  const raw = (estado || '').trim();
  if (!raw) return '—';

  const low = raw.toLowerCase();
  if (low.includes('complet') || low.includes('pag')) return 'PAGADO';
  if (low.includes('pend')) return 'PENDIENTE';
  if (low.includes('fall') || low.includes('error')) return 'FALLIDO';
  return raw.toUpperCase();
}

function isEstadoPagado(estado: string): boolean {
  const low = (estado || '').toLowerCase();
  return low.includes('complet') || low.includes('pag');
}

function getEstadoBadgeClass(estado: string): string {
  const low = (estado || '').toLowerCase();
  if (low.includes('complet') || low.includes('pag')) {
    return 'px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider rounded-full border border-emerald-100/50';
  }
  if (low.includes('pend')) {
    return 'px-3 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold uppercase tracking-wider rounded-full border border-amber-100/50';
  }
  if (low.includes('fall') || low.includes('error')) {
    return 'px-3 py-1 bg-error/10 text-error text-[10px] font-bold uppercase tracking-wider rounded-full border border-error/20';
  }
  return 'px-3 py-1 bg-surface-container text-on-surface-variant text-[10px] font-bold uppercase tracking-wider rounded-full border border-outline-variant/20';
}

function getMetodoPago(item: FacturaItem): { label: string; icon: string } {
  if (item?.stripe_event_id) return { label: 'Stripe', icon: 'credit_card' };
  if (item?.referencia_redsys) return { label: 'Redsys', icon: 'payments' };
  return { label: '—', icon: 'payments' };
}

export default async function AdminFacturacionPage({
  searchParams,
}: {
  searchParams?: { detalle?: string };
}) {
  const token = cookies().get('auth_token')?.value;
  const backendApiUrl = getBackendApiUrl();
  const now = new Date();

  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  let stats: AdminStatsResponse | null = null;
  let facturasRecientes: FacturasResponse | null = null;
  let facturasMes: FacturasResponse | null = null;
  let detalleMes: FacturacionDetalleResponse | null = null;
  let notaAdministrativa: FacturacionNotaAdministrativaResponse | null = null;

  let statsError = false;
  let facturasError = false;
  let facturasMesError = false;
  let detalleMesError = false;
  let notaAdministrativaError = false;

  if (token) {
    const statsUrl = new URL(`${backendApiUrl}/admin/stats`);
    statsUrl.searchParams.set('reference_date', toIsoDateString(now));

    const recientesUrl = new URL(`${backendApiUrl}/facturas`);
    recientesUrl.searchParams.set('skip', '0');
    recientesUrl.searchParams.set('limit', '20');

    const mesUrl = new URL(`${backendApiUrl}/facturas`);
    mesUrl.searchParams.set('skip', '0');
    mesUrl.searchParams.set('limit', '200');
    mesUrl.searchParams.set('from_date', toIsoDateString(monthStart));
    mesUrl.searchParams.set('to_date', toIsoDateString(monthEnd));

    const detalleUrl = new URL(`${backendApiUrl}/facturas/detalle`);
    detalleUrl.searchParams.set('from_date', toIsoDateString(monthStart));
    detalleUrl.searchParams.set('to_date', toIsoDateString(monthEnd));

    const notaUrl = new URL(`${backendApiUrl}/facturas/nota-administrativa`);

    const [statsRes, recientesRes, mesRes, detalleRes, notaRes] =
      await Promise.allSettled([
        fetchJson<AdminStatsResponse>(statsUrl.toString(), token),
        fetchJson<FacturasResponse>(recientesUrl.toString(), token),
        fetchJson<FacturasResponse>(mesUrl.toString(), token),
        fetchJson<FacturacionDetalleResponse>(detalleUrl.toString(), token),
        fetchJson<FacturacionNotaAdministrativaResponse>(
          notaUrl.toString(),
          token
        ),
      ]);

    if (statsRes.status === 'fulfilled') {
      stats = statsRes.value ?? null;
    } else {
      statsError = true;
    }

    if (recientesRes.status === 'fulfilled') {
      facturasRecientes = recientesRes.value ?? null;
    } else {
      facturasError = true;
    }

    if (mesRes.status === 'fulfilled') {
      facturasMes = mesRes.value ?? null;
    } else {
      facturasMesError = true;
    }

    if (detalleRes.status === 'fulfilled') {
      detalleMes = detalleRes.value ?? null;
    } else {
      detalleMesError = true;
    }

    if (notaRes.status === 'fulfilled') {
      notaAdministrativa = notaRes.value ?? null;
    } else {
      notaAdministrativaError = true;
    }
  } else {
    statsError = true;
    facturasError = true;
    facturasMesError = true;
    detalleMesError = true;
    notaAdministrativaError = true;
  }

  const alertasBonos =
    !statsError && stats && Array.isArray(stats.alertas_bonos)
      ? stats.alertas_bonos
      : [];

  const bonosAlertasCount = statsError ? null : alertasBonos.length;
  const bonosSesionesRestantes = statsError
    ? null
    : alertasBonos.reduce(
        (acc, b) => acc + (Number(b.sesiones_restantes) || 0),
        0
      );

  const facturasMesItems =
    !facturasMesError && facturasMes && Array.isArray(facturasMes.items)
      ? facturasMes.items
      : [];

  const canSumMes =
    !facturasMesError &&
    facturasMes &&
    typeof facturasMes.total === 'number' &&
    facturasMes.total <= facturasMesItems.length;

  const totalMesCentimos = canSumMes
    ? facturasMesItems.reduce((acc, f) => {
        if (!isEstadoPagado(f.estado_transaccion)) return acc;
        return acc + (Number(f.importe_centimos) || 0);
      }, 0)
    : null;

  const cierreLabel = monthEnd.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
  });

  const monthPct = Math.round((now.getDate() / daysInMonth(now)) * 100);

  const facturasItems =
    !facturasError &&
    facturasRecientes &&
    Array.isArray(facturasRecientes.items)
      ? facturasRecientes.items
      : [];

  const modalDetalleAbierto = searchParams?.detalle === '1';
  const detalle = !detalleMesError && detalleMes ? detalleMes : null;
  const totalMesCentimosReal =
    detalle && Number.isFinite(detalle.importe_total_centimos)
      ? detalle.importe_total_centimos
      : totalMesCentimos;
  const ivaLabel = detalle
    ? detalle.iva_total_centimos != null
      ? detalle.iva_percent != null
        ? `${eurosFromCentimos(detalle.iva_total_centimos)} (${detalle.iva_percent}%)`
        : eurosFromCentimos(detalle.iva_total_centimos)
      : '—'
    : '—';

  const notaInicial =
    !notaAdministrativaError && notaAdministrativa
      ? notaAdministrativa.nota || ''
      : '';

  return (
    <div className="max-w-7xl mx-auto space-y-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-serif italic text-emerald-900">
            Facturación Administrativa
          </h2>
          <p className="text-sm text-stone-500 mt-2">
            Vista operativa de transacciones y cierres.
          </p>
        </div>
      </header>

      {/* Summary Stats (Tonal Layering Cards) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-primary-container p-8 rounded-xl tonal-card relative overflow-hidden flex flex-col justify-between h-48">
          <div className="z-10">
            <span className="text-[10px] uppercase tracking-widest text-on-primary-container/70 font-semibold">
              Total Devengado (Mes Actual)
            </span>
            <h3 className="text-4xl font-serif text-on-primary-container mt-2">
              {totalMesCentimosReal === null
                ? '—'
                : eurosFromCentimos(totalMesCentimosReal)}
            </h3>
          </div>
          <div className="flex items-end justify-between z-10">
            <span className="text-xs text-on-primary-container/80 flex items-center gap-1">
              <span
                className="material-symbols-outlined text-sm"
                data-icon="trending_up"
              >
                trending_up
              </span>
              {totalMesCentimosReal === null
                ? '—'
                : totalMesCentimosReal === 0
                  ? 'Sin ingresos este mes'
                  : '—'}
            </span>
            {facturasMesError ? (
              <button
                className="bg-on-primary-container text-surface px-4 py-2 rounded-full text-[10px] uppercase tracking-wider font-bold disabled:opacity-50"
                type="button"
                disabled
              >
                Ver Detalle
              </button>
            ) : (
              <Link
                className="bg-on-primary-container text-surface px-4 py-2 rounded-full text-[10px] uppercase tracking-wider font-bold hover:opacity-90 transition-opacity"
                href="/admin/facturacion?detalle=1"
              >
                Ver Detalle
              </Link>
            )}
          </div>
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-on-primary-container/5 rounded-full blur-3xl" />
        </div>

        <div className="bg-secondary-container p-8 rounded-xl tonal-card flex flex-col justify-between h-48">
          <div>
            <span className="text-[10px] uppercase tracking-widest text-on-secondary-container/70 font-semibold">
              Bonos Pendientes
            </span>
            <h3 className="text-4xl font-serif text-on-secondary-container mt-2">
              {bonosAlertasCount === null
                ? '—'
                : `${bonosAlertasCount} en alerta`}
            </h3>
          </div>
          <div className="flex items-end justify-between">
            <span className="text-xs text-on-secondary-container/80">
              {bonosSesionesRestantes === null
                ? '—'
                : `${bonosSesionesRestantes} sesiones por realizar`}
            </span>
            <span
              className="material-symbols-outlined text-on-secondary-container/30 text-4xl"
              data-icon="confirmation_number"
            >
              confirmation_number
            </span>
          </div>
        </div>

        <div className="bg-surface-container-high p-8 rounded-xl tonal-card flex flex-col justify-between h-48 border-b-2 border-primary-fixed-dim">
          <div>
            <span className="text-[10px] uppercase tracking-widest text-stone-500 font-semibold">
              Siguiente Cierre
            </span>
            <h3 className="text-4xl font-serif text-on-surface mt-2">
              {cierreLabel}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-full bg-stone-300 h-1 rounded-full overflow-hidden">
              <div
                className="bg-primary h-full"
                style={{ width: `${monthPct}%` }}
              />
            </div>
            <span className="text-[10px] font-bold text-primary">
              {monthPct}%
            </span>
          </div>
        </div>
      </section>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Column */}
        <div className="lg:col-span-8 space-y-8">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h4 className="text-2xl font-serif text-emerald-900">
                Gestión de Bonos
              </h4>
              <p className="text-sm text-stone-500 mt-1">
                Bonos en estado de alerta (sesiones restantes bajas).
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {statsError ? (
              <div className="bg-surface-container-lowest p-6 rounded-xl editorial-shadow border border-stone-200/20">
                <p className="text-sm text-stone-500">—</p>
              </div>
            ) : alertasBonos.length ? (
              alertasBonos.map((bono) => {
                const isUrgent = (bono.sesiones_restantes ?? 0) <= 1;
                const borderClass = isUrgent
                  ? 'border-secondary-dim'
                  : 'border-emerald-800';

                const restantesClass = isUrgent
                  ? 'block text-2xl font-serif text-error'
                  : 'block text-2xl font-serif text-emerald-900';

                return (
                  <div
                    key={bono.bono_id}
                    className={`bg-surface-container-lowest p-6 rounded-xl tonal-card border-l-4 ${borderClass} flex items-center justify-between group hover:bg-white transition-colors duration-300`}
                  >
                    <div className="flex items-center gap-6">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-stone-100 border border-stone-200 flex items-center justify-center font-bold text-[10px] text-primary">
                        {initialsFromName(bono.paciente_nombre)}
                      </div>
                      <div>
                        <h5 className="font-bold text-emerald-950">
                          {bono.paciente_nombre || '—'}
                        </h5>
                        <p className="text-xs text-stone-400">
                          {bono.servicio_nombre
                            ? `${bono.servicio_nombre} (${bono.sesiones_totales} ses.)`
                            : '—'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-12">
                      <div className="text-center">
                        <span className={restantesClass}>
                          {bono.sesiones_restantes}/{bono.sesiones_totales}
                        </span>
                        <span className="text-[10px] uppercase text-stone-400 tracking-widest">
                          Restantes
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="w-10 h-10 rounded-full border border-stone-200 flex items-center justify-center text-stone-400 hover:text-emerald-800 hover:border-emerald-200 hover:bg-emerald-50 transition-all"
                          type="button"
                          disabled
                          aria-disabled="true"
                        >
                          <span
                            className="material-symbols-outlined text-lg"
                            data-icon="history"
                          >
                            history
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bg-surface-container-lowest p-6 rounded-xl editorial-shadow border border-stone-200/20">
                <p className="text-sm text-stone-500">No hay bonos.</p>
              </div>
            )}
          </div>

          {/* Transacciones */}
          <div className="pt-8 space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-2xl font-serif text-emerald-900">
                Transacciones Recientes
              </h4>
              <div className="flex gap-2">
                <button
                  className="p-2 hover:bg-stone-200/50 rounded-lg text-stone-400 hover:text-emerald-800 transition-colors"
                  type="button"
                  disabled
                  aria-disabled="true"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    filter_list
                  </span>
                </button>
                <button
                  className="p-2 hover:bg-stone-200/50 rounded-lg text-stone-400 hover:text-emerald-800 transition-colors"
                  type="button"
                  disabled
                  aria-disabled="true"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    search
                  </span>
                </button>
              </div>
            </div>

            <div className="bg-surface-container-lowest rounded-xl editorial-shadow border border-stone-200/20 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-[0.15em] text-stone-400 border-b border-stone-100">
                      <th className="px-8 py-5 font-bold">PACIENTE</th>
                      <th className="px-6 py-5 font-bold">FECHA</th>
                      <th className="px-6 py-5 font-bold">MÉTODO</th>
                      <th className="px-6 py-5 font-bold">ESTADO</th>
                      <th className="px-8 py-5 font-bold text-right">
                        IMPORTE
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-50">
                    {facturasError ? (
                      <tr>
                        <td
                          className="px-8 py-6 text-sm text-stone-500"
                          colSpan={5}
                        >
                          —
                        </td>
                      </tr>
                    ) : facturasItems.length ? (
                      facturasItems.map((item) => {
                        const metodo = getMetodoPago(item);
                        const estadoLabel = normalizeEstado(
                          item.estado_transaccion
                        );
                        const estadoClass = getEstadoBadgeClass(
                          item.estado_transaccion
                        );

                        return (
                          <tr
                            key={item.id}
                            className="hover:bg-surface-container-low transition-colors group"
                          >
                            <td className="px-8 py-5">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-[10px]">
                                  {initialsFromName(item.paciente_nombre)}
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-emerald-950">
                                    {item.paciente_nombre || '—'}
                                  </p>
                                  <p className="text-[10px] text-stone-400">
                                    —
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5 text-xs text-stone-600">
                              {formatShortDate(item.fecha_pago)}
                            </td>
                            <td className="px-6 py-5">
                              <span className="flex items-center gap-1 text-[11px] text-stone-500">
                                <span className="material-symbols-outlined text-sm">
                                  {metodo.icon}
                                </span>
                                {metodo.label}
                              </span>
                            </td>
                            <td className="px-6 py-5">
                              <span className={estadoClass}>{estadoLabel}</span>
                            </td>
                            <td className="px-8 py-5 text-right font-serif text-emerald-900 font-bold">
                              {eurosFromCentimos(item.importe_centimos)}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          className="px-8 py-6 text-sm text-stone-500"
                          colSpan={5}
                        >
                          No hay transacciones.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="p-4 bg-stone-50/50 border-t border-stone-100 flex justify-center">
                <button
                  className="text-[10px] font-bold uppercase tracking-widest text-primary hover:tracking-[0.25em] transition-all duration-300 disabled:opacity-50"
                  type="button"
                  disabled
                  aria-disabled="true"
                >
                  VER HISTÓRICO COMPLETO
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-surface-container-lowest p-8 rounded-2xl tonal-card border border-stone-200/20 relative">
            <div className="absolute -top-3 left-8 bg-tertiary text-white px-3 py-1 rounded-md text-[10px] uppercase font-bold tracking-widest">
              Reporte Rápido
            </div>
            <h4 className="text-xl font-serif text-emerald-950 mb-6">
              Cierre {now.toLocaleDateString('es-ES', { month: 'long' })}
            </h4>
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-stone-100">
                <span className="text-sm text-stone-500">
                  Sesiones (Semana)
                </span>
                <span className="font-mono font-bold">
                  {statsError || !stats ? '—' : stats.citas_semana_total}
                </span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-stone-100">
                <span className="text-sm text-stone-500">
                  Ingresos (Semana)
                </span>
                <span className="font-mono font-bold">
                  {statsError || !stats
                    ? '—'
                    : eurosFromCentimos(stats.ingresos_semana_centimos)}
                </span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-stone-100">
                <span className="text-sm text-stone-500">
                  Impuestos (Estim.)
                </span>
                <span className="font-mono font-bold text-error">—</span>
              </div>
              <div className="pt-2">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-stone-400">
                    Total Neto
                  </span>
                  <span className="text-2xl font-serif text-emerald-900">
                    {totalMesCentimosReal === null
                      ? '—'
                      : eurosFromCentimos(totalMesCentimosReal)}
                  </span>
                </div>
                <button
                  className="w-full bg-emerald-900 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-emerald-800 transition-colors shadow-xl shadow-emerald-900/20 mt-4 disabled:opacity-50"
                  type="button"
                  disabled
                  aria-disabled="true"
                >
                  <span
                    className="material-symbols-outlined"
                    data-icon="file_download"
                  >
                    file_download
                  </span>
                  Descargar Factura Mes
                </button>
              </div>
            </div>
          </div>

          <AdminNotaAdministrativaSticker
            initialNota={notaInicial}
            disabled={notaAdministrativaError}
          />
        </div>
      </div>

      {modalDetalleAbierto ? (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <Link
            className="absolute inset-0 bg-black/20"
            href="/admin/facturacion"
            aria-label="Cerrar"
          />
          <div className="relative w-full md:max-w-3xl bg-surface-container-lowest rounded-t-3xl md:rounded-3xl p-6 md:p-8 editorial-shadow">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <p className="font-label text-[10px] tracking-widest uppercase text-outline mb-2">
                  Detalle del mes
                </p>
                <h3 className="font-headline text-2xl text-primary">
                  {now.toLocaleDateString('es-ES', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </h3>
              </div>
              <Link
                className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center hover:bg-surface-container-high transition-colors"
                href="/admin/facturacion"
                aria-label="Cerrar"
              >
                <span className="material-symbols-outlined" data-icon="close">
                  close
                </span>
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-surface-container p-4 rounded-2xl ring-1 ring-outline-variant/10">
                <p className="text-[10px] font-bold uppercase tracking-wider text-outline">
                  Sesiones
                </p>
                <p className="mt-2 font-headline text-xl text-on-surface">
                  {detalle ? detalle.sesiones_total : '—'}
                </p>
              </div>
              <div className="bg-surface-container p-4 rounded-2xl ring-1 ring-outline-variant/10">
                <p className="text-[10px] font-bold uppercase tracking-wider text-outline">
                  Clientes
                </p>
                <p className="mt-2 font-headline text-xl text-on-surface">
                  {detalle ? detalle.clientes_total : '—'}
                </p>
              </div>
              <div className="bg-surface-container p-4 rounded-2xl ring-1 ring-outline-variant/10">
                <p className="text-[10px] font-bold uppercase tracking-wider text-outline">
                  Pagos
                </p>
                <p className="mt-2 font-headline text-xl text-on-surface">
                  {detalle ? detalle.pagos_total : '—'}
                </p>
              </div>
              <div className="bg-surface-container p-4 rounded-2xl ring-1 ring-outline-variant/10">
                <p className="text-[10px] font-bold uppercase tracking-wider text-outline">
                  IVA
                </p>
                <p className="mt-2 font-headline text-xl text-on-surface">
                  {ivaLabel}
                </p>
              </div>
            </div>

            <div className="mt-6 bg-surface-container-low p-5 rounded-2xl ring-1 ring-outline-variant/10 flex items-center justify-between gap-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-outline">
                Total (Pagado)
              </p>
              <p className="font-headline text-2xl text-primary">
                {detalle
                  ? eurosFromCentimos(detalle.importe_total_centimos)
                  : '—'}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
