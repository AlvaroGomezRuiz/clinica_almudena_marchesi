import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

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

type AgendaBloqueoItem = {
  id: string;
  inicio_iso: string;
  fin_iso: string;
  motivo?: string | null;
};

type AdminWeekAgendaResponse = {
  week_start: string;
  week_end: string;
  citas: AdminAgendaItem[];
  bloqueos: AgendaBloqueoItem[];
};

type SearchParams = {
  reference_date?: string;
  ok?: string;
  err?: string;
};

function getBackendApiUrl(): string {
  return (
    process.env.BACKEND_API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:8000/api/v1'
  );
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

async function readBackendError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as unknown;
    if (
      data &&
      typeof data === 'object' &&
      'detail' in data &&
      typeof (data as { detail?: unknown }).detail === 'string'
    ) {
      return (data as { detail: string }).detail;
    }
  } catch {
    // ignore
  }

  return `Error (${res.status})`;
}

function capFirst(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function toIsoDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isValidIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parseIsoDateLocal(value: string): Date | null {
  if (!isValidIsoDate(value)) return null;
  const [y, m, d] = value.split('-').map((n) => Number(n));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function startOfWeekMonday(value: Date): Date {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  return d;
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
  return `${inicioStr} — ${finStr}`;
}

function formatWeekRangeLabel(weekStart: Date, weekEnd: Date): string {
  const startDay = weekStart.getDate();
  const endDay = weekEnd.getDate();
  const sameMonth =
    weekStart.getMonth() === weekEnd.getMonth() &&
    weekStart.getFullYear() === weekEnd.getFullYear();

  if (sameMonth) {
    const monthLabel = capFirst(
      weekStart.toLocaleDateString('es-ES', { month: 'long' })
    );
    return `${startDay} — ${endDay} ${monthLabel}, ${weekStart.getFullYear()}`;
  }

  const startMonthLabel = capFirst(
    weekStart.toLocaleDateString('es-ES', { month: 'long' })
  );
  const endMonthLabel = capFirst(
    weekEnd.toLocaleDateString('es-ES', { month: 'long' })
  );

  if (weekStart.getFullYear() === weekEnd.getFullYear()) {
    return `${startDay} ${startMonthLabel} — ${endDay} ${endMonthLabel}, ${weekStart.getFullYear()}`;
  }

  return `${startDay} ${startMonthLabel}, ${weekStart.getFullYear()} — ${endDay} ${endMonthLabel}, ${weekEnd.getFullYear()}`;
}

function buildAgendaHref(
  params: Record<string, string | null | undefined>
): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (typeof v === 'string' && v.trim() !== '') sp.set(k, v);
  });
  const qs = sp.toString();
  return qs ? `/admin/agenda?${qs}` : '/admin/agenda';
}

function renderFlash(ok: string | null, err: string | null) {
  return (
    <>
      {err ? (
        <div className="mb-6 bg-surface-container-lowest rounded-xl p-4 ring-1 ring-error/20">
          <p className="text-sm text-on-surface-variant">{err}</p>
        </div>
      ) : null}

      {ok ? (
        <div className="mb-6 bg-surface-container-lowest rounded-xl p-4 ring-1 ring-primary/15">
          <p className="text-sm text-on-surface-variant">
            {ok === 'cita'
              ? 'Cita cancelada.'
              : ok === 'bloqueo'
                ? 'Bloqueo desbloqueado.'
                : 'Actualizado.'}
          </p>
        </div>
      ) : null}
    </>
  );
}

async function cancelCitaAction(formData: FormData) {
  'use server';

  const token = cookies().get('auth_token')?.value;
  if (!token) redirect('/login');

  const citaId = String(formData.get('cita_id') || '');
  const referenceDate = String(formData.get('reference_date') || '');

  const referenceDateParam = isValidIsoDate(referenceDate)
    ? referenceDate
    : null;
  const baseHref = buildAgendaHref({ reference_date: referenceDateParam });

  if (!citaId) redirect(baseHref);

  const backendApiUrl = getBackendApiUrl();
  const res = await fetch(
    `${backendApiUrl}/citas/${encodeURIComponent(citaId)}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    }
  );

  if (!res.ok) {
    const detail = await readBackendError(res);
    redirect(
      buildAgendaHref({
        reference_date: referenceDateParam,
        err: detail,
      })
    );
  }

  redirect(
    buildAgendaHref({
      reference_date: referenceDateParam,
      ok: 'cita',
    })
  );
}

async function desbloquearBloqueoAction(formData: FormData) {
  'use server';

  const token = cookies().get('auth_token')?.value;
  if (!token) redirect('/login');

  const bloqueoId = String(formData.get('bloqueo_id') || '');
  const referenceDate = String(formData.get('reference_date') || '');

  const referenceDateParam = isValidIsoDate(referenceDate)
    ? referenceDate
    : null;
  const baseHref = buildAgendaHref({ reference_date: referenceDateParam });

  if (!bloqueoId) redirect(baseHref);

  const backendApiUrl = getBackendApiUrl();
  const res = await fetch(
    `${backendApiUrl}/citas/bloqueos/${encodeURIComponent(bloqueoId)}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    }
  );

  if (!res.ok) {
    const detail = await readBackendError(res);
    redirect(
      buildAgendaHref({
        reference_date: referenceDateParam,
        err: detail,
      })
    );
  }

  redirect(
    buildAgendaHref({
      reference_date: referenceDateParam,
      ok: 'bloqueo',
    })
  );
}

type DayEntry =
  | {
      kind: 'cita';
      startIso: string;
      cita: AdminAgendaItem;
    }
  | {
      kind: 'bloqueo';
      startIso: string;
      bloqueo: AgendaBloqueoItem;
    };

export default async function AdminAgendaPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const token = cookies().get('auth_token')?.value;
  if (!token) redirect('/login');

  const now = new Date();
  const todayKey = toIsoDateString(now);

  const refParam = searchParams?.reference_date;
  const referenceDate =
    typeof refParam === 'string' && isValidIsoDate(refParam)
      ? refParam
      : toIsoDateString(now);

  const backendApiUrl = getBackendApiUrl();
  const weekUrl = new URL(`${backendApiUrl}/citas/agenda-semana`);
  weekUrl.searchParams.set('reference_date', referenceDate);

  let week: AdminWeekAgendaResponse | null = null;
  let loadError = false;

  try {
    week = await fetchJson<AdminWeekAgendaResponse>(weekUrl.toString(), token);
  } catch {
    loadError = true;
  }

  const refDate = parseIsoDateLocal(referenceDate) ?? now;
  const fallbackWeekStart = startOfWeekMonday(refDate);
  const weekStart = week?.week_start
    ? (parseIsoDateLocal(week.week_start) ?? fallbackWeekStart)
    : fallbackWeekStart;

  const days: Date[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const weekEnd = days[6] ?? weekStart;
  const weekRangeLabel = formatWeekRangeLabel(weekStart, weekEnd);

  const prev = new Date(weekStart);
  prev.setDate(prev.getDate() - 7);
  const next = new Date(weekStart);
  next.setDate(next.getDate() + 7);

  const itemsByDay = new Map<string, DayEntry[]>();
  if (!loadError && week) {
    for (const cita of week.citas ?? []) {
      const key = toIsoDateString(new Date(cita.inicio_iso));
      const list = itemsByDay.get(key) ?? [];
      list.push({ kind: 'cita', startIso: cita.inicio_iso, cita });
      itemsByDay.set(key, list);
    }
    for (const bloqueo of week.bloqueos ?? []) {
      const key = toIsoDateString(new Date(bloqueo.inicio_iso));
      const list = itemsByDay.get(key) ?? [];
      list.push({ kind: 'bloqueo', startIso: bloqueo.inicio_iso, bloqueo });
      itemsByDay.set(key, list);
    }
  }

  itemsByDay.forEach((list) => {
    list.sort(
      (a, b) => new Date(a.startIso).getTime() - new Date(b.startIso).getTime()
    );
  });

  return (
    <div className="max-w-7xl mx-auto">
      {renderFlash(searchParams?.ok ?? null, searchParams?.err ?? null)}

      <div className="flex items-center gap-4 mb-10">
        <span className="text-primary font-serif italic text-xl">
          Agenda Semanal
        </span>
        <span className="text-stone-400 px-3 py-1 bg-surface-container rounded-full text-xs font-medium">
          {weekRangeLabel}
        </span>
      </div>

      <div className="grid grid-cols-12 gap-6 mb-12 items-end">
        <div className="col-span-12 lg:col-span-8">
          <h2 className="text-4xl font-headline tracking-tight text-primary mb-2">
            Organización de la Práctica
          </h2>
          <p className="text-secondary max-w-lg leading-relaxed">
            Vista editorial de tu semana clínica. Gestiona sesiones presenciales
            y asegura tus espacios de desarrollo externo.
          </p>
        </div>
        <div className="col-span-12 lg:col-span-4 flex justify-end gap-2">
          <Link
            className="w-10 h-10 flex items-center justify-center border-2 border-outline-variant/30 rounded-lg hover:bg-surface-container transition-colors"
            href={buildAgendaHref({ reference_date: toIsoDateString(prev) })}
            aria-label="Semana anterior"
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </Link>
          <Link
            className="w-10 h-10 flex items-center justify-center border-2 border-outline-variant/30 rounded-lg hover:bg-surface-container transition-colors"
            href={buildAgendaHref({ reference_date: toIsoDateString(next) })}
            aria-label="Semana siguiente"
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </Link>
          <Link
            className="px-4 py-2 border-2 border-outline-variant/30 rounded-lg font-label text-xs tracking-tighter uppercase text-on-surface-variant hover:bg-surface-container transition-colors"
            href={buildAgendaHref({ reference_date: todayKey })}
          >
            Hoy
          </Link>
        </div>
      </div>

      {loadError ? (
        <div className="mb-8 bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-6">
          <p className="text-sm text-on-surface-variant">
            No se pudo cargar la semana desde la API.
          </p>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <div className="grid grid-cols-7 gap-4 min-w-[1000px]">
          {days.map((day) => {
            const dayKey = toIsoDateString(day);
            const isToday = dayKey === todayKey;
            const weekdayLabel = capFirst(
              day.toLocaleDateString('es-ES', { weekday: 'long' })
            );

            return (
              <div
                key={`header-${dayKey}`}
                className={
                  isToday
                    ? 'text-center pb-6 border-b-4 border-primary'
                    : 'text-center pb-6'
                }
              >
                <p
                  className={
                    isToday
                      ? 'font-label text-[10px] tracking-[0.2em] uppercase text-primary mb-1'
                      : 'font-label text-[10px] tracking-[0.2em] uppercase text-stone-400 mb-1'
                  }
                >
                  {weekdayLabel}
                </p>
                <p
                  className={
                    isToday
                      ? 'font-headline text-2xl text-primary font-bold'
                      : 'font-headline text-2xl text-on-surface'
                  }
                >
                  {day.getDate()}
                </p>
              </div>
            );
          })}

          {days.map((day, idx) => {
            const dayKey = toIsoDateString(day);

            if (idx >= 5) {
              return (
                <div
                  key={`closed-${dayKey}`}
                  className="bg-surface-container-low/50 rounded-[5px] flex items-center justify-center opacity-40"
                >
                  <span className="font-label text-[10px] uppercase tracking-widest -rotate-90">
                    Cerrado
                  </span>
                </div>
              );
            }

            const items = itemsByDay.get(dayKey) ?? [];

            return (
              <div key={`col-${dayKey}`} className="space-y-4">
                {items.map((item) => {
                  if (item.kind === 'bloqueo') {
                    const bloqueo = item.bloqueo;
                    return (
                      <div
                        key={`bloqueo-${bloqueo.id}`}
                        className="raw-card p-4 bg-tertiary/5 border-dashed border-tertiary/20 flex flex-col gap-3 min-h-[120px] transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="material-symbols-outlined text-sm text-tertiary"
                              data-icon="lock"
                            >
                              lock
                            </span>
                            <span className="text-[10px] font-bold text-tertiary uppercase tracking-wider">
                              {formatTimeRange(
                                bloqueo.inicio_iso,
                                bloqueo.fin_iso
                              )}
                            </span>
                          </div>

                          <form action={desbloquearBloqueoAction}>
                            <input
                              type="hidden"
                              name="bloqueo_id"
                              value={bloqueo.id}
                            />
                            <input
                              type="hidden"
                              name="reference_date"
                              value={referenceDate}
                            />
                            <button
                              className="material-symbols-outlined text-xs text-stone-400 hover:text-error transition-colors"
                              data-icon="delete"
                              type="submit"
                              aria-label="Desbloquear"
                              title="Desbloquear"
                            >
                              delete
                            </button>
                          </form>
                        </div>

                        <h4 className="font-headline text-sm text-tertiary">
                          {(bloqueo.motivo || '').trim() || 'Bloqueo'}
                        </h4>
                        <p className="text-[10px] text-tertiary/60 uppercase tracking-tighter">
                          Espacio Bloqueado
                        </p>
                      </div>
                    );
                  }

                  const cita = item.cita;
                  const inicio = new Date(cita.inicio_iso);
                  const fin = new Date(cita.fin_iso);
                  const inProgress = now >= inicio && now < fin;

                  return (
                    <div
                      key={`cita-${cita.cita_id}`}
                      className={
                        inProgress
                          ? 'raw-card p-4 bg-primary/5 border-primary/20 flex flex-col gap-3 min-h-[140px] border-l-8 border-l-primary'
                          : 'raw-card p-4 bg-surface-container-lowest flex flex-col gap-3 min-h-[140px] relative'
                      }
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span
                          className={
                            inProgress
                              ? 'text-[10px] font-bold text-primary uppercase tracking-wider'
                              : 'text-[10px] font-bold text-tertiary uppercase tracking-wider'
                          }
                        >
                          {formatTimeRange(cita.inicio_iso, cita.fin_iso)}
                        </span>

                        <div className="flex items-center gap-2">
                          {inProgress ? (
                            <span className="bg-primary/20 text-primary text-[9px] px-2 py-0.5 rounded uppercase font-bold">
                              En Curso
                            </span>
                          ) : null}

                          <form action={cancelCitaAction}>
                            <input
                              type="hidden"
                              name="cita_id"
                              value={cita.cita_id}
                            />
                            <input
                              type="hidden"
                              name="reference_date"
                              value={referenceDate}
                            />
                            <button
                              className="material-symbols-outlined text-xs text-stone-400 hover:text-error transition-colors"
                              data-icon="delete"
                              type="submit"
                              aria-label="Cancelar"
                              title="Cancelar"
                            >
                              delete
                            </button>
                          </form>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-headline text-sm text-on-surface leading-tight">
                          {cita.paciente_nombre || '—'}
                        </h4>
                        <p className="text-[11px] text-on-surface-variant italic">
                          {cita.servicio_nombre || '—'}
                        </p>
                      </div>

                      <div className="mt-auto">
                        <Link
                          className="text-[10px] font-bold uppercase tracking-widest text-primary border-b border-primary"
                          href={`/admin/pacientes/${encodeURIComponent(
                            cita.paciente_id
                          )}`}
                        >
                          Ver Ficha Clínica
                        </Link>
                      </div>
                    </div>
                  );
                })}

                {!items.length ? (
                  <div className="border-2 border-stone-200 border-dashed rounded-[5px] h-32 flex items-center justify-center opacity-50">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-stone-300">
                      —
                    </span>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
