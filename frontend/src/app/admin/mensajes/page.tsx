import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

import {
  Chip,
  EmptyState,
  PageHeader,
  SurfaceCard,
} from '@/components/portal-shell/ui';
import RealtimeRefresh from '@/components/realtime/RealtimeRefresh';
import NuevaConversacionButton from '@/components/admin/mensajes/NuevaConversacionButton';
import { createServerClient } from '@/lib/supabase/server';

export const metadata = { title: 'Mensajes | Panel Almudena' };
export const dynamic = 'force-dynamic';

interface ConversacionAdminRow {
  id: string;
  paciente_id: string;
  paciente_user_id: string | null;
  paciente_display_name: string | null;
  paciente_email: string | null;
  last_message_at: string | null;
  unread_admin: number;
  unread_paciente: number;
  estado: 'abierta' | 'archivada' | 'bloqueada';
  ultimo_mensaje: string | null;
  ultimo_mensaje_en: string | null;
  ultimo_mensaje_autor: string | null;
}

export default async function AdminMensajesPage() {
  const supabase = createServerClient();

  const { data: rows } = await supabase
    .from('v_conversaciones_admin')
    .select('*')
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(100);

  const conversaciones = (rows as ConversacionAdminRow[] | null) ?? [];
  const totalUnread = conversaciones.reduce((a, c) => a + (c.unread_admin ?? 0), 0);

  return (
    <>
      <RealtimeRefresh
        channelName="admin-mensajes-list"
        tables={['conversaciones', 'mensajes']}
      />

      <PageHeader
        eyebrow={`${conversaciones.length} conversaciones · ${totalUnread} sin leer`}
        title="Bandeja clínica"
        description="Canal seguro con tus pacientes. TLS en tránsito, RLS en reposo, auditado."
        actions={<NuevaConversacionButton />}
      />

      {conversaciones.length === 0 ? (
        <EmptyState
          icon="forum"
          title="Ninguna conversación abierta"
          description="Cuando un paciente escriba desde su portal, la conversación aparecerá aquí."
        />
      ) : (
        <ul className="grid gap-3">
          {conversaciones.map((c) => {
            const display =
              c.paciente_display_name?.trim() ||
              c.paciente_email ||
              `Paciente #${c.paciente_id.slice(0, 8)}`;
            const preview =
              (c.ultimo_mensaje ?? '').slice(0, 120) ||
              'Sin mensajes todavía.';
            const when = c.last_message_at
              ? formatDistanceToNow(new Date(c.last_message_at), {
                  locale: es,
                  addSuffix: true,
                })
              : null;

            return (
              <li key={c.id}>
                <Link
                  href={`/admin/mensajes/${c.id}`}
                  aria-label={`Abrir conversación con ${display}`}
                  className="group block"
                >
                  <SurfaceCard interactive className="flex items-center gap-5">
                    <span
                      aria-hidden="true"
                      className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl bg-primary/10 ring-1 ring-inset ring-primary/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
                    >
                      <span className="font-display text-[1rem] italic text-primary tracking-[-0.01em]">
                        {display.trim().charAt(0).toUpperCase()}
                      </span>
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-4">
                        <p className="font-display text-[1.05rem] text-ink leading-tight truncate tracking-[-0.01em] dark:text-white">
                          {display}
                        </p>
                        {when ? (
                          <p className="flex-shrink-0 font-body text-[0.7rem] text-ink-muted tabular-nums dark:text-white/55">
                            {when}
                          </p>
                        ) : null}
                      </div>
                      <p className="mt-1.5 line-clamp-1 font-body text-[0.85rem] text-ink-soft dark:text-white/60">
                        {preview}
                      </p>
                    </div>

                    {c.unread_admin > 0 ? (
                      <Chip tone="positive">{c.unread_admin} nuevo{c.unread_admin === 1 ? '' : 's'}</Chip>
                    ) : (
                      <span
                        aria-hidden="true"
                        className="material-symbols-outlined text-[1.1rem] text-ink-muted transition-transform duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0.5"
                      >
                        arrow_forward
                      </span>
                    )}
                  </SurfaceCard>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
