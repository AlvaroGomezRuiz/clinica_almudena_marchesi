import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import ChatPanel from '@/components/chat/ChatPanel';
import { Chip, PageHeader, SurfaceCard } from '@/components/portal-shell/ui';
import { createServerClient } from '@/lib/supabase/server';
import { enrichMensajesWithAdjuntos } from '@/services/mensajes/fetch-adjuntos';

export const dynamic = 'force-dynamic';

interface Params {
  readonly params: Promise<{ readonly id: string }>;
}

interface MensajeRow {
  id: string;
  conversation_id: string;
  sender_user_id: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
}

interface ConversacionAdminRow {
  id: string;
  paciente_id: string;
  paciente_display_name: string | null;
  paciente_email: string | null;
}

interface FichaRow {
  id: string;
  fecha_alta: string;
  tags: readonly string[];
  color_etiqueta: string | null;
  avatar_url: string | null;
  consentimiento_rgpd: boolean;
  proxima_cita: string | null;
  ultima_cita: string | null;
  sesiones_completadas: number;
  has_telefono: boolean;
  has_dni: boolean;
}

export async function generateMetadata({ params }: Params): Promise<{ title: string }> {
  const { id } = await params;
  return { title: `Conversación #${id.slice(0, 8)} | Panel Almudena` };
}

export default async function AdminConversacionPage({
  params,
}: Params): Promise<JSX.Element | null> {
  const { id } = await params;
  const UUID_RE = /^[0-9a-f-]{36}$/i;
  if (!UUID_RE.test(id)) notFound();

  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: conv } = await supabase
    .from('v_conversaciones_admin')
    .select('id, paciente_id, paciente_display_name, paciente_email')
    .eq('id', id)
    .maybeSingle();

  const convTyped = conv as unknown as ConversacionAdminRow | null;
  if (!convTyped) notFound();

  const [mensajesRes, fichaRes, selfProfRes] = await Promise.all([
    supabase
      .from('v_mensajes_chat')
      .select('id, conversation_id, sender_user_id, body, read_at, created_at')
      .eq('conversation_id', convTyped.id)
      .order('created_at', { ascending: true })
      .limit(200),
    supabase
      .from('v_pacientes_resumen_admin')
      .select(
        'id, fecha_alta, tags, color_etiqueta, avatar_url, consentimiento_rgpd, proxima_cita, ultima_cita, sesiones_completadas, has_telefono, has_dni'
      )
      .eq('id', convTyped.paciente_id)
      .maybeSingle(),
    supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .maybeSingle<{ avatar_url: string | null }>(),
  ]);

  const normalizados = ((mensajesRes.data as MensajeRow[] | null) ?? []).map((m) => ({
    ...m,
    body: m.body ?? '',
  }));

  const mensajes = await enrichMensajesWithAdjuntos(normalizados);
  const ficha = fichaRes.data as unknown as FichaRow | null;
  const selfAvatarUrl = (selfProfRes.data as { avatar_url: string | null } | null)?.avatar_url ?? null;

  const display =
    convTyped.paciente_display_name?.trim() ||
    convTyped.paciente_email ||
    `Paciente #${convTyped.paciente_id.slice(0, 8)}`;

  return (
    <>
      <PageHeader
        eyebrow={
          <Link
            href="/admin/mensajes"
            className="group inline-flex items-center gap-1.5 hover:text-primary transition-colors"
          >
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-[0.85rem] transition-transform duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-x-0.5"
            >
              arrow_back
            </span>
            Volver a la bandeja
          </Link>
        }
        title={display}
        description={convTyped.paciente_email ?? 'Paciente verificado con correo.'}
      />

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start lg:gap-8">
        <div className="min-h-0 w-full lg:min-w-0">
          <ChatPanel
            conversacionId={convTyped.id}
            currentUserId={user.id}
            initialMensajes={mensajes}
            otherLabel={display}
            otherSubtitle={convTyped.paciente_email ?? undefined}
            selfAvatarUrl={selfAvatarUrl}
            otherAvatarUrl={ficha?.avatar_url ?? null}
          />
        </div>

        <aside className="relative z-0 w-full space-y-4 lg:sticky lg:top-6 lg:w-auto lg:self-start">
          <SurfaceCard>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-[1.05rem] italic text-ink dark:text-white">
                Ficha rápida
              </h2>
              <Link
                href={`/admin/pacientes/${convTyped.paciente_id}`}
                className="font-body text-[0.75rem] text-primary hover:underline dark:text-white/80"
              >
                Abrir ficha
              </Link>
            </div>

            {!ficha ? (
              <p className="py-4 text-center font-body text-[0.82rem] text-ink-muted dark:text-white/55">
                Sin datos del paciente.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div
                    className="grid h-12 w-12 place-items-center rounded-2xl font-display text-[1.1rem] text-canvas ring-1 ring-inset ring-ink/10 dark:text-ink dark:ring-white/10"
                    style={{
                      background:
                        ficha.color_etiqueta ??
                        'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
                    }}
                    aria-hidden="true"
                  >
                    {ficha.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={ficha.avatar_url}
                        alt=""
                        className="h-full w-full rounded-2xl object-cover"
                      />
                    ) : (
                      display.trim().charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-body text-[0.88rem] text-ink dark:text-white truncate">
                      {display}
                    </p>
                    <p className="font-body text-[0.7rem] text-ink-muted dark:text-white/55">
                      Alta {format(new Date(ficha.fecha_alta), 'd MMM yyyy', { locale: es })}
                    </p>
                  </div>
                </div>

                <dl className="grid grid-cols-2 gap-3 text-[0.78rem]">
                  <MiniField
                    label="Próxima cita"
                    value={
                      ficha.proxima_cita
                        ? format(new Date(ficha.proxima_cita), "d MMM · HH:mm", { locale: es })
                        : '—'
                    }
                  />
                  <MiniField label="Sesiones" value={`${ficha.sesiones_completadas}`} />
                  <MiniField
                    label="Última cita"
                    value={
                      ficha.ultima_cita
                        ? format(new Date(ficha.ultima_cita), 'd MMM yyyy', { locale: es })
                        : '—'
                    }
                  />
                  <MiniField
                    label="RGPD"
                    value={ficha.consentimiento_rgpd ? 'Firmado' : 'Pendiente'}
                  />
                </dl>

                {ficha.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {ficha.tags.map((t) => (
                      <Chip key={t} tone="neutral">{t}</Chip>
                    ))}
                  </div>
                ) : null}

                <div className="flex gap-2 pt-2 text-[0.7rem]">
                  {ficha.has_telefono ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-primary dark:bg-primary/25 dark:text-white">
                      <span className="material-symbols-outlined text-[0.8rem]" aria-hidden="true">
                        phone
                      </span>
                      Tlf
                    </span>
                  ) : null}
                  {ficha.has_dni ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-primary dark:bg-primary/25 dark:text-white">
                      <span className="material-symbols-outlined text-[0.8rem]" aria-hidden="true">
                        badge
                      </span>
                      DNI
                    </span>
                  ) : null}
                </div>
              </div>
            )}
          </SurfaceCard>

          <SurfaceCard>
            <h2 className="font-display text-[1rem] italic text-ink dark:text-white mb-2">
              Acciones rápidas
            </h2>
            <div className="flex flex-col gap-1.5">
              <Link
                href={`/admin/agenda?vista=dia&paciente=${convTyped.paciente_id}`}
                className="inline-flex items-center gap-2 rounded-xl bg-white/50 px-3 py-2 font-body text-[0.82rem] text-ink transition hover:bg-white/70 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
              >
                <span className="material-symbols-outlined text-[1rem]" aria-hidden="true">
                  event
                </span>
                Agendar cita
              </Link>
              <Link
                href={`/admin/recursos?paciente=${convTyped.paciente_id}`}
                className="inline-flex items-center gap-2 rounded-xl bg-white/50 px-3 py-2 font-body text-[0.82rem] text-ink transition hover:bg-white/70 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
              >
                <span className="material-symbols-outlined text-[1rem]" aria-hidden="true">
                  folder_shared
                </span>
                Asignar recurso
              </Link>
            </div>
          </SurfaceCard>
        </aside>
      </div>
    </>
  );
}

function MiniField({
  label,
  value,
}: {
  label: string;
  value: string;
}): JSX.Element {
  return (
    <div>
      <dt className="font-body text-[0.62rem] uppercase tracking-[0.15em] text-ink-muted dark:text-white/55">
        {label}
      </dt>
      <dd className="mt-0.5 font-body text-[0.78rem] text-ink dark:text-white">
        {value}
      </dd>
    </div>
  );
}
