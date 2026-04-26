import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

import {
  colorEtiquetaConversacionList,
  imageUrlConversacionList,
  initialsConversacionList,
  type PacienteRowLite,
} from '@/components/admin/mensajes/conversacion-list-avatar-data';
import PacienteListAvatar from '@/components/admin/pacientes/PacienteListAvatar';
import NuevaConversacionButton from '@/components/admin/mensajes/NuevaConversacionButton';
import {
  Chip,
  EmptyState,
  PageHeader,
  SurfaceCard,
} from '@/components/portal-shell/ui';
import RealtimeRefresh from '@/components/realtime/RealtimeRefresh';
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

  const pacienteIds = Array.from(
    new Set(conversaciones.map((c) => c.paciente_id))
  );
  const userIds = Array.from(
    new Set(
      conversaciones
        .map((c) => c.paciente_user_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  const [pacRes, profRes] = await Promise.all([
    pacienteIds.length > 0
      ? supabase
          .from('pacientes')
          .select('id, user_id, avatar_url, color_etiqueta')
          .in('id', pacienteIds)
      : Promise.resolve({ data: [] as PacienteRowLite[] }),
    userIds.length > 0
      ? supabase.from('profiles').select('id, avatar_url').in('id', userIds)
      : Promise.resolve({ data: [] as { id: string; avatar_url: string | null }[] }),
  ]);

  const pacById = new Map(
    ((pacRes.data as PacienteRowLite[] | null) ?? []).map((p) => [p.id, p])
  );
  const profileAvatarByUserId = new Map(
    ((profRes.data as { id: string; avatar_url: string | null }[] | null) ?? []).map((p) => [
      p.id,
      p.avatar_url,
    ])
  );

  return (
    <>
      <RealtimeRefresh
        channelName="admin-mensajes-list"
        tables={['conversaciones', 'mensajes']}
      />

      <PageHeader
        eyebrow={`${conversaciones.length} conversaciones · ${totalUnread} sin leer`}
        title="Bandeja clínica"
        description="Canal seguro con tus pacientes. TLS en tránsito, RLS en reposo, auditado. El contador de no leídos también aparece en el menú (hamburguesa) móvil."
        actions={
          <div className="flex w-full flex-col gap-2 min-[400px]:flex-row min-[400px]:flex-wrap min-[400px]:justify-end sm:w-auto">
            <NuevaConversacionButton />
          </div>
        }
      />

      {conversaciones.length === 0 ? (
        <EmptyState
          icon="forum"
          title="Ninguna conversación abierta"
          description="Cuando un paciente escriba desde su portal, la conversación aparecerá aquí."
        />
      ) : (
        <ul className="grid max-w-4xl gap-2.5 sm:gap-3">
          {conversaciones.map((c) => {
            const display =
              c.paciente_display_name?.trim() ||
              c.paciente_email ||
              `Paciente #${c.paciente_id.slice(0, 8)}`;
            const preview =
              (c.ultimo_mensaje ?? '').slice(0, 120) || 'Sin mensajes todavía.';
            const when = c.last_message_at
              ? formatDistanceToNow(new Date(c.last_message_at), {
                  locale: es,
                  addSuffix: true,
                })
              : null;
            const initials = initialsConversacionList(display, c.paciente_email);
            const imageUrl = imageUrlConversacionList(
              c.paciente_id,
              c.paciente_user_id,
              pacById,
              profileAvatarByUserId
            );
            const colorEtiqueta = colorEtiquetaConversacionList(c.paciente_id, pacById);

            return (
              <li key={c.id}>
                <Link
                  href={`/admin/mensajes/${c.id}`}
                  aria-label={`Abrir conversación con ${display}${
                    c.unread_admin > 0 ? `, ${c.unread_admin} sin leer` : ''
                  }`}
                  className="group block"
                >
                  <SurfaceCard interactive className="p-3.5 sm:p-4">
                    <div className="flex items-start gap-3 sm:items-center sm:gap-4">
                      <PacienteListAvatar
                        imageUrl={imageUrl}
                        initials={initials}
                        colorEtiqueta={colorEtiqueta}
                        size="lg"
                        className="mt-0.5 ring-primary/10 dark:ring-primary/25"
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                          <p className="font-display text-[1.02rem] text-ink leading-tight sm:text-[1.05rem] dark:text-white">
                            <span className="line-clamp-2 [overflow-wrap:anywhere] sm:line-clamp-1">
                              {display}
                            </span>
                          </p>
                          {when ? (
                            <p className="shrink-0 font-body text-[0.68rem] text-ink-muted tabular-nums sm:text-[0.7rem] dark:text-white/55">
                              {when}
                            </p>
                          ) : null}
                        </div>
                        <p className="mt-1 line-clamp-2 font-body text-[0.82rem] text-ink-soft [overflow-wrap:break-word] sm:line-clamp-1 sm:text-[0.85rem] dark:text-white/60">
                          {preview}
                        </p>
                      </div>

                      <div className="shrink-0 self-center sm:self-center">
                        {c.unread_admin > 0 ? (
                          <Chip tone="positive">
                            {c.unread_admin > 99 ? '99+' : c.unread_admin} nuevo
                            {c.unread_admin === 1 ? '' : 's'}
                          </Chip>
                        ) : (
                          <span
                            aria-hidden="true"
                            className="material-symbols-outlined text-[1.1rem] text-ink-muted transition-transform duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0.5 dark:text-white/50"
                          >
                            arrow_forward
                          </span>
                        )}
                      </div>
                    </div>
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
