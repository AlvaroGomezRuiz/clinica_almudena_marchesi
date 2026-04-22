import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

import {
  Chip,
  EmptyState,
  PageHeader,
  SectionDivider,
  SurfaceCard,
} from '@/components/portal-shell/ui';
import MarcarCompletadoButton from '@/components/portal/recursos/MarcarCompletadoButton';
import { createServerClient } from '@/lib/supabase/server';
import type { RecursoCategoria, RecursoTipo } from '@/lib/supabase/types';

export const metadata = { title: 'Recursos | Portal Paciente' };
export const dynamic = 'force-dynamic';

interface PageProps {
  readonly searchParams?: { readonly tab?: string };
}

interface AsignacionJoin {
  readonly id: string;
  readonly assigned_at: string;
  readonly completed_at: string | null;
  readonly recurso:
    | {
        readonly id: string;
        readonly titulo: string;
        readonly descripcion: string | null;
        readonly tipo: RecursoTipo;
        readonly categoria: RecursoCategoria;
        readonly mime_type: string | null;
        readonly size_bytes: number | null;
        readonly publico: boolean;
      }
    | null;
}

interface RecursoPublico {
  readonly id: string;
  readonly titulo: string;
  readonly descripcion: string | null;
  readonly tipo: RecursoTipo;
  readonly categoria: RecursoCategoria;
  readonly mime_type: string | null;
  readonly size_bytes: number | null;
  readonly created_at: string;
}

type Tab = 'asignados' | 'biblioteca' | 'legal';

const TABS: readonly { readonly id: Tab; readonly label: string; readonly icon: string }[] = [
  { id: 'asignados', label: 'Para ti', icon: 'assignment_ind' },
  { id: 'biblioteca', label: 'Biblioteca general', icon: 'menu_book' },
  { id: 'legal', label: 'Legal y RGPD', icon: 'verified_user' },
];

function iconForTipo(tipo: RecursoTipo | string): string {
  if (tipo.startsWith('audio')) return 'graphic_eq';
  if (tipo.startsWith('video')) return 'play_circle';
  if (tipo.startsWith('image')) return 'image';
  if (tipo.includes('pdf')) return 'picture_as_pdf';
  return 'description';
}

function formatBytes(n: number | null): string {
  if (!n || n <= 0) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function PortalRecursosPage({
  searchParams,
}: PageProps): Promise<JSX.Element | null> {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const active: Tab = TABS.some((t) => t.id === searchParams?.tab)
    ? (searchParams!.tab as Tab)
    : 'asignados';

  // Tab 1: asignaciones (RLS filtra por paciente_id = current_paciente_id())
  const { data: asignRaw } = await supabase
    .from('recurso_asignaciones')
    .select(
      'id, assigned_at, completed_at, recurso:recursos(id, titulo, descripcion, tipo, categoria, mime_type, size_bytes, publico)'
    )
    .eq('activo', true)
    .order('assigned_at', { ascending: false });

  const asignaciones =
    (asignRaw as unknown as readonly AsignacionJoin[] | null) ?? [];

  // Tab 2 + 3: biblioteca general (recursos públicos)
  const { data: publicosRaw } = await supabase
    .from('recursos')
    .select(
      'id, titulo, descripcion, tipo, categoria, mime_type, size_bytes, created_at'
    )
    .eq('publico', true)
    .eq('activo', true)
    .order('created_at', { ascending: false });

  const publicos = (publicosRaw as unknown as readonly RecursoPublico[] | null) ?? [];

  // Heurística legal: títulos que empiecen por palabras clave del ámbito RGPD.
  const legalRegex = /(rgpd|lopd|aviso legal|privacidad|condiciones|consentimiento|cookies)/i;
  const legales = publicos.filter((r) => legalRegex.test(r.titulo));
  const biblioteca = publicos.filter((r) => !legalRegex.test(r.titulo));

  const Counter = ({ n }: { n: number }): JSX.Element => (
    <span className="ml-1.5 rounded-full bg-white/70 px-1.5 py-0.5 font-body text-[0.6rem] tabular-nums text-ink-soft ring-1 ring-inset ring-ink/8 dark:bg-white/10 dark:text-white/60 dark:ring-white/15">
      {n}
    </span>
  );

  const counts: Record<Tab, number> = {
    asignados: asignaciones.length,
    biblioteca: biblioteca.length,
    legal: legales.length,
  };

  return (
    <>
      <PageHeader
        eyebrow="Recursos"
        title="Tus recursos y biblioteca"
        description="Guías, ejercicios y documentos. Lo asignado está marcado como tal; el resto es biblioteca abierta."
      />

      <nav
        className="mb-6 flex flex-wrap gap-2"
        role="tablist"
        aria-label="Categorías de recursos"
      >
        {TABS.map((t) => {
          const isActive = t.id === active;
          return (
            <Link
              key={t.id}
              href={`/portal/recursos?tab=${t.id}`}
              role="tab"
              aria-selected={isActive}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 font-body text-[0.82rem] transition ${
                isActive
                  ? 'bg-primary text-on-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_8px_20px_-10px_rgba(75,100,95,0.4)]'
                  : 'bg-white/60 text-ink-soft ring-1 ring-inset ring-white/50 hover:bg-white/85 hover:text-ink dark:bg-white/5 dark:text-white/60 dark:ring-white/10 dark:hover:bg-white/10 dark:hover:text-white'
              }`}
            >
              <span
                className="material-symbols-outlined text-[1rem]"
                aria-hidden="true"
              >
                {t.icon}
              </span>
              {t.label}
              <Counter n={counts[t.id]} />
            </Link>
          );
        })}
      </nav>

      {active === 'asignados' ? (
        asignaciones.length === 0 ? (
          <EmptyState
            icon="assignment_ind"
            title="Aún no tienes recursos asignados"
            description="Cuando Almudena te comparta material específico, aparecerá aquí."
          />
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {asignaciones
              .filter((a) => a.recurso)
              .map((a) => {
                const r = a.recurso!;
                const isCompleted = Boolean(a.completed_at);
                return (
                  <SurfaceCard key={a.id} interactive glow="sage">
                    <header className="mb-3 flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={`grid h-11 w-11 place-items-center rounded-2xl ring-1 ring-inset ${
                            isCompleted
                              ? 'bg-primary/20 ring-primary/30 dark:bg-primary/30 dark:ring-primary/45'
                              : 'bg-primary/10 ring-primary/15 dark:bg-primary/20 dark:ring-primary/30'
                          }`}
                        >
                          <span
                            className="material-symbols-outlined text-primary"
                            aria-hidden="true"
                          >
                            {iconForTipo(r.tipo)}
                          </span>
                        </span>
                        <div className="flex flex-col gap-1">
                          <Chip tone="info">{r.categoria}</Chip>
                          {isCompleted ? (
                            <Chip tone="positive">Completado</Chip>
                          ) : null}
                        </div>
                      </div>
                      <p className="font-body text-[0.7rem] text-ink-muted tabular-nums dark:text-white/55">
                        {format(new Date(a.assigned_at), 'd MMM', { locale: es })}
                      </p>
                    </header>

                    <h3
                      className={`font-display text-[1.15rem] italic ${
                        isCompleted
                          ? 'text-ink-soft line-through decoration-ink/25 decoration-1 dark:text-white/60'
                          : 'text-ink dark:text-white'
                      }`}
                    >
                      {r.titulo}
                    </h3>
                    {r.descripcion ? (
                      <p className="mt-2 line-clamp-3 font-body text-[0.85rem] text-ink-soft dark:text-white/65">
                        {r.descripcion}
                      </p>
                    ) : null}

                    <footer className="mt-5 flex flex-wrap items-center justify-between gap-3">
                      <p className="font-body text-[0.7rem] text-ink-muted dark:text-white/55">
                        {isCompleted && a.completed_at
                          ? `Completado ${formatDistanceToNow(new Date(a.completed_at), { locale: es, addSuffix: true })}`
                          : `Asignado ${formatDistanceToNow(new Date(a.assigned_at), { locale: es, addSuffix: true })}`}
                        {r.size_bytes ? ` · ${formatBytes(r.size_bytes)}` : ''}
                      </p>
                      <div className="flex items-center gap-2">
                        <MarcarCompletadoButton
                          asignacionId={a.id}
                          initialCompleted={isCompleted}
                        />
                        <a
                          href={`/api/portal/recursos/download/${r.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 font-body text-[0.78rem] text-on-primary transition hover:bg-primary-dim"
                        >
                          <span
                            className="material-symbols-outlined text-[1rem]"
                            aria-hidden="true"
                          >
                            download
                          </span>
                          Abrir
                        </a>
                      </div>
                    </footer>
                  </SurfaceCard>
                );
              })}
          </div>
        )
      ) : null}

      {active === 'biblioteca' ? (
        biblioteca.length === 0 ? (
          <EmptyState
            icon="menu_book"
            title="Biblioteca en construcción"
            description="Almudena irá publicando guías abiertas que cualquier paciente puede consultar."
          />
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {biblioteca.map((r) => (
              <SurfaceCard key={r.id} interactive glow="warm">
                <header className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 ring-1 ring-inset ring-primary/15 dark:bg-primary/20 dark:ring-primary/30">
                      <span
                        className="material-symbols-outlined text-primary"
                        aria-hidden="true"
                      >
                        {iconForTipo(r.tipo)}
                      </span>
                    </span>
                    <Chip tone="neutral">{r.categoria}</Chip>
                  </div>
                </header>
                <h3 className="font-display text-[1.1rem] italic text-ink dark:text-white">
                  {r.titulo}
                </h3>
                {r.descripcion ? (
                  <p className="mt-2 line-clamp-3 font-body text-[0.85rem] text-ink-soft dark:text-white/65">
                    {r.descripcion}
                  </p>
                ) : null}
                <footer className="mt-5 flex items-center justify-between gap-3">
                  <p className="font-body text-[0.7rem] text-ink-muted dark:text-white/55">
                    Publicado{' '}
                    {formatDistanceToNow(new Date(r.created_at), {
                      locale: es,
                      addSuffix: true,
                    })}
                    {r.size_bytes ? ` · ${formatBytes(r.size_bytes)}` : ''}
                  </p>
                  <a
                    href={`/api/portal/recursos/download/${r.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5 font-body text-[0.78rem] text-ink ring-1 ring-inset ring-ink/10 transition hover:bg-white dark:bg-white/10 dark:text-white dark:ring-white/15 dark:hover:bg-white/15"
                  >
                    <span
                      className="material-symbols-outlined text-[1rem]"
                      aria-hidden="true"
                    >
                      open_in_new
                    </span>
                    Abrir
                  </a>
                </footer>
              </SurfaceCard>
            ))}
          </div>
        )
      ) : null}

      {active === 'legal' ? (
        <>
          <SectionDivider label="Documentos legales y RGPD" />
          {legales.length === 0 ? (
            <EmptyState
              icon="verified_user"
              title="Sin documentos legales publicados"
              description="Consulta aquí el aviso de protección de datos y las condiciones cuando estén disponibles."
            />
          ) : (
            <ul className="space-y-3">
              {legales.map((r) => (
                <li key={r.id}>
                  <a
                    href={`/api/portal/recursos/download/${r.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-4 rounded-2xl bg-white/60 p-4 ring-1 ring-inset ring-ink/5 transition hover:bg-white/85 dark:bg-white/5 dark:ring-white/10 dark:hover:bg-white/10"
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 ring-1 ring-inset ring-primary/15 dark:bg-primary/25 dark:ring-primary/30">
                        <span
                          className="material-symbols-outlined text-primary"
                          aria-hidden="true"
                        >
                          picture_as_pdf
                        </span>
                      </span>
                      <div>
                        <p className="font-display text-[1rem] italic text-ink dark:text-white">
                          {r.titulo}
                        </p>
                        {r.descripcion ? (
                          <p className="mt-0.5 line-clamp-1 font-body text-[0.78rem] text-ink-soft dark:text-white/60">
                            {r.descripcion}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <span
                      className="material-symbols-outlined text-ink-muted dark:text-white/55"
                      aria-hidden="true"
                    >
                      arrow_outward
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </>
  );
}
