import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

import {
  Chip,
  EmptyState,
  PageHeader,
  SurfaceCard,
} from '@/components/portal-shell/ui';
import { RecursoAssignButton } from '@/components/recursos/RecursoAssignButton';
import UploadRecursoButton from '@/components/admin/recursos/UploadRecursoButton';
import { createServerClient } from '@/lib/supabase/server';

export const metadata = { title: 'Recursos | Panel Almudena' };
export const dynamic = 'force-dynamic';

interface RecursoRow {
  id: string;
  titulo: string;
  descripcion: string | null;
  tipo: string;
  categoria: string;
  size_bytes: number | null;
  created_at: string;
  storage_path: string | null;
  external_url: string | null;
}

const TABS = [
  { id: 'todos', label: 'Todos', categoria: null as string | null },
  { id: 'tarea', label: 'Tareas', categoria: 'tarea' },
  { id: 'lectura', label: 'Lecturas', categoria: 'lectura' },
  { id: 'ejercicio', label: 'Ejercicios', categoria: 'ejercicio' },
  { id: 'evaluacion', label: 'Evaluaciones', categoria: 'evaluacion' },
  { id: 'recurso', label: 'Generales', categoria: 'recurso' },
] as const;

function filesize(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function iconForTipo(tipo: string): string {
  switch (tipo) {
    case 'audio':
      return 'music_note';
    case 'video':
      return 'movie';
    case 'imagen':
      return 'image';
    case 'pdf':
      return 'picture_as_pdf';
    case 'enlace':
      return 'link';
    default:
      return 'description';
  }
}

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function AdminRecursosPage({
  searchParams,
}: PageProps): Promise<JSX.Element> {
  const { tab = 'todos' } = await searchParams;
  const activeTab = TABS.find((t) => t.id === tab) ?? TABS[0];
  const supabase = createServerClient();

  let q = supabase
    .from('recursos')
    .select(
      'id, titulo, descripcion, tipo, categoria, size_bytes, created_at, storage_path, external_url',
      { count: 'exact' }
    )
    .eq('activo', true)
    .order('created_at', { ascending: false })
    .limit(50);

  if (activeTab.categoria) {
    q = q.eq(
      'categoria',
      activeTab.categoria as 'tarea' | 'lectura' | 'ejercicio' | 'evaluacion' | 'recurso'
    );
  }

  const { data: recursosRaw, count } = await q;
  const recursos = (recursosRaw as RecursoRow[] | null) ?? [];

  // Contadores por categoría para las pestañas
  const { data: countsRaw } = await supabase
    .from('recursos')
    .select('categoria')
    .eq('activo', true);

  const counts = new Map<string, number>();
  let total = 0;
  for (const r of (countsRaw as { categoria: string }[] | null) ?? []) {
    counts.set(r.categoria, (counts.get(r.categoria) ?? 0) + 1);
    total += 1;
  }

  // Contador de asignaciones por recurso (Almudena quiere saber dónde está
  // usándose cada recurso). Una sola query que agrupamos en memoria.
  const { data: asignacionesRaw } = await supabase
    .from('recurso_asignaciones')
    .select('recurso_id, completed_at')
    .eq('activo', true);

  const asignadosMap = new Map<string, { total: number; completados: number }>();
  for (const a of (asignacionesRaw as {
    recurso_id: string | null;
    completed_at: string | null;
  }[] | null) ?? []) {
    if (!a.recurso_id) continue;
    const prev = asignadosMap.get(a.recurso_id) ?? { total: 0, completados: 0 };
    prev.total += 1;
    if (a.completed_at) prev.completados += 1;
    asignadosMap.set(a.recurso_id, prev);
  }

  return (
    <>
      <PageHeader
        eyebrow={`${count ?? 0} / ${total} recursos`}
        title="Biblioteca de recursos"
        description="Guías, audios, plantillas y ejercicios que puedes asignar a tus pacientes."
        actions={<UploadRecursoButton />}
      />

      {/* ─── Tabs ─── */}
      <nav
        className="mb-6 flex flex-wrap gap-2 portal-rise"
        aria-label="Filtrar recursos por categoría"
      >
        {TABS.map((t) => {
          const isActive = t.id === activeTab.id;
          const n = t.categoria === null ? total : counts.get(t.categoria) ?? 0;
          return (
            <Link
              key={t.id}
              href={`/admin/recursos?tab=${t.id}`}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 font-body text-[0.82rem] ring-1 ring-inset transition ${
                isActive
                  ? 'bg-ink text-canvas ring-ink/60 dark:bg-white dark:text-ink dark:ring-white/40'
                  : 'bg-white/50 text-ink ring-ink/8 hover:bg-white/70 dark:bg-white/5 dark:text-white dark:ring-white/10 dark:hover:bg-white/10'
              }`}
            >
              {t.label}
              <span
                className={`rounded-full px-1.5 text-[0.68rem] tabular-nums ${
                  isActive
                    ? 'bg-canvas/20 text-canvas dark:bg-ink/20 dark:text-ink'
                    : 'bg-ink/10 text-ink-muted dark:bg-white/10 dark:text-white/60'
                }`}
              >
                {n}
              </span>
            </Link>
          );
        })}
      </nav>

      {recursos.length === 0 ? (
        <EmptyState
          icon="folder_open"
          title="Sin recursos en esta categoría"
          description={
            activeTab.categoria
              ? `Ningún recurso está clasificado como "${activeTab.label}".`
              : 'Sube PDFs, audios MP3 o documentos para poder asignarlos a pacientes.'
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {recursos.map((r) => {
            const uso = asignadosMap.get(r.id);
            const asignadosN = uso?.total ?? 0;
            const completadosN = uso?.completados ?? 0;
            return (
              <SurfaceCard key={r.id} interactive>
                <header className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 dark:bg-primary/25">
                      <span
                        className="material-symbols-outlined text-primary dark:text-white"
                        aria-hidden="true"
                      >
                        {iconForTipo(r.tipo)}
                      </span>
                    </span>
                    <div className="flex flex-col gap-1">
                      <Chip tone="info">{r.tipo}</Chip>
                      <Chip tone="neutral">{r.categoria}</Chip>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-body text-[0.7rem] text-ink-muted dark:text-white/55">
                      {filesize(r.size_bytes)}
                    </p>
                    {asignadosN > 0 ? (
                      <p
                        className="mt-1 font-body text-[0.7rem] font-semibold text-primary dark:text-primary-fixed-dim"
                        title={`${completadosN} completados de ${asignadosN}`}
                      >
                        {asignadosN} asignado{asignadosN === 1 ? '' : 's'}
                        {completadosN > 0 ? ` · ${completadosN} ✓` : ''}
                      </p>
                    ) : null}
                  </div>
                </header>

                <h3 className="font-display text-[1.05rem] italic text-ink dark:text-white">
                  {r.titulo}
                </h3>
                {r.descripcion ? (
                  <p className="mt-2 line-clamp-2 font-body text-[0.85rem] text-ink-soft dark:text-white/60">
                    {r.descripcion}
                  </p>
                ) : null}

                <footer className="mt-4 flex items-center justify-between">
                  <p className="font-body text-[0.7rem] text-ink-muted dark:text-white/55">
                    {format(new Date(r.created_at), 'd MMM yyyy', { locale: es })}
                  </p>
                  <RecursoAssignButton recursoId={r.id} recursoTitulo={r.titulo} />
                </footer>
              </SurfaceCard>
            );
          })}
        </div>
      )}
    </>
  );
}
