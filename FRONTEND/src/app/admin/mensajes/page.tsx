import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

type ConversacionItem = {
  id: string;
  paciente_id: string;
  paciente_nombre: string;
  last_message_at: string;
};

type PacienteSearchItem = {
  id: string;
  nombre_completo: string;
  email: string;
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

async function fetchJsonPost<T>(
  url: string,
  token: string,
  body: unknown
): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Fetch failed (${res.status})`);
  }

  return (await res.json()) as T;
}

function formatLastMessageAt(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function AdminMensajesPage({
  searchParams,
}: {
  searchParams?: { c?: string; new?: string; q?: string; err?: string };
}) {
  const token = cookies().get('auth_token')?.value;
  const backendApiUrl = getBackendApiUrl();

  let conversaciones: ConversacionItem[] = [];
  let loadError = false;

  if (token) {
    try {
      conversaciones = await fetchJson<ConversacionItem[]>(
        `${backendApiUrl}/mensajes`,
        token
      );
      if (!Array.isArray(conversaciones)) conversaciones = [];
    } catch {
      loadError = true;
    }
  } else {
    loadError = true;
  }

  const selectedId = (searchParams?.c || '').trim();
  const selected =
    (selectedId ? conversaciones.find((x) => x.id === selectedId) : null) ??
    conversaciones[0] ??
    null;

  const modalNuevoAbierto = searchParams?.new === '1';
  const q = (searchParams?.q || '').trim();

  let pacientes: PacienteSearchItem[] = [];
  if (modalNuevoAbierto && token && q) {
    try {
      pacientes = await fetchJson<PacienteSearchItem[]>(
        `${backendApiUrl}/pacientes?search=${encodeURIComponent(q)}&skip=0&limit=10`,
        token
      );
      if (!Array.isArray(pacientes)) pacientes = [];
    } catch {
      pacientes = [];
    }
  }

  async function crearConversacionAction(formData: FormData) {
    'use server';
    const tokenInner = cookies().get('auth_token')?.value;
    const backendApiUrlInner = getBackendApiUrl();
    const pacienteId = String(formData.get('paciente_id') ?? '').trim();
    const qInner = String(formData.get('q') ?? '').trim();

    if (!tokenInner) {
      redirect(
        `/admin/mensajes?new=1&q=${encodeURIComponent(qInner)}&err=Sesión inválida`
      );
    }
    if (!pacienteId) {
      redirect(
        `/admin/mensajes?new=1&q=${encodeURIComponent(qInner)}&err=Paciente inválido`
      );
    }

    try {
      const conv = await fetchJsonPost<ConversacionItem>(
        `${backendApiUrlInner}/mensajes/conversaciones`,
        tokenInner,
        { paciente_id: pacienteId }
      );

      redirect(`/admin/mensajes?c=${encodeURIComponent(conv.id)}`);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : 'No se pudo crear la conversación';
      redirect(
        `/admin/mensajes?new=1&q=${encodeURIComponent(qInner)}&err=${encodeURIComponent(msg)}`
      );
    }
  }

  async function archivarConversacionAction(formData: FormData) {
    'use server';
    const tokenInner = cookies().get('auth_token')?.value;
    const backendApiUrlInner = getBackendApiUrl();
    const conversationId = String(formData.get('conversation_id') ?? '').trim();

    if (!tokenInner || !conversationId) {
      redirect('/admin/mensajes');
    }

    try {
      const res = await fetch(
        `${backendApiUrlInner}/mensajes/${encodeURIComponent(conversationId)}/archivar`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${tokenInner}`,
          },
          cache: 'no-store',
        }
      );
      if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
      redirect('/admin/mensajes');
    } catch {
      redirect('/admin/mensajes');
    }
  }

  async function eliminarConversacionAction(formData: FormData) {
    'use server';
    const tokenInner = cookies().get('auth_token')?.value;
    const backendApiUrlInner = getBackendApiUrl();
    const conversationId = String(formData.get('conversation_id') ?? '').trim();

    if (!tokenInner || !conversationId) {
      redirect('/admin/mensajes');
    }

    try {
      const res = await fetch(
        `${backendApiUrlInner}/mensajes/${encodeURIComponent(conversationId)}/eliminar`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${tokenInner}`,
          },
          cache: 'no-store',
        }
      );
      if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
      redirect('/admin/mensajes');
    } catch {
      redirect('/admin/mensajes');
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="grid grid-cols-12 gap-8 items-stretch">
        {/* Conversations List */}
        <section className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-4xl text-primary tracking-tight">
              Conversaciones
            </h2>
            <Link
              className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center editorial-shadow active:scale-95 transition-transform"
              href="/admin/mensajes?new=1"
              aria-label="Nueva conversación"
              title="Nueva conversación"
            >
              <span className="material-symbols-outlined" data-icon="add">
                add
              </span>
            </Link>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto pr-2">
            {loadError ? (
              <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/10">
                <p className="text-sm text-on-surface-variant">—</p>
              </div>
            ) : conversaciones.length ? (
              conversaciones.map((c, idx) => {
                const isActive = selected?.id === c.id;
                return (
                  <Link
                    key={c.id}
                    href={`/admin/mensajes?c=${encodeURIComponent(c.id)}`}
                    className={
                      isActive
                        ? 'block bg-surface-container-lowest p-4 rounded-xl border border-primary/10 shadow-sm ring-2 ring-primary/10'
                        : 'block bg-surface-container-low/50 p-4 rounded-xl hover:bg-surface-container transition-all'
                    }
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p
                          className={
                            isActive
                              ? 'font-bold text-on-surface truncate'
                              : 'font-bold text-on-surface-variant truncate'
                          }
                        >
                          {c.paciente_nombre || '—'}
                        </p>
                        <p className="text-xs text-outline truncate">
                          Último mensaje:{' '}
                          {formatLastMessageAt(c.last_message_at)}
                        </p>
                      </div>
                      <span className="text-[10px] text-outline font-medium">
                        {idx === 0 ? 'Activo' : ''}
                      </span>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/10">
                <p className="text-sm text-on-surface-variant">
                  No hay conversaciones.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Chat Main Area */}
        <section className="col-span-12 lg:col-span-8 flex flex-col editorial-shadow bg-surface-container-lowest rounded-2xl overflow-hidden border border-outline-variant/10">
          {/* Chat Header */}
          <div className="px-8 py-4 bg-surface-container-low flex justify-between items-center border-b border-outline-variant/10">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-primary-container flex items-center justify-center text-primary">
                <span
                  className="material-symbols-outlined"
                  data-icon="account_circle"
                >
                  account_circle
                </span>
              </div>
              <div className="min-w-0">
                <h3 className="font-serif font-bold text-primary truncate">
                  {selected ? selected.paciente_nombre || '—' : 'Mensajes'}
                </h3>
                <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">
                  {selected ? 'Conversación' : 'Selecciona una conversación'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {selected ? (
                <a
                  className="px-4 py-2 rounded-full bg-surface-container hover:bg-surface-container-high text-primary text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-2"
                  href="https://meet.google.com/new"
                  target="_blank"
                  rel="noreferrer"
                >
                  <span
                    className="material-symbols-outlined"
                    data-icon="videocam"
                  >
                    videocam
                  </span>
                  Iniciar sesión online
                </a>
              ) : (
                <span className="px-4 py-2 rounded-full bg-surface-container text-outline text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 opacity-50">
                  <span
                    className="material-symbols-outlined"
                    data-icon="videocam"
                  >
                    videocam
                  </span>
                  Iniciar sesión online
                </span>
              )}

              {selected ? (
                <details className="relative">
                  <summary className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-primary/5 text-outline transition-all cursor-pointer list-none">
                    <span
                      className="material-symbols-outlined"
                      data-icon="more_vert"
                    >
                      more_vert
                    </span>
                  </summary>
                  <div className="absolute right-0 mt-2 w-44 bg-surface-container-lowest rounded-2xl border border-outline-variant/10 editorial-shadow overflow-hidden">
                    <form action={archivarConversacionAction}>
                      <input
                        type="hidden"
                        name="conversation_id"
                        value={selected.id}
                      />
                      <button
                        className="w-full px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-on-surface hover:bg-surface-container transition-colors"
                        type="submit"
                      >
                        Archivar
                      </button>
                    </form>
                    <form action={eliminarConversacionAction}>
                      <input
                        type="hidden"
                        name="conversation_id"
                        value={selected.id}
                      />
                      <button
                        className="w-full px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-error hover:bg-error/10 transition-colors"
                        type="submit"
                      >
                        Eliminar
                      </button>
                    </form>
                  </div>
                </details>
              ) : null}
            </div>
          </div>

          {/* Messages Canvas */}
          <div className="flex-1 p-8 overflow-y-auto flex flex-col gap-6">
            <div className="text-center my-4">
              <span className="px-4 py-1.5 rounded-full bg-surface-container text-[11px] font-bold text-outline-variant uppercase tracking-widest">
                {selected ? 'Sin historial' : '—'}
              </span>
            </div>

            <div className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/10">
              <p className="text-sm text-on-surface-variant">
                {loadError
                  ? '—'
                  : selected
                    ? 'No hay datos de mensajes para mostrar.'
                    : 'No hay conversaciones seleccionadas.'}
              </p>
            </div>
          </div>

          {/* Chat Input Area */}
          <div className="p-6 bg-surface-container-lowest border-t border-outline-variant/10">
            <div className="flex items-center gap-4 bg-surface-container-low p-2 rounded-2xl border border-outline-variant/10">
              <button
                className="w-10 h-10 flex items-center justify-center text-outline hover:text-primary transition-colors disabled:opacity-50"
                type="button"
                disabled
              >
                <span
                  className="material-symbols-outlined"
                  data-icon="attach_file"
                >
                  attach_file
                </span>
              </button>
              <input
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm placeholder:text-outline/60"
                placeholder="Escribe un mensaje seguro..."
                type="text"
                disabled
              />
              <button
                className="w-10 h-10 flex items-center justify-center text-outline hover:text-primary transition-colors disabled:opacity-50"
                type="button"
                disabled
              >
                <span
                  className="material-symbols-outlined"
                  data-icon="sentiment_satisfied"
                >
                  sentiment_satisfied
                </span>
              </button>
              <button
                className="w-10 h-10 bg-primary text-on-primary rounded-xl editorial-shadow flex items-center justify-center disabled:opacity-50"
                type="button"
                disabled
              >
                <span
                  className="material-symbols-outlined"
                  data-icon="send"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  send
                </span>
              </button>
            </div>
            <p className="text-[9px] text-center mt-3 text-outline-variant uppercase tracking-widest font-bold">
              Respuesta guardada automáticamente
            </p>
          </div>
        </section>
      </div>

      {/* Contextual Details Panel */}
      <div className="fixed right-6 bottom-6 w-72 editorial-shadow bg-tertiary-container/60 backdrop-blur-md p-6 rounded-2xl border border-tertiary/10">
        <div className="flex items-center gap-2 mb-4">
          <span
            className="material-symbols-outlined text-tertiary"
            data-icon="info"
          >
            info
          </span>
          <h4 className="font-serif font-bold text-sm text-on-tertiary-container">
            Nota de Sesión
          </h4>
        </div>
        <p className="text-xs text-on-tertiary-container/80 leading-relaxed italic mb-6">
          {loadError ? '—' : '—'}
        </p>
        <button
          className="w-full py-3 bg-tertiary text-on-tertiary rounded-lg text-[11px] font-bold uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50"
          type="button"
          disabled
        >
          Ver Ficha Completa
        </button>
      </div>

      {modalNuevoAbierto ? (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <Link
            className="absolute inset-0 bg-black/20"
            href="/admin/mensajes"
            aria-label="Cerrar"
          />
          <div className="relative w-full md:max-w-2xl bg-surface-container-lowest rounded-t-3xl md:rounded-3xl p-6 md:p-8 editorial-shadow">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-2">
                  Conversaciones
                </p>
                <h3 className="font-serif text-2xl text-primary">Nuevo chat</h3>
              </div>
              <Link
                className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center hover:bg-surface-container-high transition-colors"
                href="/admin/mensajes"
                aria-label="Cerrar"
              >
                <span className="material-symbols-outlined" data-icon="close">
                  close
                </span>
              </Link>
            </div>

            {searchParams?.err ? (
              <div className="mb-4 bg-error/10 text-error text-sm p-3 rounded-2xl">
                {searchParams.err}
              </div>
            ) : null}

            <form
              action="/admin/mensajes"
              method="get"
              className="flex gap-2 mb-5"
            >
              <input type="hidden" name="new" value="1" />
              <input
                className="flex-1 px-4 py-3 bg-surface-container-low border-none focus:ring-2 focus:ring-primary-container rounded-2xl text-sm"
                name="q"
                defaultValue={q}
                placeholder="Buscar paciente..."
              />
              <button
                className="px-5 py-3 rounded-2xl bg-primary text-on-primary text-xs font-bold uppercase tracking-widest hover:opacity-95 transition-opacity"
                type="submit"
              >
                Buscar
              </button>
            </form>

            {q ? (
              pacientes.length ? (
                <div className="space-y-2">
                  {pacientes.map((p) => (
                    <form
                      key={p.id}
                      action={crearConversacionAction}
                      className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/10 hover:bg-surface-container transition-colors flex items-center justify-between gap-4"
                    >
                      <input type="hidden" name="paciente_id" value={p.id} />
                      <input type="hidden" name="q" value={q} />
                      <div className="min-w-0">
                        <p className="font-bold text-on-surface truncate">
                          {p.nombre_completo || '—'}
                        </p>
                        <p className="text-xs text-outline truncate">
                          {p.email || '—'}
                        </p>
                      </div>
                      <button
                        className="px-4 py-2 rounded-full bg-primary text-on-primary text-[10px] font-bold uppercase tracking-widest hover:opacity-95 transition-opacity"
                        type="submit"
                      >
                        Abrir
                      </button>
                    </form>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-on-surface-variant">
                  Sin resultados.
                </p>
              )
            ) : (
              <p className="text-sm text-on-surface-variant">
                Introduce una búsqueda.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
