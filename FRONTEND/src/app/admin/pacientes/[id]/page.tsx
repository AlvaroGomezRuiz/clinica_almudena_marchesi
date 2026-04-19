import { cookies } from 'next/headers';

type PacienteResponse = {
  id: string;
  dni_nie: string;
  nombre_completo: string;
  telefono?: string | null;
  email: string;
  fecha_nacimiento?: string | null;
  motivo_consulta_inicial?: string | null;
  experiencia_terapia?: string | null;
  motivo_consulta?: string | null;
  consentimiento_rgpd?: boolean | null;
  fecha_alta?: string | null;
  activo: boolean;
};

type PacienteSesionItem = {
  id: string;
  cita_id: string;
  inicio_iso: string;
  fin_iso: string;
  servicio_nombre: string;
  estado_cita: string;
  notas_clinicas: string;
  tareas_asignadas: string;
  estado_emocional: string;
  fecha_registro: string;
  session_number: number;
};

type PacienteHistorialResponse = {
  total: number;
  items: PacienteSesionItem[];
};

function getBackendApiUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BACKEND_API_URL ?? 'http://localhost:8000/api/v1'
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

function calcAge(dateString: string | null | undefined): number | null {
  if (!dateString) return null;
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age >= 0 && age <= 130 ? age : null;
}

function formatShortDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDayMonth(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const raw = d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
  });
  return raw.replace(' de ', ' ');
}

export default async function AdminPacienteDetallePage({
  params,
}: {
  params: { id: string };
}) {
  const token = cookies().get('auth_token')?.value;
  const backendApiUrl = getBackendApiUrl();

  let paciente: PacienteResponse | null = null;
  let historial: PacienteHistorialResponse | null = null;
  let loadError = false;
  let historialError = false;

  if (token) {
    try {
      const pacienteUrl = `${backendApiUrl}/pacientes/${encodeURIComponent(params.id)}`;
      const historialUrl = `${backendApiUrl}/pacientes/${encodeURIComponent(params.id)}/historial`;

      const [pacienteResult, historialResult] = await Promise.allSettled([
        fetchJson<PacienteResponse>(pacienteUrl, token),
        fetchJson<PacienteHistorialResponse>(historialUrl, token),
      ]);

      if (pacienteResult.status === 'fulfilled') {
        paciente = pacienteResult.value ?? null;
      } else {
        loadError = true;
      }

      if (historialResult.status === 'fulfilled') {
        historial = historialResult.value ?? null;
      } else {
        historialError = true;
      }
    } catch {
      loadError = true;
      historialError = true;
    }
  } else {
    loadError = true;
    historialError = true;
  }

  const edad = calcAge(paciente?.fecha_nacimiento);
  const now = new Date();
  const nowLabel = now.toLocaleString('es-ES', {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  const diagnostico =
    paciente?.motivo_consulta || paciente?.motivo_consulta_inicial || null;

  const sesionesRegistradas =
    historialError || !historial || typeof historial.total !== 'number'
      ? null
      : historial.total;

  const ultimaSesionIso =
    historialError || !historial || !Array.isArray(historial.items)
      ? null
      : (historial.items[0]?.inicio_iso ?? null);
  const ultimaSesionLabel = ultimaSesionIso
    ? formatShortDate(ultimaSesionIso)
    : '—';

  return (
    <div className="max-w-6xl mx-auto space-y-16 pb-24">
      {/* Header */}
      <header className="pt-4">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6">
          <div>
            <h2 className="text-5xl font-serif tracking-tight mb-4">
              {loadError ? '—' : paciente?.nombre_completo || '—'}
            </h2>
            <div className="flex flex-col md:flex-row md:gap-8 gap-3 text-secondary/70">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-widest font-bold">
                  Edad
                </span>
                <span className="text-sm font-semibold text-on-surface">
                  {edad === null ? '—' : `${edad} años`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-widest font-bold">
                  Última Sesión
                </span>
                <span className="text-sm font-semibold text-on-surface">
                  {loadError ? '—' : ultimaSesionLabel}
                </span>
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] uppercase tracking-widest font-bold">
                  Diagnóstico Principal
                </span>
                <span className="text-sm font-semibold text-on-surface truncate">
                  {diagnostico || '—'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-widest font-bold">
                  Medicación
                </span>
                <span className="text-sm font-semibold text-on-surface">—</span>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              className="px-6 py-2.5 bg-white border border-outline-variant/30 rounded-xl text-sm font-bold text-secondary hover:bg-surface-container transition-colors disabled:opacity-50"
              type="button"
              disabled
            >
              Exportar
            </button>
            <button
              className="px-6 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-bold hover:opacity-95 transition-all disabled:opacity-50"
              type="button"
              disabled
            >
              Editar Perfil
            </button>
          </div>
        </div>

        <div className="mt-6 text-xs text-outline">
          <span className="font-bold">ID:</span> {params.id}
          {paciente?.fecha_alta ? (
            <>
              {' '}
              • <span className="font-bold">Alta:</span>{' '}
              {formatShortDate(paciente.fecha_alta)}
            </>
          ) : null}
        </div>
      </header>

      {/* New Session */}
      <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 editorial-shadow overflow-hidden">
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-serif">Nueva Sesión</h3>
            <div className="text-[10px] font-bold text-secondary/40 uppercase tracking-widest">
              {loadError ? '—' : `Hoy • ${nowLabel}`}
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <input
                className="w-full border-none p-0 text-2xl font-serif placeholder:text-outline-variant/50 focus:ring-0 bg-transparent"
                placeholder="Título de la sesión..."
                type="text"
                disabled
              />
            </div>
            <div>
              <textarea
                className="w-full border-none p-0 text-lg leading-relaxed placeholder:text-outline-variant/50 focus:ring-0 bg-transparent resize-none min-h-[200px]"
                placeholder="Escribe las notas de hoy aquí..."
                disabled
              />
            </div>

            <div className="pt-6 border-t border-outline-variant/10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex gap-2 items-center">
                <span className="text-[11px] text-secondary/50 font-bold uppercase tracking-widest">
                  Etiquetas
                </span>
                <button
                  className="p-1.5 text-primary hover:bg-primary/5 rounded-full transition-colors disabled:opacity-50"
                  type="button"
                  disabled
                  aria-label="Añadir etiqueta"
                >
                  <span className="material-symbols-outlined text-xl">
                    add_circle
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-4">
                <button
                  className="p-2 text-secondary hover:bg-surface-container rounded-xl transition-colors disabled:opacity-50"
                  type="button"
                  disabled
                  aria-label="Adjuntar archivo"
                >
                  <span className="material-symbols-outlined">attach_file</span>
                </button>
                <button
                  className="px-10 py-3 bg-primary text-on-primary rounded-xl text-sm font-bold hover:opacity-95 transition-all disabled:opacity-50"
                  type="button"
                  disabled
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Clinical History */}
      <section>
        <div className="flex items-center justify-between mb-10">
          <h3 className="text-2xl font-serif">Historia Clínica</h3>
          <span className="text-[11px] font-bold text-secondary/50 uppercase tracking-widest">
            {sesionesRegistradas === null ? '—' : sesionesRegistradas} Sesiones
            Registradas
          </span>
        </div>

        {loadError || historialError ? (
          <div className="bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant/20">
            <p className="text-sm text-on-surface-variant">—</p>
          </div>
        ) : historial?.items?.length ? (
          <div className="relative pl-8 pr-2 space-y-8 max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-outline-variant/30">
            <div className="absolute left-[3px] top-4 bottom-0 w-[1px] bg-outline-variant/30" />

            {historial.items.map((sesion, index) => {
              const isActive = index === 0;
              const title = (sesion.servicio_nombre || '').trim() || 'Sesión';
              const notes = (sesion.notas_clinicas || '').trim();
              const estado = (sesion.estado_cita || '').trim() || '—';
              const sessionNumber = Number.isFinite(sesion.session_number)
                ? sesion.session_number
                : null;

              return (
                <div key={sesion.id} className="relative">
                  <div
                    className={
                      isActive
                        ? 'absolute -left-[33px] top-2 w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-surface'
                        : 'absolute -left-[33px] top-2 w-2.5 h-2.5 rounded-full bg-outline-variant/30 ring-4 ring-surface'
                    }
                  />
                  <div
                    className={
                      isActive
                        ? 'bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant/20 hover:border-primary/20 transition-all'
                        : 'bg-surface-container-lowest/60 p-8 rounded-2xl border border-outline-variant/10'
                    }
                  >
                    <div className="flex justify-between items-start mb-4 gap-6">
                      <div className="min-w-0">
                        <h4 className="text-lg font-headline mb-1 truncate">
                          {title}
                        </h4>
                        <div className="flex gap-3 text-[10px] font-bold text-secondary/60 uppercase tracking-tight">
                          <span>{formatDayMonth(sesion.inicio_iso)}</span>
                          <span>•</span>
                          <span>{estado}</span>
                        </div>
                      </div>

                      <span
                        className={
                          isActive
                            ? 'text-xs font-bold text-primary'
                            : 'text-xs font-bold text-secondary/30'
                        }
                      >
                        {sessionNumber === null ? '—' : `#${sessionNumber}`}
                      </span>
                    </div>

                    <p
                      className={
                        isActive
                          ? 'text-on-surface/80 leading-relaxed'
                          : 'text-on-surface/60 leading-relaxed'
                      }
                    >
                      {notes || '—'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant/20">
            <p className="text-sm text-on-surface-variant">
              Sin datos de sesiones para mostrar.
            </p>
          </div>
        )}

        <div className="mt-12 text-center">
          <button
            className="text-sm font-bold text-secondary hover:text-primary underline underline-offset-8 transition-all disabled:opacity-50"
            type="button"
            disabled
          >
            Cargar sesiones anteriores
          </button>

          <div className="mt-8 flex flex-wrap justify-center items-center gap-8">
            <button
              className="text-[11px] font-bold text-secondary/40 hover:text-primary uppercase tracking-widest transition-colors disabled:opacity-50"
              type="button"
              disabled
            >
              Facturas
            </button>
            <button
              className="text-[11px] font-bold text-secondary/40 hover:text-primary uppercase tracking-widest transition-colors disabled:opacity-50"
              type="button"
              disabled
            >
              Evaluación Inicial
            </button>
            <button
              className="text-[11px] font-bold text-secondary/40 hover:text-primary uppercase tracking-widest transition-colors disabled:opacity-50"
              type="button"
              disabled
            >
              Consentimiento Informado
            </button>
          </div>
        </div>
      </section>

      {/* Minimal Status Bar */}
      <div className="fixed bottom-6 right-6 z-40">
        <div className="bg-surface-container-lowest/80 backdrop-blur-md border border-outline-variant/20 px-4 py-2 rounded-full shadow-sm flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">
            Conexión
          </span>
        </div>
      </div>
    </div>
  );
}
