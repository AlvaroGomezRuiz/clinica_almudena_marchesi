import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import {
  Button,
  Chip,
  EmptyState,
  PageHeader,
  SurfaceCard,
} from '@/components/portal-shell/ui';
import { createServerClient } from '@/lib/supabase/server';

export const metadata = { title: 'Recursos | Portal Paciente' };
export const dynamic = 'force-dynamic';

interface AsignacionRow {
  id: string;
  asignado_en: string;
  nota_admin: string | null;
  recurso: {
    id: string;
    titulo: string;
    descripcion: string | null;
    tipo: string;
    storage_path: string;
  } | null;
}

export default async function PortalRecursosPage() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: asignRaw } = await supabase
    .from('recurso_asignaciones')
    .select('id, asignado_en, nota_admin, recurso:recursos(id, titulo, descripcion, tipo, storage_path)')
    .eq('paciente_user_id', user.id)
    .order('asignado_en', { ascending: false });

  const asignaciones = (asignRaw as unknown as AsignacionRow[] | null) ?? [];

  return (
    <>
      <PageHeader
        eyebrow={`${asignaciones.length} recurso${asignaciones.length === 1 ? '' : 's'} para ti`}
        title="Tus recursos"
        description="Guías, audios y ejercicios compartidos por Almudena para tu proceso."
      />

      {asignaciones.length === 0 ? (
        <EmptyState
          icon="library_books"
          title="Aún no tienes recursos asignados"
          description="Cuando Almudena te comparta material, lo encontrarás aquí."
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {asignaciones
            .filter((a) => a.recurso)
            .map((a) => {
              const r = a.recurso!;
              const icon = r.tipo.startsWith('audio')
                ? 'music_note'
                : r.tipo.startsWith('image')
                  ? 'image'
                  : 'description';
              return (
                <SurfaceCard key={a.id} interactive>
                  <header className="mb-3 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                        <span className="material-symbols-outlined text-primary" aria-hidden="true">
                          {icon}
                        </span>
                      </span>
                      <Chip tone="info">{r.tipo.split('/')[1] ?? 'Recurso'}</Chip>
                    </div>
                    <p className="font-body text-[0.7rem] text-ink-muted">
                      {format(new Date(a.asignado_en), 'd MMM', { locale: es })}
                    </p>
                  </header>

                  <h3 className="font-display text-[1.15rem] italic text-ink">{r.titulo}</h3>
                  {r.descripcion ? (
                    <p className="mt-2 line-clamp-3 font-body text-[0.85rem] text-ink-soft">
                      {r.descripcion}
                    </p>
                  ) : null}

                  {a.nota_admin ? (
                    <blockquote className="mt-4 rounded-xl bg-primary/5 p-3 font-body text-[0.8rem] italic text-primary-dim">
                      “{a.nota_admin}”
                    </blockquote>
                  ) : null}

                  <footer className="mt-5">
                    <Button variant="primary" size="sm" icon="download">
                      Descargar
                    </Button>
                  </footer>
                </SurfaceCard>
              );
            })}
        </div>
      )}
    </>
  );
}
