/* eslint-disable @next/next/no-img-element */

import { cookies } from 'next/headers';

import { logoutAction } from '@/services/auth/actions';

type AdminAgendaItem = {
  cita_id: string;
  inicio_iso: string;
  fin_iso: string;
  estado: string;
  paciente_id: string;
  paciente_nombre: string;
  servicio_id: string;
  servicio_nombre: string;
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
  agenda_hoy: AdminAgendaItem[];
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

function getUsernameFromJwt(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
    const payload = JSON.parse(payloadJson);
    return typeof payload?.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

async function getAdminStats(
  token: string,
  referenceDate?: string
): Promise<AdminStatsResponse> {
  const backendApiUrl = getBackendApiUrl();
  const url = new URL(`${backendApiUrl}/admin/stats`);
  if (referenceDate) url.searchParams.set('reference_date', referenceDate);

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`admin/stats failed (${res.status})`);
  }

  return (await res.json()) as AdminStatsResponse;
}

function formatEuroFromCentimos(valueCentimos: number): string {
  const euros = (valueCentimos ?? 0) / 100;
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(euros);
}

function formatTimeRange(inicioIso: string, finIso: string): string {
  const inicio = new Date(inicioIso);
  const fin = new Date(finIso);
  const inicioStr = inicio.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const finStr = fin.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${inicioStr} - ${finStr}`;
}

function formatPctChange(current: number, previous: number): string | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  if (previous === 0) return null;
  const pct = ((current - previous) / previous) * 100;
  const sign = pct > 0 ? '+' : '';
  return `${sign}${Math.round(pct)}%`;
}

export default async function PortalAlmudenaInicioPage() {
  const token = cookies().get('auth_token')?.value;
  const username = token ? getUsernameFromJwt(token) : null;
  const displayName = username ? username.split('@')[0] : null;

  const now = new Date();
  const saludo =
    now.getHours() < 12
      ? 'Buenos días'
      : now.getHours() < 20
        ? 'Buenas tardes'
        : 'Buenas noches';

  const weekdayRaw = now.toLocaleDateString('es-ES', { weekday: 'long' });
  const weekday = weekdayRaw
    ? weekdayRaw.charAt(0).toUpperCase() + weekdayRaw.slice(1)
    : '';
  const dateText = now.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
  });

  let stats: AdminStatsResponse | null = null;
  let prevStats: AdminStatsResponse | null = null;
  let loadError = false;

  if (token) {
    try {
      const ref = toIsoDateString(now);
      stats = await getAdminStats(token, ref);

      const prev = new Date(now);
      prev.setDate(prev.getDate() - 7);
      prevStats = await getAdminStats(token, toIsoDateString(prev));
    } catch {
      loadError = true;
    }
  } else {
    loadError = true;
  }

  const sesionesChange =
    stats && prevStats
      ? formatPctChange(stats.citas_semana_total, prevStats.citas_semana_total)
      : null;
  const sesionesTrendLabel = sesionesChange ?? '—';

  const pacientesTrendLabel =
    stats && prevStats
      ? stats.pacientes_nuevos_semana === prevStats.pacientes_nuevos_semana
        ? 'Estable'
        : (formatPctChange(
            stats.pacientes_nuevos_semana,
            prevStats.pacientes_nuevos_semana
          ) ?? '—')
      : '—';

  return (
    <>
      {/* Dashboard Header */}
      <header className="mb-12 max-w-6xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <span className="text-secondary font-medium tracking-widest text-xs uppercase mb-2 block">
            Panel de Control
          </span>
          <h2 className="text-4xl md:text-5xl font-serif text-on-background tracking-tight">
            {saludo}
            {displayName ? (
              <>
                , <span className="italic">{displayName}</span>.
              </>
            ) : (
              '.'
            )}
          </h2>
          <p className="text-on-surface-variant mt-2 max-w-md">
            {loadError
              ? 'No se pudo cargar el resumen de actividad desde la API.'
              : 'Bienvenida a tu espacio de gestión. Aquí tienes un resumen de la actividad clínica de hoy.'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/15">
            <p className="text-xs text-outline font-bold uppercase tracking-tighter">
              {weekday || '—'}
            </p>
            <p className="text-lg font-serif">{dateText || '—'}</p>
          </div>
        </div>
      </header>

      {/* Main Bento Grid */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: KPIs & Alerts */}
        <div className="lg:col-span-8 space-y-8">
          {/* Section: Resumen de la Semana */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-serif text-primary flex items-center gap-2">
                <span
                  className="material-symbols-outlined"
                  data-icon="analytics"
                >
                  analytics
                </span>
                Resumen de la Semana
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* KPI 1 */}
              <div className="bg-surface-container-lowest p-6 rounded-xl shadow-[0_20px_40px_rgba(75,100,95,0.04)] border-b-4 border-primary/10">
                <p className="text-xs text-outline uppercase tracking-widest font-semibold mb-4">
                  Sesiones Totales
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-serif text-on-surface">
                    {stats ? stats.citas_semana_total : '—'}
                  </span>
                  <span className="text-primary text-xs font-bold">
                    {stats ? sesionesTrendLabel : '—'}
                  </span>
                </div>
              </div>

              {/* KPI 2 */}
              <div className="bg-surface-container-lowest p-6 rounded-xl shadow-[0_20px_40px_rgba(75,100,95,0.04)] border-b-4 border-tertiary/10">
                <p className="text-xs text-outline uppercase tracking-widest font-semibold mb-4">
                  Nuevos Pacientes
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-serif text-on-surface">
                    {stats ? stats.pacientes_nuevos_semana : '—'}
                  </span>
                  <span className="text-tertiary text-xs font-bold">
                    {stats ? pacientesTrendLabel : '—'}
                  </span>
                </div>
              </div>

              {/* KPI 3 */}
              <div className="bg-surface-container-lowest p-6 rounded-xl shadow-[0_20px_40px_rgba(75,100,95,0.04)] border-b-4 border-secondary/10">
                <p className="text-xs text-outline uppercase tracking-widest font-semibold mb-4">
                  Ingresos (Est.)
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-serif text-on-surface">
                    {stats
                      ? formatEuroFromCentimos(stats.ingresos_semana_centimos)
                      : '—'}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Section: Alertas de Calma */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-serif text-primary flex items-center gap-2">
                <span
                  className="material-symbols-outlined"
                  data-icon="notifications_active"
                >
                  notifications_active
                </span>
                Alertas de Calma
              </h3>
            </div>
            <div className="bg-surface-container-low rounded-2xl overflow-hidden p-1">
              <div className="bg-surface-container-lowest rounded-xl p-2 space-y-1">
                {stats?.alertas_bonos?.length ? (
                  stats.alertas_bonos.map((alerta) => {
                    const isUrgent = alerta.sesiones_restantes <= 1;
                    const icon = isUrgent ? 'hourglass_empty' : 'hourglass_top';
                    const hoverBg = isUrgent
                      ? 'hover:bg-error-container/5'
                      : 'hover:bg-primary-container/5';
                    const iconWrap = isUrgent
                      ? 'bg-error-container/10 text-error'
                      : 'bg-secondary-container/30 text-secondary';
                    const pill = isUrgent
                      ? 'bg-error/10 text-error'
                      : 'bg-secondary-container text-on-secondary-container';
                    const statusText = isUrgent
                      ? 'Acción requerida'
                      : 'Pendiente';

                    return (
                      <div
                        key={alerta.bono_id}
                        className={`group flex items-center justify-between p-4 rounded-lg transition-colors ${hoverBg}`}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center ${iconWrap}`}
                          >
                            <span
                              className="material-symbols-outlined"
                              data-icon={icon}
                            >
                              {icon}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-bold text-on-surface">
                              {alerta.paciente_nombre || '—'}
                            </h4>
                            <p className="text-xs text-outline">
                              Bono de {alerta.sesiones_totales} sesiones •{' '}
                              {alerta.servicio_nombre || '—'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span
                            className={`inline-block px-3 py-1 text-xs font-bold rounded-full ${pill}`}
                          >
                            {alerta.sesiones_restantes} sesión
                            {alerta.sesiones_restantes === 1 ? '' : 'es'}{' '}
                            restante
                            {alerta.sesiones_restantes === 1 ? '' : 's'}
                          </span>
                          <p className="text-[10px] text-outline mt-1 uppercase tracking-tighter">
                            {statusText}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4">
                    <p className="text-xs text-outline">
                      Sin alertas por bonos.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Today's Timeline */}
        <div className="lg:col-span-4 h-full">
          <section className="sticky top-28">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-serif text-primary">Agenda de Hoy</h3>
              <span
                className="material-symbols-outlined text-outline"
                data-icon="event"
              >
                event
              </span>
            </div>

            <div className="relative space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-0 before:w-[2px] before:bg-surface-container-high">
              {stats?.agenda_hoy?.length ? (
                stats.agenda_hoy.map((cita) => {
                  const estado = String(cita.estado ?? '').toLowerCase();
                  const isOnline = estado.includes('online');
                  const isPrimary = !isOnline;
                  const dotWrap = isPrimary
                    ? 'bg-primary-container'
                    : 'bg-tertiary-container';
                  const dot = isPrimary ? 'bg-primary' : 'bg-tertiary';
                  const border = isPrimary
                    ? 'border-primary'
                    : 'border-tertiary';
                  const labelColor = isPrimary
                    ? 'text-primary'
                    : 'text-tertiary';
                  const pill = isPrimary
                    ? 'bg-primary/10 text-primary'
                    : 'bg-tertiary/10 text-tertiary';

                  return (
                    <div key={cita.cita_id} className="relative pl-10">
                      <div
                        className={`absolute left-0 top-1.5 w-6 h-6 rounded-full ${dotWrap} flex items-center justify-center ring-4 ring-surface`}
                      >
                        <div className={`w-2 h-2 rounded-full ${dot}`}></div>
                      </div>
                      <div
                        className={`bg-surface-container-low p-4 rounded-xl border-l-4 ${border}`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className={`text-xs font-bold ${labelColor}`}>
                            {formatTimeRange(cita.inicio_iso, cita.fin_iso)}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded ${pill}`}
                          >
                            {cita.estado || '—'}
                          </span>
                        </div>
                        <h4 className="font-serif text-on-surface text-lg">
                          {cita.paciente_nombre || '—'}
                        </h4>
                        <p className="text-xs text-outline mt-1 italic">
                          {cita.servicio_nombre || '—'}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="relative pl-10 opacity-60">
                  <div className="absolute left-[8px] top-1.5 w-[6px] h-[6px] rounded-full bg-outline-variant"></div>
                  <p className="text-xs font-medium text-outline">
                    Sin citas programadas hoy.
                  </p>
                </div>
              )}
            </div>

            {/* Side Action Card */}
            <div className="mt-12 bg-secondary/5 border border-secondary/10 rounded-2xl p-6 relative overflow-hidden">
              <div className="relative z-10">
                <h5 className="font-serif text-secondary text-lg mb-2">
                  Notas Rápidas
                </h5>
                <p className="text-xs text-on-secondary-fixed-variant leading-relaxed">
                  Sin notas rápidas.
                </p>
              </div>
              <span
                className="material-symbols-outlined absolute -bottom-4 -right-4 text-7xl text-secondary/10"
                data-icon="edit_note"
              >
                edit_note
              </span>
            </div>
          </section>
        </div>
      </div>

      {/* Footer / Identity Anchor */}
      <footer className="mt-20 max-w-6xl mx-auto pt-8 border-t border-outline-variant/15 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <img
            alt="Almudena Marchesi professional portrait"
            className="w-10 h-10 rounded-full object-cover grayscale opacity-80"
            data-alt="professional portrait of a confident middle-aged female psychologist in a serene minimalist office setting, warm lighting"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDZJvBPF1fUBjGzijD9VW7gZgZOm_1NaDOIC8gav8LMGCx9V1WXQWj6h4m0nRo0xnFNmqi_Q4Kl1wW8IgYkEDWu0xv_fqlxUYTpmIWUU22Dl6fI4qI8U1do7nc_29MaChipyNW3bc3WLR6V_T_tDw3OO8YkIPFXn9dqdiPEDYDOdF78oPh5CzA0-aA9_DSOp2OJw-8__Wf73XwQglCVvLuDXXJb_nlILW_o_h0glzUa-6vhEZlc2rZmAzK9LblA-iE1A402h-XmBi0"
          />
          <div>
            <p className="text-sm font-bold text-on-background">
              Almudena Marchesi Fernández
            </p>
            <p className="text-[10px] text-outline uppercase tracking-widest">
              Psicóloga General Sanitaria • Madrid
            </p>
          </div>
        </div>

        <div className="flex gap-8 text-[10px] uppercase tracking-widest font-bold text-outline">
          <a className="hover:text-primary transition-colors" href="#">
            Privacidad
          </a>
          <a className="hover:text-primary transition-colors" href="#">
            Portal de Paciente
          </a>
          <form action={logoutAction}>
            <button
              className="hover:text-primary transition-colors"
              type="submit"
            >
              Log Out
            </button>
          </form>
        </div>
      </footer>

      {/* FAB for focused tasks */}
      <button className="fixed bottom-8 right-8 w-14 h-14 bg-primary text-on-primary rounded-full shadow-[0_20px_40px_rgba(75,100,95,0.2)] flex items-center justify-center hover:scale-110 transition-all duration-400 z-50">
        <span className="material-symbols-outlined" data-icon="add">
          add
        </span>
      </button>
    </>
  );
}
