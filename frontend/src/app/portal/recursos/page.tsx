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
import RealtimeRefresh from '@/components/realtime/RealtimeRefresh';
import { createServerClient } from '@/lib/supabase/server';
import type { RecursoCategoria, RecursoTipo } from '@/lib/supabase/types';

export const metadata = { title: 'Recursos | Portal Paciente' };
export const dynamic = 'force-dynamic';

interface PageProps {
  readonly searchParams: Promise<{ readonly tab?: string }>;
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
        readonly storage_path: string | null;
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
  readonly storage_path: string | null;
}

type Tab = 'asignados' | 'biblioteca' | 'legal';

const TABS: readonly { readonly id: Tab; readonly label: string; readonly icon: string }[] = [
  { id: 'asignados', label: 'Para ti', icon: 'assignment_ind' },
  { id: 'biblioteca', label: 'Biblioteca general', icon: 'menu_book' },
  { id: 'legal', label: 'Legal y RGPD', icon: 'verified_user' },
];

function iconForTipo(tipo: RecursoTipo | string): string {
  const t = String(tipo).toLowerCase();
  if (t === 'audio' || t.startsWith('audio')) return 'graphic_eq';
  if (t === 'video' || t.startsWith('video')) return 'play_circle';
  if (t === 'imagen' || t.startsWith('image')) return 'image';
  if (t.includes('pdf')) return 'picture_as_pdf';
  return 'description';
}

function formatBytes(n: number | null): string {
  if (!n || n <= 0) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function isTabId(value: string | undefined): value is Tab {
  return value === 'asignados' || value === 'biblioteca' || value === 'legal';
}

export default async function PortalRecursosPage({
  searchParams,
}: PageProps): Promise<JSX.Element | null> {
  const { tab: tabParam } = await searchParams;
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: pacRow } = await supabase
    .from('pacientes')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle<{ id: string }>();
  const pacienteId = pacRow?.id ?? null;

  const active: Tab = isTabId(tabParam) ? tabParam : 'asignados';

  // Tab 1: asignaciones (RLS filtra por paciente_id = current_paciente_id())
  const { data: asignRaw } = await supabase
    .from('recurso_asignaciones')
    .select(
      'id, assigned_at, completed_at, recurso:recursos(id, titulo, descripcion, tipo, categoria, mime_type, size_bytes, publico, storage_path)'
    )
    .eq('activo', true)
    .order('assigned_at', { ascending: false });

  const asignaciones =
    (asignRaw as unknown as readonly AsignacionJoin[] | null) ?? [];

  // Tab 2 + 3: biblioteca general (recursos públicos)
  const { data: publicosRaw } = await supabase
    .from('recursos')
    .select(
      'id, titulo, descripcion, tipo, categoria, mime_type, size_bytes, created_at, storage_path'
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

  const portadaKicker: Record<Tab, string> = {
    asignados: 'Material enviado por tu psicóloga',
    biblioteca: 'Guías y ejercicios para tod@s',
    legal: 'Transparencia y protección de datos',
  };
  const portadaTitle: Record<Tab, string> = {
    asignados: 'Recursos asignados para ti',
    biblioteca: 'Biblioteca general',
    legal: 'Documentos legales y RGPD',
  };
  const portadaBody: Record<Tab, string> = {
    asignados:
      'Abre cada tarjeta en el visor integrado (PDF, imagen, audio o vídeo) o descarga el archivo. Marca «Completado» cuando lo hayas trabajado.',
    biblioteca:
      'Contenido abierto para cualquier paciente. El mismo visor te permite leer o escuchar sin salir de la app.',
    legal:
      'Información sobre privacidad y condiciones. Puedes abrirla aquí o descargar en PDF según el documento.',
  };

  return (
    <>
      {pacienteId ? (
        <RealtimeRefresh
          channelName={`portal-recursos-asig-${pacienteId}`}
          tables={['recurso_asignaciones']}
          filter={`paciente_id=eq.${pacienteId}`}
        />
      ) : null}
      <RealtimeRefresh
        channelName="portal-recursos-publicos"
        tables={['recursos']}
        filter="publico=eq.true"
      />
      <PageHeader
        eyebrow="Recursos"
        title="Tus recursos y biblioteca"
        description="Guías, ejercicios y documentos. Lo asignado está marcado como tal; el resto es biblioteca abierta."
      />

      <section
        className="portal-rise mb-6 rounded-3xl border border-ink/5 bg-gradient-to-br from-white/90 via-white/55 to-primary/[0.08] p-5 shadow-[0_12px_40px_-24px_rgba(28,28,25,0.35)] dark:border-white/10 dark:from-white/[0.09] dark:via-white/[0.04] dark:to-primary/[0.12]"
        aria-label="Resumen de la sección"
      >
        <p className="font-body text-[0.65rem] uppercase tracking-[0.2em] text-ink-muted dark:text-white/50">
          {portadaKicker[active]}
        </p>
        <h2 className="mt-1 font-display text-[1.2rem] italic text-ink tracking-[-0.02em] dark:text-white">
          {portadaTitle[active]}
        </h2>
        <p className="mt-2 max-w-2xl font-body text-[0.88rem] leading-relaxed text-ink-soft dark:text-white/70">
          {portadaBody[active]}
        </p>
        <ul className="mt-4 flex flex-wrap gap-3" aria-label="Resumen por pestaña">
          {TABS.map((t) => {
            const isThis = t.id === active;
            return (
              <li
                key={t.id}
                className={`inline-flex min-h-11 min-w-0 max-w-full items-center gap-2 rounded-2xl px-3 py-1.5 ring-1 ring-inset sm:min-h-0 ${
                  isThis
                    ? 'bg-primary/15 text-ink dark:bg-primary/20 dark:text-white'
                    : 'bg-white/60 text-ink-muted ring-ink/8 dark:bg-white/5 dark:text-white/55 dark:ring-white/10'
                }`}
              >
                <span className="material-symbols-outlined text-[1rem] shrink-0" aria-hidden="true">
                  {t.icon}
                </span>
                <div className="min-w-0">
                  <p className="font-body text-[0.6rem] uppercase tracking-wide text-ink-muted dark:text-white/50">
                    {t.label}
                  </p>
                  <p className="font-body text-[0.85rem] font-semibold tabular-nums text-ink dark:text-white">
                    {counts[t.id]}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

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
          <div className="space-y-6">
            <div
              className="rounded-3xl border border-ink/5 bg-gradient-to-br from-white/90 to-white/40 p-5 shadow-[0_8px_30px_-18px_rgba(28,28,25,0.25)] dark:border-white/10 dark:from-white/[0.07] dark:to-white/[0.02]"
              role="region"
              aria-label="Lectura recomendada"
            >
              <p className="font-body text-[0.65rem] uppercase tracking-[0.2em] text-ink-muted dark:text-white/50">
                Asignado para ti
              </p>
              <p className="mt-1 font-body text-[0.9rem] leading-relaxed text-ink-soft dark:text-white/70">
                El material más reciente va primero. Marca &quot;Completado&quot; cuando
                lo hayas trabajado; puedes abrir o descargar cada recurso con el botón
                principal.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-2">
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

                    {r.tipo === 'imagen' && r.storage_path ? (
                      <div className="mb-3 aspect-[16/10] max-h-44 w-full overflow-hidden rounded-2xl bg-ink/[0.06] ring-1 ring-inset ring-ink/8 dark:bg-white/5 dark:ring-white/10">
                        {/* eslint-disable-next-line @next/next/no-img-element -- API portal firma vía redirect */}
                        <img
                          src={`/api/portal/recursos/download/${r.id}`}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : null}

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
                      <div className="flex flex-wrap items-center gap-2">
                        <MarcarCompletadoButton
                          asignacionId={a.id}
                          initialCompleted={isCompleted}
                        />
                        <Link
                          href={`/portal/recursos/ver/${r.id}`}
                          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 font-body text-[0.78rem] text-on-primary transition hover:bg-primary-dim"
                        >
                          <span
                            className="material-symbols-outlined text-[1rem]"
                            aria-hidden="true"
                          >
                            visibility
                          </span>
                          Ver aquí
                        </Link>
                        <a
                          href={`/api/portal/recursos/download/${r.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 font-body text-[0.78rem] text-ink ring-1 ring-inset ring-ink/12 transition hover:bg-white dark:bg-white/10 dark:text-white dark:ring-white/15 dark:hover:bg-white/15"
                        >
                          <span
                            className="material-symbols-outlined text-[1rem]"
                            aria-hidden="true"
                          >
                            download
                          </span>
                          Descargar
                        </a>
                      </div>
                    </footer>
                  </SurfaceCard>
                );
              })}
          </div>
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
                {r.tipo === 'imagen' && r.storage_path ? (
                  <div className="mb-3 aspect-[16/10] max-h-44 w-full overflow-hidden rounded-2xl bg-ink/[0.06] ring-1 ring-inset ring-ink/8 dark:bg-white/5 dark:ring-white/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/portal/recursos/download/${r.id}`}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : null}

                <h3 className="font-display text-[1.1rem] italic text-ink dark:text-white">
                  {r.titulo}
                </h3>
                {r.descripcion ? (
                  <p className="mt-2 line-clamp-3 font-body text-[0.85rem] text-ink-soft dark:text-white/65">
                    {r.descripcion}
                  </p>
                ) : null}
                <footer className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <p className="font-body text-[0.7rem] text-ink-muted dark:text-white/55">
                    Publicado{' '}
                    {formatDistanceToNow(new Date(r.created_at), {
                      locale: es,
                      addSuffix: true,
                    })}
                    {r.size_bytes ? ` · ${formatBytes(r.size_bytes)}` : ''}
                  </p>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Link
                      href={`/portal/recursos/ver/${r.id}`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 font-body text-[0.78rem] text-on-primary transition hover:bg-primary-dim"
                    >
                      <span
                        className="material-symbols-outlined text-[1rem]"
                        aria-hidden="true"
                      >
                        visibility
                      </span>
                      Ver aquí
                    </Link>
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
                        download
                      </span>
                      Descargar
                    </a>
                  </div>
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
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/60 p-4 ring-1 ring-inset ring-ink/5 dark:bg-white/5 dark:ring-white/10">
                    <Link
                      href={`/portal/recursos/ver/${r.id}`}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left transition hover:opacity-90"
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 ring-1 ring-inset ring-primary/15 dark:bg-primary/25 dark:ring-primary/30">
                        <span
                          className="material-symbols-outlined text-primary"
                          aria-hidden="true"
                        >
                          picture_as_pdf
                        </span>
                      </span>
                      <div className="min-w-0">
                        <p className="font-display text-[1rem] italic text-ink dark:text-white">
                          {r.titulo}
                        </p>
                        {r.descripcion ? (
                          <p className="mt-0.5 line-clamp-1 font-body text-[0.78rem] text-ink-soft dark:text-white/60">
                            {r.descripcion}
                          </p>
                        ) : null}
                      </div>
                      <span
                        className="material-symbols-outlined shrink-0 text-ink-muted dark:text-white/55"
                        aria-hidden="true"
                      >
                        chevron_right
                      </span>
                    </Link>
                    <div className="flex shrink-0 items-center gap-2">
                      <a
                        href={`/api/portal/recursos/download/${r.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-full bg-white/80 px-3 py-1.5 font-body text-[0.72rem] text-ink ring-1 ring-inset ring-ink/10 transition hover:bg-white dark:bg-white/10 dark:text-white dark:ring-white/15 dark:hover:bg-white/15"
                      >
                        <span className="material-symbols-outlined text-[1rem]" aria-hidden="true">
                          download
                        </span>
                        PDF
                      </a>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </>
  );
}
