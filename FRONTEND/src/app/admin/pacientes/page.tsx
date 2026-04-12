/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { cookies } from 'next/headers';

import { CLINIC_ADDRESS } from '@/lib/clinic';

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

type AdminStatsResponse = {
  pacientes_activos_total: number;
  pacientes_nuevos_semana: number;
  agenda_hoy: AdminAgendaItem[];
};

type AdminWeekCitasResponse = {
  week_start: string;
  week_end: string;
  citas: AdminAgendaItem[];
};

type PacienteResponse = {
  id: string;
  nombre_completo: string;
  email: string;
  telefono?: string | null;
  fecha_alta?: string | null;
  motivo_consulta?: string | null;
  motivo_consulta_inicial?: string | null;
  activo: boolean;
};

function getBackendApiUrl(): string {
  return (
    process.env.BACKEND_API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:8000/api/v1'
  );
}

function toIsoDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

function formatShortDateTime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    time: d.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export default async function AdminPacientesPage({
  searchParams,
}: {
  searchParams?: { page?: string };
}) {
  const token = cookies().get('auth_token')?.value;

  const page = clampNumber(Number(searchParams?.page ?? '1') || 1, 1, 10_000);
  const limit = 20;
  const skip = (page - 1) * limit;

  const backendApiUrl = getBackendApiUrl();
  const ref = toIsoDateString(new Date());

  let pacientes: PacienteResponse[] = [];
  let stats: AdminStatsResponse | null = null;
  let citasSemana: AdminWeekCitasResponse | null = null;
  const authError = !token;
  let pacientesError = false;
  let statsError = false;
  let citasError = false;

  if (!authError && token) {
    const pacientesUrl = new URL(`${backendApiUrl}/pacientes`);
    pacientesUrl.searchParams.set('skip', String(skip));
    pacientesUrl.searchParams.set('limit', String(limit));

    const citasUrl = new URL(`${backendApiUrl}/citas/semana`);
    citasUrl.searchParams.set('reference_date', ref);

    const statsUrl = new URL(`${backendApiUrl}/admin/stats`);
    statsUrl.searchParams.set('reference_date', ref);

    const [pacientesResult, citasResult, statsResult] =
      await Promise.allSettled([
        fetchJson<PacienteResponse[]>(pacientesUrl.toString(), token),
        fetchJson<AdminWeekCitasResponse>(citasUrl.toString(), token),
        fetchJson<AdminStatsResponse>(statsUrl.toString(), token),
      ]);

    if (pacientesResult.status === 'fulfilled') {
      pacientes = Array.isArray(pacientesResult.value)
        ? pacientesResult.value
        : [];
    } else {
      pacientesError = true;
    }

    if (citasResult.status === 'fulfilled') {
      citasSemana = citasResult.value ?? null;
    } else {
      citasError = true;
    }

    if (statsResult.status === 'fulfilled') {
      stats = statsResult.value ?? null;
    } else {
      statsError = true;
    }
  } else {
    pacientesError = true;
    statsError = true;
    citasError = true;
  }

  const now = new Date();
  const weekCitas = citasSemana?.citas ?? [];

  const citasPorPaciente = new Map<string, AdminAgendaItem[]>();
  for (const cita of weekCitas) {
    const list = citasPorPaciente.get(cita.paciente_id) ?? [];
    list.push(cita);
    citasPorPaciente.set(cita.paciente_id, list);
  }
  citasPorPaciente.forEach((list) => {
    list.sort(
      (a, b) =>
        new Date(a.inicio_iso).getTime() - new Date(b.inicio_iso).getTime()
    );
  });

  const citasPendientesSemana = citasError
    ? null
    : weekCitas.filter((c) => new Date(c.inicio_iso) >= now).length;

  const proximaCita = citasError
    ? null
    : ([...weekCitas]
        .filter((c) => new Date(c.inicio_iso) >= now)
        .sort(
          (a, b) =>
            new Date(a.inicio_iso).getTime() - new Date(b.inicio_iso).getTime()
        )[0] ?? null);

  const totalPacientes =
    statsError || !stats || typeof stats.pacientes_activos_total !== 'number'
      ? null
      : stats.pacientes_activos_total;
  const hasTotalPacientes = typeof totalPacientes === 'number';
  const totalPages = hasTotalPacientes
    ? Math.max(1, Math.ceil(totalPacientes / limit))
    : null;
  const totalPagesValue = totalPages ?? 1;

  const pageButtons = hasTotalPacientes
    ? Array.from(
        {
          length: Math.min(
            3,
            totalPagesValue -
              Math.max(1, Math.min(page - 1, totalPagesValue - 2)) +
              1
          ),
        },
        (_, i) => Math.max(1, Math.min(page - 1, totalPagesValue - 2)) + i
      )
    : [page];

  const canNext = hasTotalPacientes
    ? page < totalPagesValue
    : !pacientesError && pacientes.length === limit;

  return (
    <>
      <div className="max-w-7xl mx-auto flex flex-col gap-10">
        {/* Compact KPI Section */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-surface-container-lowest p-8 rounded-[2rem] border border-outline-variant/10 shadow-[0_20px_40px_rgba(0,0,0,0.02)]">
            <div className="flex justify-between items-center">
              <span className="font-label text-xs uppercase tracking-widest text-secondary font-bold">
                Pacientes Activos
              </span>
              <span className="material-symbols-outlined text-primary/40">
                groups
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-5xl font-headline font-bold text-primary">
                {hasTotalPacientes ? totalPacientes : '—'}
              </span>
              <span className="text-[11px] text-primary font-bold bg-primary-container/40 px-3 py-1 rounded-full">
                {!statsError &&
                stats &&
                typeof stats.pacientes_nuevos_semana === 'number'
                  ? `+${stats.pacientes_nuevos_semana} esta semana`
                  : '—'}
              </span>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-8 rounded-[2rem] border border-outline-variant/10 shadow-[0_20px_40px_rgba(0,0,0,0.02)]">
            <div className="flex justify-between items-center">
              <span className="font-label text-xs uppercase tracking-widest text-secondary font-bold">
                Sesiones Pendientes (Semana)
              </span>
              <span className="material-symbols-outlined text-tertiary/40">
                pending_actions
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-5xl font-headline font-bold text-tertiary">
                {citasPendientesSemana === null ? '—' : citasPendientesSemana}
              </span>
              <span className="text-[11px] text-tertiary font-bold bg-tertiary-container/40 px-3 py-1 rounded-full">
                {!statsError && stats && Array.isArray(stats.agenda_hoy)
                  ? `Hoy: ${stats.agenda_hoy.length}`
                  : '—'}
              </span>
            </div>
          </div>

          <div className="bg-primary p-8 rounded-[2rem] shadow-[0_20px_40px_rgba(75,100,95,0.15)] text-on-primary">
            <div className="flex justify-between items-center">
              <span className="font-label text-xs uppercase tracking-widest text-on-primary/60 font-bold">
                Próxima Cita (Semana)
              </span>
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: '"FILL" 1' }}
              >
                calendar_clock
              </span>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-headline font-bold">
                {citasError
                  ? '—'
                  : proximaCita?.paciente_nombre || 'Sin próximas citas'}
              </h3>
              {proximaCita ? (
                <div className="flex items-center gap-2 mt-1 opacity-90">
                  <span className="text-3xl font-bold">
                    {formatShortDateTime(proximaCita.inicio_iso).time}
                  </span>
                  <span className="text-sm">
                    • {proximaCita.servicio_nombre || '—'}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {/* Patient Table Section */}
        <section className="flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6">
            <h3 className="text-4xl font-headline font-bold text-on-surface italic">
              Gestión de Pacientes
            </h3>
          </div>

          <div className="bg-surface-container-lowest rounded-[2rem] shadow-[0_40px_80px_rgba(0,0,0,0.03)] overflow-hidden border border-outline-variant/10">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/50">
                  <th className="px-8 py-6 text-[10px] uppercase tracking-[0.15em] text-secondary font-extrabold">
                    Nombre Completo
                  </th>
                  <th className="px-8 py-6 text-[10px] uppercase tracking-[0.15em] text-secondary font-extrabold">
                    Última Sesión (Semana)
                  </th>
                  <th className="px-8 py-6 text-[10px] uppercase tracking-[0.15em] text-secondary font-extrabold">
                    Próxima Sesión (Semana)
                  </th>
                  <th className="px-8 py-6 text-[10px] uppercase tracking-[0.15em] text-secondary font-extrabold">
                    Tipo
                  </th>
                  <th className="px-8 py-6 text-[10px] uppercase tracking-[0.15em] text-secondary font-extrabold">
                    Notas
                  </th>
                  <th className="px-8 py-6 text-[10px] uppercase tracking-[0.15em] text-secondary font-extrabold text-right">
                    Ficha
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {pacientesError ? (
                  <tr>
                    <td className="px-8 py-10" colSpan={6}>
                      <p className="text-sm text-outline">
                        No se pudieron cargar los pacientes desde la API.
                      </p>
                    </td>
                  </tr>
                ) : pacientes.length ? (
                  pacientes.map((paciente) => {
                    const citas = citasPorPaciente.get(paciente.id) ?? [];
                    const last = [...citas]
                      .filter((c) => new Date(c.inicio_iso) < now)
                      .slice(-1)[0];
                    const next = citas.find(
                      (c) => new Date(c.inicio_iso) >= now
                    );

                    const lastFmt = last
                      ? formatShortDateTime(last.inicio_iso)
                      : null;
                    const nextFmt = next
                      ? formatShortDateTime(next.inicio_iso)
                      : null;

                    const tipo = next?.servicio_nombre || last?.servicio_nombre;
                    const notas =
                      paciente.motivo_consulta ||
                      paciente.motivo_consulta_inicial;

                    return (
                      <tr
                        key={paciente.id}
                        className="hover:bg-surface-container-low transition-colors group"
                      >
                        <td className="px-8 py-6">
                          <Link
                            className="font-headline font-bold text-on-surface hover:underline underline-offset-4"
                            href={`/admin/pacientes/${paciente.id}`}
                          >
                            {paciente.nombre_completo || '—'}
                          </Link>
                          <p className="text-[10px] text-stone-400 font-label mt-0.5">
                            ID: {paciente.id}
                          </p>
                        </td>
                        <td className="px-8 py-6">
                          {last && lastFmt ? (
                            <div className="flex flex-col gap-1">
                              <span className="text-sm font-medium">
                                {lastFmt.date}
                              </span>
                              <span className="inline-flex items-center w-fit px-2 py-0.5 rounded text-[9px] font-bold bg-primary-container text-on-primary-container uppercase tracking-tight">
                                {last.estado || '—'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-outline">—</span>
                          )}
                        </td>
                        <td className="px-8 py-6">
                          {next && nextFmt ? (
                            <div className="flex flex-col gap-1">
                              <span className="text-sm font-bold text-primary">
                                {nextFmt.date}, {nextFmt.time}
                              </span>
                              <span className="inline-flex items-center w-fit px-2 py-0.5 rounded text-[9px] font-bold bg-tertiary-container text-on-tertiary-container uppercase tracking-tight">
                                {next.estado || '—'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-outline">—</span>
                          )}
                        </td>
                        <td className="px-8 py-6">
                          <span className="text-xs text-secondary font-medium">
                            {tipo || '—'}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <p className="text-xs text-stone-500 max-w-[180px] line-clamp-2 italic leading-relaxed">
                            {notas || '—'}
                          </p>
                        </td>

                        <td className="px-8 py-6 text-right">
                          <Link
                            className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-outline-variant/20 text-secondary hover:text-primary hover:border-primary/20 transition-colors"
                            href={`/admin/pacientes/${paciente.id}`}
                            aria-label="Ver ficha clínica"
                            title="Ver ficha clínica"
                          >
                            <span
                              className="material-symbols-outlined"
                              data-icon="description"
                            >
                              description
                            </span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="px-8 py-10" colSpan={6}>
                      <p className="text-sm text-outline">No hay pacientes.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="px-8 py-6 bg-surface-container-low/30 flex items-center justify-between border-t border-outline-variant/10">
              <span className="text-[10px] font-label uppercase tracking-widest text-stone-400">
                {hasTotalPacientes
                  ? `Mostrando ${totalPacientes === 0 ? 0 : skip + 1}-${skip + pacientes.length} de ${totalPacientes} pacientes`
                  : `Mostrando ${pacientes.length} pacientes (página ${page})`}
              </span>
              <div className="flex items-center gap-2">
                {page > 1 ? (
                  <Link
                    className="p-2 rounded-lg border border-outline-variant/30 hover:bg-white transition-colors"
                    href={`/admin/pacientes?page=${page - 1}`}
                    aria-label="Página anterior"
                  >
                    <span className="material-symbols-outlined">
                      chevron_left
                    </span>
                  </Link>
                ) : (
                  <button
                    className="p-2 rounded-lg border border-outline-variant/30 hover:bg-white transition-colors disabled:opacity-30"
                    type="button"
                    disabled
                  >
                    <span className="material-symbols-outlined">
                      chevron_left
                    </span>
                  </button>
                )}

                {pageButtons.map((p) =>
                  p === page ? (
                    <span
                      key={p}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary text-on-primary text-sm font-bold"
                    >
                      {p}
                    </span>
                  ) : (
                    <Link
                      key={p}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white text-sm font-medium"
                      href={`/admin/pacientes?page=${p}`}
                    >
                      {p}
                    </Link>
                  )
                )}

                {canNext ? (
                  <Link
                    className="p-2 rounded-lg border border-outline-variant/30 hover:bg-white transition-colors"
                    href={`/admin/pacientes?page=${page + 1}`}
                    aria-label="Página siguiente"
                  >
                    <span className="material-symbols-outlined">
                      chevron_right
                    </span>
                  </Link>
                ) : (
                  <button
                    className="p-2 rounded-lg border border-outline-variant/30 hover:bg-white transition-colors disabled:opacity-30"
                    type="button"
                    disabled
                  >
                    <span className="material-symbols-outlined">
                      chevron_right
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Footer Branding */}
      <footer className="mt-16 max-w-7xl mx-auto flex justify-between items-center bg-stone-50/50 border-t border-outline-variant/5 px-8 py-8">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 overflow-hidden rounded-xl shadow-sm">
            <img
              alt="Dra. Almudena Marchesi"
              className="w-full h-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBLoun3TBPmagD9c0K1-9OBwugmwzhTjFgFRcJgzGUZ-0W9BsoDY8dDDXGxxscO64ULBIZTVq4JNVhW-VeuSOWGHgy8FVZd94JG1m3eiuFWqbPuEAtsqmXdqS4RL-4koWP4bVAo4b_nsXFnp4yOLSReXa9Vs0lNDUiTXQWjRid7FKZrPBxuy1mEUxPDmuR7WsPHGf3r4AYoa2KwabivGVVuR4usQTat-hkdmhCT_xoBtixBnN-fTpIaUOHyZfdIjJF4QDJbyHGkrGg"
            />
          </div>
          <div>
            <p className="text-[10px] font-label uppercase tracking-widest font-extrabold text-on-surface">
              Moncloa Sanctuary Studio
            </p>
            <p className="text-[10px] font-label uppercase tracking-widest text-outline">
              {CLINIC_ADDRESS}
            </p>
          </div>
        </div>
        <div className="text-[10px] font-label uppercase tracking-widest text-secondary font-bold opacity-60">
          © 2024 SERENITY CLINIC MANAGEMENT
        </div>
      </footer>
    </>
  );
}
