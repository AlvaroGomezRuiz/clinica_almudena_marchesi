import Link from 'next/link';
import { notFound } from 'next/navigation';

import ChatPanel, { type ChatMensaje } from '@/components/chat/ChatPanel';
import { PageHeader } from '@/components/portal-shell/ui';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface Params {
  readonly params: { readonly id: string };
}

interface MensajeRow {
  id: string;
  conversation_id: string;
  sender_user_id: string;
  body_ciphertext: string;
  read_at: string | null;
  created_at: string;
}

interface ConversacionAdminRow {
  id: string;
  paciente_id: string;
  paciente_display_name: string | null;
  paciente_email: string | null;
}

export async function generateMetadata({ params }: Params) {
  return { title: `Conversación #${params.id.slice(0, 8)} | Panel Almudena` };
}

export default async function AdminConversacionPage({ params }: Params) {
  const UUID_RE = /^[0-9a-f-]{36}$/i;
  if (!UUID_RE.test(params.id)) notFound();

  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: conv } = await supabase
    .from('v_conversaciones_admin')
    .select('id, paciente_id, paciente_display_name, paciente_email')
    .eq('id', params.id)
    .maybeSingle<ConversacionAdminRow>();

  if (!conv) notFound();

  const { data: mensajesRaw } = await supabase
    .from('mensajes')
    .select('id, conversation_id, sender_user_id, body_ciphertext, read_at, created_at')
    .eq('conversation_id', conv.id)
    .order('created_at', { ascending: true })
    .limit(200);

  const mensajes: ChatMensaje[] = (mensajesRaw as MensajeRow[] | null) ?? [];

  const display =
    conv.paciente_display_name?.trim() ||
    conv.paciente_email ||
    `Paciente #${conv.paciente_id.slice(0, 8)}`;

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
        description={conv.paciente_email ?? 'Paciente verificado con correo.'}
      />

      <ChatPanel
        conversacionId={conv.id}
        currentUserId={user.id}
        initialMensajes={mensajes}
        otherLabel={display}
        otherSubtitle={conv.paciente_email ?? undefined}
      />
    </>
  );
}
