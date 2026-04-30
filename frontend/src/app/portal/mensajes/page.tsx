import {
  EmptyState,
  PageHeader,
  SurfaceCard,
} from '@/components/portal-shell/ui';
import ChatPanel from '@/components/chat/ChatPanel';
import { CLINIC_PUBLIC_SITE_HOST_LABEL } from '@/lib/clinic';
import { createServerClient } from '@/lib/supabase/server';
import { enrichMensajesWithAdjuntos } from '@/services/mensajes/fetch-adjuntos';

export const metadata = { title: `Mensajes | ${CLINIC_PUBLIC_SITE_HOST_LABEL}` };
export const dynamic = 'force-dynamic';

interface MensajeRow {
  id: string;
  conversation_id: string;
  sender_user_id: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
}

export default async function PortalMensajesPage() {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Devuelve (o crea) la conversación del usuario actual vía RPC.
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
            title="No se pudo cargar el chat"
            description="Vuelve a intentarlo en unos segundos. Si el problema persiste, contacta con Almudena por teléfono."
          />
        </SurfaceCard>
      </>
    );
  }

  const conversacionId = String(convId);

  const { data: mensajesRaw, error: mensajesErr } = await supabase
    .from('v_mensajes_chat')
    .select('id, conversation_id, sender_user_id, body, read_at, created_at')
    .eq('conversation_id', conversacionId)
    .order('created_at', { ascending: true })
    .limit(200);

  if (mensajesErr) {
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
            title="No se pudieron cargar los mensajes"
            description="Vuelve a intentar en unos segundos. Si el problema continúa, puede faltar aplicar la migración de base de datos más reciente en Supabase."
          />
        </SurfaceCard>
      </>
    );
  }

  const normalizados = ((mensajesRaw as MensajeRow[] | null) ?? []).map((m) => ({
    ...m,
    body: m.body ?? '',
  }));

  const mensajes = await enrichMensajesWithAdjuntos(normalizados);

  const { data: selfProf } = await supabase
    .from('profiles')
    .select('avatar_url')
    .eq('id', user.id)
    .maybeSingle<{ avatar_url: string | null }>();

  const { data: terapeutaRows } = await supabase.rpc('terapeuta_public_profile');
  const therapistAvatar = ((): string | null => {
    if (!Array.isArray(terapeutaRows) || terapeutaRows.length === 0) return null;
    const row: unknown = terapeutaRows[0];
    if (typeof row !== 'object' || row === null) return null;
    const av = Reflect.get(row, 'avatar_url');
    if (typeof av !== 'string') return null;
    const t = av.trim();
    return t.length > 0 ? t : null;
  })();

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
        selfAvatarUrl={selfProf?.avatar_url ?? null}
        otherAvatarUrl={therapistAvatar}
      />
    </>
  );
}
