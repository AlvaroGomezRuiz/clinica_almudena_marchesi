import Link from 'next/link';
import { notFound } from 'next/navigation';

import RecursoEmbeddedViewer from '@/components/recursos/RecursoEmbeddedViewer';
import { PageHeader } from '@/components/portal-shell/ui';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface PageProps {
  readonly params: Promise<{ readonly id: string }>;
}

const UUID_RE = /^[0-9a-f-]{36}$/i;

export default async function AdminRecursoVerPage({
  params,
}: PageProps): Promise<JSX.Element> {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle<{ role: 'admin' | 'paciente' }>();
  if (profile?.role !== 'admin') notFound();

  const { data: rec, error } = await supabase
    .from('recursos')
    .select('titulo, descripcion, tipo, storage_path, external_url')
    .eq('id', id)
    .eq('activo', true)
    .maybeSingle<{
      titulo: string;
      descripcion: string | null;
      tipo: string;
      storage_path: string | null;
      external_url: string | null;
    }>();

  if (error || !rec) notFound();

  if (rec.external_url) {
    return (
      <>
        <PageHeader
          eyebrow="Recurso"
          title={rec.titulo}
          description={rec.descripcion ?? 'Enlace externo'}
        />
        <p className="mb-4 font-body text-[0.9rem] text-ink-soft dark:text-white/65">
          Este recurso apunta fuera de la biblioteca interna.
        </p>
        <a
          href={rec.external_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 font-body text-[0.85rem] text-on-primary"
        >
          Abrir enlace
        </a>
        <div className="mt-8">
          <Link
            href="/admin/recursos"
            className="font-body text-[0.82rem] text-primary underline-offset-4 hover:underline dark:text-primary-fixed-dim"
          >
            ← Volver a recursos
          </Link>
        </div>
      </>
    );
  }

  if (!rec.storage_path) notFound();

  const { data: signed, error: sErr } = await supabase.storage
    .from('recursos')
    .createSignedUrl(rec.storage_path, 3600);

  if (sErr || !signed?.signedUrl) notFound();

  return (
    <>
      <PageHeader
        eyebrow="Vista previa"
        title={rec.titulo}
        description={rec.descripcion ?? undefined}
        actions={
          <Link href="/admin/recursos">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5 font-body text-[0.78rem] text-ink ring-1 ring-inset ring-ink/10 transition hover:bg-white dark:bg-white/10 dark:text-white dark:ring-white/15 dark:hover:bg-white/15">
              ← Biblioteca
            </span>
          </Link>
        }
      />

      <div className="portal-rise mt-6">
        <RecursoEmbeddedViewer
          titulo={rec.titulo}
          tipo={rec.tipo}
          signedUrl={signed.signedUrl}
        />
      </div>
    </>
  );
}
