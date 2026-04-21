import {
  EmptyState,
  PageHeader,
  SurfaceCard,
} from '@/components/portal-shell/ui';
import ChatPanel, { type ChatMensaje } from '@/components/chat/ChatPanel';
import { createServerClient } from '@/lib/supabase/server';

export const metadata = { title: 'Mensajes | Portal Paciente' };
export const dynamic = 'force-dynamic';

interface MensajeRow {
  id: string;
  conversation_id: string;
  sender_user_id: string;
  body_ciphertext: string;
  read_at: string | null;
  created_at: string;
}

export default async function PortalMensajesPage() {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Devuelve (o crea) la conversación del paciente actual vía RPC.
  const { data: convId, error: rpcErr } = await supabase.rpc('chat_mi_conversacion');

  if (rpcErr || !convId) {
    return (
      <>
        <PageHeader
          eyebrow="Mensajes"
          title="Conversación con Almudena"
          description="Canal seguro y privado. TLS en tránsito, RLS en reposo."
        />
        <SurfaceCard>
          <EmptyState
            icon="chat"
            title="Todavía no puedes abrir el chat"
            description="Almudena debe vincular tu perfil a una ficha clínica para habilitar la conversación. Escríbele por teléfono mientras tanto."
          />
        </SurfaceCard>
      </>
    );
  }

  const conversacionId = String(convId);

  const { data: mensajesRaw } = await supabase
    .from('mensajes')
    .select('id, conversation_id, sender_user_id, body_ciphertext, read_at, created_at')
    .eq('conversation_id', conversacionId)
    .order('created_at', { ascending: true })
    .limit(200);

  const mensajes: ChatMensaje[] = (mensajesRaw as MensajeRow[] | null) ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Mensajes"
        title="Conversación con Almudena"
        description="Canal directo y seguro. Las respuestas llegan en tiempo real."
      />

      <ChatPanel
        conversacionId={conversacionId}
        currentUserId={user.id}
        initialMensajes={mensajes}
        otherLabel="Almudena Marchesi"
        otherSubtitle="Psicóloga · colegiada Nº M-38427"
      />
    </>
  );
}
