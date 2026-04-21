import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import {
  Button,
  Chip,
  EmptyState,
  PageHeader,
  SurfaceCard,
} from '@/components/portal-shell/ui';
import { RecursoAssignButton } from '@/components/recursos/RecursoAssignButton';
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
}

function filesize(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function iconForTipo(tipo: string): string {
  switch (tipo) {
    case 'audio': return 'music_note';
    case 'video': return 'movie';
    case 'imagen': return 'image';
    case 'pdf': return 'picture_as_pdf';
    case 'enlace': return 'link';
    default: return 'description';
  }
}

export default async function AdminRecursosPage() {
  const supabase = createServerClient();

  const { data: recursosRaw, count } = await supabase
    .from('recursos')
    .select('id, titulo, descripcion, tipo, categoria, size_bytes, created_at', {
      count: 'exact',
    })
    .eq('activo', true)
    .order('created_at', { ascending: false })
    .limit(50);

  const recursos = (recursosRaw as RecursoRow[] | null) ?? [];

  return (
    <>
      <PageHeader
        eyebrow={`${count ?? 0} recursos disponibles`}
        title="Biblioteca de recursos"
        description="Guías, audios, plantillas y ejercicios que puedes asignar a tus pacientes."
        actions={
          <Button variant="primary" icon="upload">Subir recurso</Button>
        }
      />

      {recursos.length === 0 ? (
        <EmptyState
          icon="folder_open"
          title="Tu biblioteca está vacía"
          description="Sube PDFs, audios MP3 o documentos para poder asignarlos a pacientes."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {recursos.map((r) => (
            <SurfaceCard key={r.id} interactive>
              <header className="mb-3 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <span className="material-symbols-outlined text-primary" aria-hidden="true">
                      {iconForTipo(r.tipo)}
                    </span>
                  </span>
                  <Chip tone="info">{r.tipo}</Chip>
                </div>
                <p className="font-body text-[0.7rem] text-ink-muted">
                  {filesize(r.size_bytes)}
                </p>
              </header>

              <h3 className="font-display text-[1.05rem] italic text-ink">{r.titulo}</h3>
              {r.descripcion ? (
                <p className="mt-2 line-clamp-2 font-body text-[0.85rem] text-ink-soft">
                  {r.descripcion}
                </p>
              ) : null}

              <footer className="mt-4 flex items-center justify-between">
                <p className="font-body text-[0.7rem] text-ink-muted">
                  {format(new Date(r.created_at), "d MMM yyyy", { locale: es })}
                </p>
                <RecursoAssignButton recursoId={r.id} recursoTitulo={r.titulo} />
              </footer>
            </SurfaceCard>
          ))}
        </div>
      )}
    </>
  );
}
