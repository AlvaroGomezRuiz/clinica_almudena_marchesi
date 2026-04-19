import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

type RecursoItem = {
  id: string;
  titulo: string;
  tipo: string;
  categoria?: string;
  url: string;
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

export default async function AdminRecursosPage({
  searchParams,
}: {
  searchParams?: {
    upload?: string;
    assign?: string;
    categoria?: string;
    q?: string;
    paciente?: string;
    err?: string;
  };
}) {
  const token = cookies().get('auth_token')?.value;
  const backendApiUrl = getBackendApiUrl();

  let recursos: RecursoItem[] = [];
  let loadError = false;

  if (token) {
    try {
      recursos = await fetchJson<RecursoItem[]>(
        `${backendApiUrl}/recursos`,
        token
      );
      if (!Array.isArray(recursos)) recursos = [];
    } catch {
      loadError = true;
    }
  } else {
    loadError = true;
  }

  const total = recursos.length;
  const recursosGenerales = loadError
    ? []
    : recursos.filter((r) => (r.categoria || 'recurso') !== 'legal');

  const legales = loadError
    ? []
    : recursos.filter((r) => (r.categoria || 'recurso') === 'legal');

  const lecturas = loadError
    ? []
    : recursosGenerales.filter((r) =>
        (r.tipo || '').toLowerCase().includes('pdf')
      );

  const modalUploadAbierto = searchParams?.upload === '1';
  const modalAssignAbierto = searchParams?.assign === '1';
  const uploadCategoria = (searchParams?.categoria || 'recurso').toLowerCase();
  const q = (searchParams?.q || '').trim();
  const selectedPacienteId = (searchParams?.paciente || '').trim();

  let pacientes: PacienteSearchItem[] = [];
  if (modalAssignAbierto && token && q) {
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

  const selectedPaciente =
    pacientes.find((p) => p.id === selectedPacienteId) ?? null;

  async function uploadRecursoAction(formData: FormData) {
    'use server';
    const tokenInner = cookies().get('auth_token')?.value;
    const backendApiUrlInner = getBackendApiUrl();
    const categoriaInner = String(
      formData.get('categoria') ?? 'recurso'
    ).trim();

    if (!tokenInner) {
      redirect(
        `/admin/recursos?upload=1&categoria=${encodeURIComponent(categoriaInner)}&err=Sesión inválida`
      );
    }

    try {
      const res = await fetch(`${backendApiUrlInner}/recursos/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenInner}`,
        },
        body: formData,
        cache: 'no-store',
      });

      if (!res.ok) {
        throw new Error(`Upload failed (${res.status})`);
      }

      redirect('/admin/recursos');
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : 'No se pudo subir el recurso';
      redirect(
        `/admin/recursos?upload=1&categoria=${encodeURIComponent(categoriaInner)}&err=${encodeURIComponent(msg)}`
      );
    }
  }

  async function asignarRecursoAction(formData: FormData) {
    'use server';
    const tokenInner = cookies().get('auth_token')?.value;
    const backendApiUrlInner = getBackendApiUrl();
    const recursoId = String(formData.get('recurso_id') ?? '').trim();
    const pacienteId = String(formData.get('paciente_id') ?? '').trim();
    const qInner = String(formData.get('q') ?? '').trim();

    if (!tokenInner) {
      redirect(
        `/admin/recursos?assign=1&q=${encodeURIComponent(qInner)}&err=Sesión inválida`
      );
    }
    if (!recursoId || !pacienteId) {
      redirect(
        `/admin/recursos?assign=1&q=${encodeURIComponent(qInner)}&paciente=${encodeURIComponent(pacienteId)}&err=Datos incompletos`
      );
    }

    try {
      await fetchJsonPost<unknown>(
        `${backendApiUrlInner}/recursos/asignar`,
        tokenInner,
        {
          recurso_id: recursoId,
          paciente_id: pacienteId,
        }
      );
      redirect('/admin/recursos');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo asignar';
      redirect(
        `/admin/recursos?assign=1&q=${encodeURIComponent(qInner)}&paciente=${encodeURIComponent(pacienteId)}&err=${encodeURIComponent(msg)}`
      );
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      <header className="flex justify-between items-start mb-16">
        <div>
          <h2 className="font-serif text-4xl text-primary tracking-tight mb-2">
            Repositorio de Recursos
          </h2>
          <p className="text-secondary-dim text-sm max-w-md leading-relaxed">
            Gestiona y asigna materiales terapéuticos.
          </p>
        </div>

        <div className="flex gap-4 border-l border-primary/10 pl-8">
          <Link
            className="bg-surface-container-low text-primary border-2 border-primary-dim/10 px-6 py-2.5 rounded-full font-medium text-sm flex items-center gap-2 hover:bg-primary-container transition-all"
            href="/admin/recursos?upload=1"
          >
            <span
              className="material-symbols-outlined text-[20px]"
              data-icon="cloud_upload"
            >
              cloud_upload
            </span>
            Subir Recurso
          </Link>
          <Link
            className="bg-primary text-on-primary px-6 py-2.5 rounded-full font-medium text-sm flex items-center gap-2 hover:opacity-95 transition-all"
            href="/admin/recursos?assign=1"
          >
            <span
              className="material-symbols-outlined text-[20px]"
              data-icon="person_add"
            >
              person_add
            </span>
            Asignar a Paciente
          </Link>
        </div>
      </header>

      {/* Search and Filter Bar */}
      <section className="mb-12 flex items-center gap-6">
        <div className="relative flex-1">
          <span
            className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline"
            data-icon="search"
          >
            search
          </span>
          <input
            className="w-full pl-12 pr-4 py-3 bg-surface-container-low border-none focus:ring-2 focus:ring-primary-container rounded-xl text-sm transition-all placeholder:text-outline-variant"
            placeholder="Buscar ejercicios, lecturas o documentos..."
            type="text"
            disabled
          />
        </div>
        <div className="flex gap-2">
          <span className="px-4 py-2 bg-primary-container text-on-primary-container rounded-full text-xs font-semibold cursor-pointer">
            Todos ({total})
          </span>
          <span className="px-4 py-2 hover:bg-surface-container text-on-surface-variant rounded-full text-xs font-medium cursor-pointer transition-colors">
            PDF
          </span>
          <span className="px-4 py-2 hover:bg-surface-container text-on-surface-variant rounded-full text-xs font-medium cursor-pointer transition-colors">
            Audio
          </span>
          <span className="px-4 py-2 hover:bg-surface-container text-on-surface-variant rounded-full text-xs font-medium cursor-pointer transition-colors">
            Video
          </span>
        </div>
      </section>

      {/* Bento Grid */}
      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-serif text-2xl text-on-background flex items-center gap-3">
              Recursos
              <span className="text-xs font-sans font-normal bg-secondary-container px-2 py-0.5 rounded text-on-secondary-container">
                {loadError ? '—' : `${total} archivos`}
              </span>
            </h3>
            <button
              className="text-primary text-xs font-bold uppercase tracking-widest hover:underline disabled:opacity-50"
              type="button"
              disabled
            >
              Ver todo
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {loadError ? (
              <div className="sticker-border bg-white p-6 rounded-lg">
                <p className="text-sm text-on-surface-variant">—</p>
              </div>
            ) : recursosGenerales.length ? (
              recursosGenerales.map((r) => (
                <a
                  key={r.id}
                  className="sticker-border bg-white p-6 rounded-lg transition-transform hover:-rotate-1 cursor-pointer"
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <div className="flex justify-between items-start mb-4">
                    <span
                      className="material-symbols-outlined text-primary text-3xl"
                      data-icon="library_books"
                    >
                      library_books
                    </span>
                    <span
                      className="material-symbols-outlined text-outline-variant"
                      data-icon="open_in_new"
                    >
                      open_in_new
                    </span>
                  </div>
                  <h4 className="font-bold text-on-background mb-1">
                    {r.titulo || '—'}
                  </h4>
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-widest">
                    {r.tipo || '—'}
                  </p>
                </a>
              ))
            ) : (
              <div className="sticker-border bg-white p-6 rounded-lg">
                <p className="text-sm text-on-surface-variant">
                  No hay recursos.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 flex flex-col gap-8">
          <div className="bg-primary p-8 rounded-2xl text-on-primary relative overflow-hidden h-full flex flex-col justify-end">
            <div className="absolute top-0 right-0 p-4 opacity-20">
              <span
                className="material-symbols-outlined text-[120px]"
                data-icon="auto_awesome"
              >
                auto_awesome
              </span>
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] mb-4 opacity-80">
              Recomendación Semanal
            </p>
            <h4 className="font-serif text-2xl mb-4 leading-tight">
              {loadError ? '—' : 'Sin recomendaciones'}
            </h4>
            <p className="text-sm opacity-90 leading-relaxed mb-8">
              {loadError ? '—' : 'No hay recursos destacados.'}
            </p>
            <button
              className="bg-white text-primary px-6 py-3 rounded-xl font-bold text-sm w-fit hover:bg-primary-container transition-colors disabled:opacity-50"
              type="button"
              disabled
            >
              Revisar Recurso
            </button>
          </div>
        </div>

        <div className="col-span-12">
          <div className="flex items-center justify-between mb-8 border-b border-primary/5 pb-4">
            <h3 className="font-serif text-2xl text-on-background">
              Lecturas Recomendadas
            </h3>
            <div className="flex gap-2">
              <button
                className="p-2 rounded-full hover:bg-surface-container-high transition-colors disabled:opacity-50"
                type="button"
                disabled
              >
                <span
                  className="material-symbols-outlined"
                  data-icon="grid_view"
                >
                  grid_view
                </span>
              </button>
              <button
                className="p-2 rounded-full hover:bg-surface-container-high transition-colors disabled:opacity-50"
                type="button"
                disabled
              >
                <span
                  className="material-symbols-outlined"
                  data-icon="format_list_bulleted"
                >
                  format_list_bulleted
                </span>
              </button>
            </div>
          </div>

          {loadError ? (
            <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/10">
              <p className="text-sm text-on-surface-variant">—</p>
            </div>
          ) : lecturas.length ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {lecturas.map((r) => (
                <a
                  key={r.id}
                  className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/10 hover:bg-surface-container-low transition-colors"
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className="material-symbols-outlined text-tertiary"
                      data-icon="description"
                    >
                      description
                    </span>
                    <span
                      className="material-symbols-outlined text-outline-variant"
                      data-icon="open_in_new"
                    >
                      open_in_new
                    </span>
                  </div>
                  <h4 className="font-bold text-on-background mb-1">
                    {r.titulo || '—'}
                  </h4>
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-widest">
                    {r.tipo || '—'}
                  </p>
                </a>
              ))}
            </div>
          ) : (
            <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/10">
              <p className="text-sm text-on-surface-variant">
                No hay lecturas.
              </p>
            </div>
          )}
        </div>

        <div className="col-span-12">
          <div className="bg-surface-container-low p-8 rounded-3xl">
            <h3 className="font-serif text-2xl text-on-background mb-6">
              Consentimientos y Legal
            </h3>
            <div className="flex items-center justify-between gap-4 mb-4">
              <p className="text-sm text-on-surface-variant">
                {loadError
                  ? '—'
                  : 'Documentos legales para uso interno y consentimiento.'}
              </p>
              <Link
                className="bg-primary text-on-primary px-5 py-2.5 rounded-full font-medium text-xs flex items-center gap-2 hover:opacity-95 transition-all"
                href="/admin/recursos?upload=1&categoria=legal"
              >
                <span
                  className="material-symbols-outlined text-[18px]"
                  data-icon="upload_file"
                >
                  upload_file
                </span>
                Subir documento
              </Link>
            </div>

            {loadError ? (
              <p className="text-sm text-on-surface-variant">—</p>
            ) : legales.length ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {legales.map((r) => (
                  <a
                    key={r.id}
                    className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/10 hover:bg-surface-container-low transition-colors"
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="material-symbols-outlined text-tertiary"
                        data-icon="gavel"
                      >
                        gavel
                      </span>
                      <span
                        className="material-symbols-outlined text-outline-variant"
                        data-icon="open_in_new"
                      >
                        open_in_new
                      </span>
                    </div>
                    <p className="font-bold text-on-background">
                      {r.titulo || '—'}
                    </p>
                    <p className="text-[10px] text-on-surface-variant uppercase tracking-widest">
                      {r.tipo || '—'}
                    </p>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-on-surface-variant">
                No hay documentos.
              </p>
            )}
          </div>
        </div>
      </div>

      <footer className="mt-24 pt-12 border-t border-primary/5 text-center">
        <p className="text-xs text-outline font-serif italic">
          Repositorio de Recursos • Urban Sanctuary © 2024
        </p>
      </footer>

      {modalUploadAbierto ? (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <Link
            className="absolute inset-0 bg-black/20"
            href="/admin/recursos"
            aria-label="Cerrar"
          />
          <div className="relative w-full md:max-w-2xl bg-surface-container-lowest rounded-t-3xl md:rounded-3xl p-6 md:p-8 editorial-shadow">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-2">
                  {uploadCategoria === 'legal' ? 'Legal' : 'Repositorio'}
                </p>
                <h3 className="font-serif text-2xl text-primary">
                  {uploadCategoria === 'legal'
                    ? 'Subir documento'
                    : 'Subir recurso'}
                </h3>
              </div>
              <Link
                className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center hover:bg-surface-container-high transition-colors"
                href="/admin/recursos"
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
              action={uploadRecursoAction}
              encType="multipart/form-data"
              className="space-y-4"
            >
              <input
                type="hidden"
                name="categoria"
                value={uploadCategoria === 'legal' ? 'legal' : 'recurso'}
              />
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-outline">
                  Título
                </label>
                <input
                  className="w-full px-4 py-3 bg-surface-container-low border-none focus:ring-2 focus:ring-primary-container rounded-2xl text-sm"
                  name="titulo"
                  placeholder={
                    uploadCategoria === 'legal'
                      ? 'Ej: Consentimiento informado'
                      : 'Ej: Ejercicio respiración'
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-outline">
                  Archivo
                </label>
                <input
                  className="w-full px-4 py-3 bg-surface-container-low rounded-2xl text-sm"
                  name="file"
                  type="file"
                  required
                />
              </div>
              <div className="pt-2 flex items-center justify-end gap-3">
                <Link
                  className="px-5 py-3 rounded-2xl bg-surface-container hover:bg-surface-container-high transition-colors text-xs font-bold uppercase tracking-widest"
                  href="/admin/recursos"
                >
                  Cancelar
                </Link>
                <button
                  className="px-6 py-3 rounded-2xl bg-primary text-on-primary text-xs font-bold uppercase tracking-widest hover:opacity-95 transition-opacity"
                  type="submit"
                >
                  Subir
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {modalAssignAbierto ? (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <Link
            className="absolute inset-0 bg-black/20"
            href="/admin/recursos"
            aria-label="Cerrar"
          />
          <div className="relative w-full md:max-w-3xl bg-surface-container-lowest rounded-t-3xl md:rounded-3xl p-6 md:p-8 editorial-shadow">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-2">
                  Asignación
                </p>
                <h3 className="font-serif text-2xl text-primary">
                  Asignar a Paciente
                </h3>
              </div>
              <Link
                className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center hover:bg-surface-container-high transition-colors"
                href="/admin/recursos"
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <section className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-outline">
                  Buscar paciente
                </p>

                <form
                  action="/admin/recursos"
                  method="get"
                  className="flex gap-2"
                >
                  <input type="hidden" name="assign" value="1" />
                  <input
                    className="flex-1 px-4 py-3 bg-surface-container-low border-none focus:ring-2 focus:ring-primary-container rounded-2xl text-sm"
                    name="q"
                    defaultValue={q}
                    placeholder="Nombre, DNI o teléfono..."
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
                        <Link
                          key={p.id}
                          className={
                            p.id === selectedPacienteId
                              ? 'block bg-surface-container p-4 rounded-2xl ring-2 ring-primary/10'
                              : 'block bg-surface-container-low p-4 rounded-2xl hover:bg-surface-container transition-colors'
                          }
                          href={`/admin/recursos?assign=1&q=${encodeURIComponent(q)}&paciente=${encodeURIComponent(p.id)}`}
                        >
                          <p className="font-bold text-on-surface truncate">
                            {p.nombre_completo || '—'}
                          </p>
                          <p className="text-xs text-outline truncate">
                            {p.email || '—'}
                          </p>
                        </Link>
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
              </section>

              <section className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-outline">
                  Selección
                </p>

                <div className="bg-surface-container p-4 rounded-2xl ring-1 ring-outline-variant/10">
                  <p className="text-xs text-outline">Paciente</p>
                  <p className="font-bold text-on-surface mt-1">
                    {selectedPaciente ? selectedPaciente.nombre_completo : '—'}
                  </p>
                </div>

                <form action={asignarRecursoAction} className="space-y-4">
                  <input
                    type="hidden"
                    name="paciente_id"
                    value={selectedPacienteId}
                  />
                  <input type="hidden" name="q" value={q} />

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-outline">
                      Recurso
                    </label>
                    <select
                      className="w-full px-4 py-3 bg-surface-container-low border-none focus:ring-2 focus:ring-primary-container rounded-2xl text-sm"
                      name="recurso_id"
                      required
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Selecciona un recurso...
                      </option>
                      {recursos.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.titulo || '—'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-3">
                    <Link
                      className="px-5 py-3 rounded-2xl bg-surface-container hover:bg-surface-container-high transition-colors text-xs font-bold uppercase tracking-widest"
                      href="/admin/recursos"
                    >
                      Cancelar
                    </Link>
                    <button
                      className="px-6 py-3 rounded-2xl bg-primary text-on-primary text-xs font-bold uppercase tracking-widest hover:opacity-95 transition-opacity disabled:opacity-50"
                      type="submit"
                      disabled={!selectedPacienteId}
                    >
                      Asignar
                    </button>
                  </div>
                </form>
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
