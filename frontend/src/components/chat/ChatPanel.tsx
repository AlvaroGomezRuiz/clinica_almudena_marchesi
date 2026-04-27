'use client';

/**
 * ChatPanel — chat realtime bidireccional admin ↔ paciente.
 *
 * Responsabilidades:
 *   - Renderizar burbujas de mensajes con diferenciación remitente
 *   - Suscribirse a INSERT en public.mensajes filtrado por conversación
 *   - Deduplicar optimistic vs realtime (por id uuid)
 *   - Auto-scroll solo si el usuario está cerca del fondo (no interrumpe lectura)
 *   - Marcar como leídos al montar + cuando llegue un mensaje del otro
 *
 * Seguridad: toda escritura pasa por Server Action (RPC con SECURITY DEFINER).
 *            RLS ya garantiza que el paciente solo vea su conversación.
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';

import AudioRecorderButton from '@/components/chat/AudioRecorderButton';
import ChatAttachButton from '@/components/chat/ChatAttachButton';
import {
  CHAT_AUDIO_MESSAGE_BODY,
  CHAT_TEXT_PLACEHOLDER,
  CHAT_TEXT_PLACEHOLDER_HINT,
} from '@/lib/chat/chat-composer-copy';
import { formatChatAttachmentDisplayName } from '@/lib/chat/format-chat-attachment-name';
import { createBrowserClient } from '@/lib/supabase/client';
import { marcarLeidosAction, sendMensajeAction } from '@/services/mensajes/actions';

/* Formatters Intl reutilizables → cero coste de date-fns en este bundle.
   Instanciarlos en módulo en lugar de en cada render es ~5× más rápido. */
const timeFormatter = new Intl.DateTimeFormat('es-ES', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});
const dayLabelFormatter = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'long',
});
const dayKeyFormatter = new Intl.DateTimeFormat('sv-SE', {
  /* locale sv-SE produce formato ISO "YYYY-MM-DD" nativo */
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export interface ChatAdjunto {
  readonly id: string;
  readonly nombre: string;
  readonly mime: string | null;
  readonly size_bytes: number | null;
  readonly tipo: 'archivo' | 'imagen' | 'audio' | 'video';
  readonly signed_url: string | null;
}

export interface ChatMensaje {
  readonly id: string;
  readonly conversation_id: string;
  readonly sender_user_id: string;
  /**
   * Contenido en claro. Desde la BD llega descifrado vía la vista
   * `v_mensajes_chat` o via RPC `chat_descifrar_mensaje`. El ciphertext
   * bruto nunca llega a este nivel de la UI.
   */
  readonly body: string;
  readonly created_at: string;
  readonly read_at: string | null;
  readonly adjuntos?: readonly ChatAdjunto[];
  readonly pending?: boolean;
  readonly failed?: boolean;
}

type BrowserSupabase = ReturnType<typeof createBrowserClient>;

async function fetchAdjuntosForMensajeCliente(
  supabase: BrowserSupabase,
  mensajeId: string
): Promise<readonly ChatAdjunto[]> {
  const { data: rows, error } = await supabase
    .from('mensajes_adjuntos')
    .select('id, mensaje_id, nombre, mime, size_bytes, tipo, storage_path')
    .eq('mensaje_id', mensajeId);

  if (error || !rows?.length) return [];

  const paths = rows.map((r) => r.storage_path);
  const { data: signed } = await supabase.storage
    .from('chat-adjuntos')
    .createSignedUrls(paths, 3600);

  const urlByPath = new Map<string, string>();
  for (const s of signed ?? []) {
    if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl);
  }

  return rows.map((r) => ({
    id: r.id,
    nombre: r.nombre,
    mime: r.mime,
    size_bytes: r.size_bytes,
    tipo: r.tipo as ChatAdjunto['tipo'],
    signed_url: urlByPath.get(r.storage_path) ?? null,
  }));
}

async function mensajePerteneceAConversacion(
  supabase: BrowserSupabase,
  mensajeId: string,
  conversacionId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('mensajes')
    .select('conversation_id')
    .eq('id', mensajeId)
    .maybeSingle();
  return data?.conversation_id === conversacionId;
}

async function loadMensajeCompletoConRetry(
  supabase: BrowserSupabase,
  mensajeId: string
): Promise<ChatMensaje | null> {
  const delaysMs = [0, 150, 400, 800, 1400];

  for (let i = 0; i < delaysMs.length; i += 1) {
    const wait = delaysMs[i] ?? 0;
    if (wait > 0) {
      await new Promise<void>((r) => {
        setTimeout(r, wait);
      });
    }

    const { data: dec, error: decErr } = await supabase.rpc('chat_descifrar_mensaje', {
      p_id: mensajeId,
    });
    if (decErr || !dec) continue;

    const row = Array.isArray(dec) ? dec[0] : dec;
    if (!row || typeof row !== 'object' || !('id' in row)) continue;

    const r = row as {
      id: string;
      conversation_id: string;
      sender_user_id: string;
      body: string | null;
      read_at: string | null;
      created_at: string;
    };

    const adjuntos = await fetchAdjuntosForMensajeCliente(supabase, mensajeId);
    const body = String(r.body ?? '');
    const t = body.trim();
    const expectsAttachment =
      /^📎\s/u.test(t) || /^🎤/u.test(t) || t === CHAT_AUDIO_MESSAGE_BODY;
    const last = i === delaysMs.length - 1;

    if (!expectsAttachment || adjuntos.length > 0 || last) {
      return {
        id: String(r.id),
        conversation_id: String(r.conversation_id),
        sender_user_id: String(r.sender_user_id),
        body,
        read_at: r.read_at ? String(r.read_at) : null,
        created_at: String(r.created_at),
        adjuntos: adjuntos.length > 0 ? adjuntos : undefined,
      };
    }
  }

  return null;
}

interface ChatPanelProps {
  readonly conversacionId: string;
  readonly currentUserId: string;
  readonly initialMensajes: readonly ChatMensaje[];
  readonly otherLabel: string;
  readonly otherSubtitle?: string;
  /** Miniatura en hilo (tú); si falta, icono neutro. */
  readonly selfAvatarUrl?: string | null;
  /** Miniatura del interlocutor (cabecera + burbujas recibidas). */
  readonly otherAvatarUrl?: string | null;
}

const MAX_LENGTH = 4000;
const NEAR_BOTTOM_PX = 120;

export default function ChatPanel({
  conversacionId,
  currentUserId,
  initialMensajes,
  otherLabel,
  otherSubtitle,
  selfAvatarUrl,
  otherAvatarUrl,
}: ChatPanelProps) {
  const router = useRouter();
  const [mensajes, setMensajes] = useState<readonly ChatMensaje[]>(initialMensajes);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const listRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  // Memoizamos el cliente Supabase (singleton por render de vida del componente)
  const supabase = useMemo(() => createBrowserClient(), []);

  const initialSnapshotKey = useMemo(
    () =>
      `${initialMensajes.length}\u001f${initialMensajes.map((m) => m.id).join('\u001f')}\u001f${initialMensajes.at(-1)?.created_at ?? ''}`,
    [initialMensajes]
  );

  /** Tras `router.refresh()` el RSC entrega nuevos mensajes; fusionamos con optimistic pendiente. */
  useEffect(() => {
    setMensajes((prev) => {
      const optimistic = prev.filter(
        (m) => m.pending === true || m.failed === true || m.id.startsWith('temp-')
      );
      const serverIds = new Set(initialMensajes.map((m) => m.id));
      const keepOpt = optimistic.filter((o) => !serverIds.has(o.id));
      return [...initialMensajes, ...keepOpt].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });
  }, [initialSnapshotKey, initialMensajes]);

  // ───── scroll helpers ─────
  const scrollToBottom = useCallback((smooth: boolean) => {
    const el = bottomSentinelRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'end' });
  }, []);

  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom < NEAR_BOTTOM_PX;
  }, []);

  // Auto-scroll cuando cambian mensajes (solo si seguimos cerca del fondo)
  useLayoutEffect(() => {
    if (stickToBottomRef.current) {
      scrollToBottom(false);
    }
  }, [mensajes.length, scrollToBottom]);

  // Marcar como leídos al montar
  useEffect(() => {
    marcarLeidosAction(conversacionId);
  }, [conversacionId]);

  const mergeMensajeFromServer = useCallback(
    (full: ChatMensaje) => {
      setMensajes((prev) => {
        const byId = prev.findIndex((x) => x.id === full.id);
        if (byId >= 0) {
          const next = prev.slice();
          next[byId] = {
            ...next[byId],
            ...full,
            pending: false,
            failed: false,
          };
          return next;
        }
        if (full.sender_user_id === currentUserId) {
          const pj = prev.findIndex(
            (x) => x.pending === true && x.sender_user_id === currentUserId
          );
          if (pj >= 0) {
            const next = prev.slice();
            next[pj] = { ...full, pending: false, failed: false };
            return next;
          }
        }
        if (prev.some((x) => x.id === full.id)) return prev;
        return [...prev, full].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });
      if (full.sender_user_id !== currentUserId) {
        void marcarLeidosAction(conversacionId);
      }
    },
    [conversacionId, currentUserId]
  );

  const onAttachUploaded = useCallback(
    async (mensajeId: string) => {
      const ok = await mensajePerteneceAConversacion(supabase, mensajeId, conversacionId);
      if (!ok) return;
      const full = await loadMensajeCompletoConRetry(supabase, mensajeId);
      if (!full) return;
      stickToBottomRef.current = true;
      mergeMensajeFromServer(full);
    },
    [supabase, conversacionId, mergeMensajeFromServer]
  );

  // ───── Suscripción Realtime (mensajes + adjuntos) ─────
  useEffect(() => {
    const channel = supabase
      .channel(`chat-${conversacionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensajes',
          filter: `conversation_id=eq.${conversacionId}`,
        },
        async (payload) => {
          const raw = payload.new as {
            id?: string;
            sender_user_id?: string;
          };
          const id = raw.id;
          if (!id) return;

          const full = await loadMensajeCompletoConRetry(supabase, id);
          if (!full) return;

          mergeMensajeFromServer(full);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, conversacionId, mergeMensajeFromServer]);

  useEffect(() => {
    const channel = supabase
      .channel(`chat-adjuntos-${conversacionId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensajes_adjuntos' },
        async (payload) => {
          const row = payload.new as { mensaje_id?: string };
          const mensajeId = row.mensaje_id;
          if (!mensajeId) return;
          const ok = await mensajePerteneceAConversacion(supabase, mensajeId, conversacionId);
          if (!ok) return;
          const full = await loadMensajeCompletoConRetry(supabase, mensajeId);
          if (!full) return;
          stickToBottomRef.current = true;
          mergeMensajeFromServer(full);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, conversacionId, mergeMensajeFromServer]);

  // ───── Envío con optimistic UI ─────
  const handleSend = useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) return;
      if (trimmed.length > MAX_LENGTH) {
        setError(`Máximo ${MAX_LENGTH} caracteres.`);
        return;
      }

      setError(null);
      setDraft('');
      stickToBottomRef.current = true;

      const tempId = `temp-${crypto.randomUUID()}`;
      const optimistic: ChatMensaje = {
        id: tempId,
        conversation_id: conversacionId,
        sender_user_id: currentUserId,
        body: trimmed,
        created_at: new Date().toISOString(),
        read_at: null,
        pending: true,
      };

      setMensajes((prev) => [...prev, optimistic]);

      startTransition(() => {
        sendMensajeAction(conversacionId, trimmed).then((res) => {
          setMensajes((prev) => {
            if (!res.ok) {
              return prev.map((m) =>
                m.id === tempId ? { ...m, pending: false, failed: true } : m
              );
            }
            // Sustituimos el optimistic por el real (el realtime ya lo podría haber hecho)
            if (prev.some((m) => m.id === res.mensaje.id)) {
              return prev.filter((m) => m.id !== tempId);
            }
            return prev.map((m) => (m.id === tempId ? res.mensaje : m));
          });

          if (!res.ok) setError(res.message);
          else router.refresh();
        });
      });
    },
    [conversacionId, currentUserId, router]
  );

  const onSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      handleSend(draft);
    },
    [draft, handleSend]
  );

  const onTextareaKey = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend(draft);
      }
    },
    [draft, handleSend]
  );

  // ───── Render ─────
  const agrupados = useMemo(() => groupByDay(mensajes), [mensajes]);

  return (
    <section
      className="relative flex h-[min(78dvh,calc(100dvh-150px))] min-h-[360px] max-h-[820px] flex-col overflow-hidden rounded-[1.625rem] bg-white/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_20px_48px_-24px_rgba(75,100,95,0.14)] backdrop-blur-xl dark:bg-[#161616]/80 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_20px_48px_-24px_rgba(0,0,0,0.6)] md:h-[calc(100vh-220px)] md:max-h-none md:min-h-[480px]"
      aria-label="Conversación de chat"
    >
      {/* Cabecera */}
      <header className="flex items-center justify-between gap-3 px-6 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="relative grid h-11 w-11 flex-shrink-0 place-items-center overflow-hidden rounded-2xl bg-primary/10 ring-1 ring-inset ring-primary/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] dark:bg-primary/25 dark:ring-primary/30 dark:shadow-none">
            {otherAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={otherAvatarUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <span className="material-symbols-outlined text-[1.25rem] text-primary dark:text-white" aria-hidden="true">
                person
              </span>
            )}
          </span>
          <div className="min-w-0">
            <p className="truncate font-body text-[1.02rem] font-semibold leading-snug tracking-normal text-ink dark:text-white">
              {otherLabel}
            </p>
            {otherSubtitle ? (
              <p className="font-body text-[0.72rem] text-ink-muted truncate dark:text-white/55">{otherSubtitle}</p>
            ) : null}
          </div>
        </div>
      </header>

      <span aria-hidden="true" className="hairline mx-4" />

      {/* Mensajes */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-5 md:px-6 [scrollbar-gutter:stable]"
      >
        {mensajes.length === 0 ? (
          <div className="flex h-full items-center justify-center px-6 text-center">
            <div>
              <span
                className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/60 ring-1 ring-inset ring-white/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
                aria-hidden="true"
              >
                <span className="material-symbols-outlined text-[1.4rem] text-primary/70">
                  forum
                </span>
              </span>
              <p className="mt-4 font-display text-[1.05rem] italic text-ink">
                Sin mensajes todavía
              </p>
              <p className="mt-1 max-w-xs font-body text-[0.85rem] text-ink-soft">
                Escribe el primero para empezar la conversación.
              </p>
            </div>
          </div>
        ) : (
          <ul className="flex flex-col gap-1">
            {agrupados.map((group) => (
              <li key={group.key} className="contents">
                <div className="my-4 flex items-center gap-3">
                  <span className="h-px flex-1 bg-ink/8" aria-hidden="true" />
                  <span className="font-body text-[0.62rem] uppercase tracking-[0.22em] text-ink-muted">
                    {group.label}
                  </span>
                  <span className="h-px flex-1 bg-ink/8" aria-hidden="true" />
                </div>
                {group.mensajes.map((m) => (
                  <Burbuja
                    key={m.id}
                    mensaje={m}
                    esMio={m.sender_user_id === currentUserId}
                    selfAvatarUrl={selfAvatarUrl}
                    otherAvatarUrl={otherAvatarUrl}
                    otherInitial={otherLabel.trim().charAt(0) || '?'}
                  />
                ))}
              </li>
            ))}
          </ul>
        )}
        <div ref={bottomSentinelRef} aria-hidden="true" />
      </div>

      {/* Composer */}
      <form
        onSubmit={onSubmit}
        className="relative border-t border-ink/5 bg-white/40 backdrop-blur-md px-3 py-3 md:px-5 dark:border-white/5 dark:bg-white/[0.02]"
      >
        {error ? (
          <p
            role="alert"
            className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[#b2675e]/12 ring-1 ring-inset ring-[#b2675e]/22 px-3 py-1 font-body text-[0.72rem] text-[#8c4d44]"
          >
            <span className="material-symbols-outlined text-[0.9rem]" aria-hidden="true">
              error
            </span>
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-end gap-2">
          <ChatAttachButton
            conversationId={conversacionId}
            disabled={isPending}
            onUploaded={onAttachUploaded}
          />
          <AudioRecorderButton
            conversacionId={conversacionId}
            disabled={isPending}
            onUploaded={onAttachUploaded}
          />
          <textarea
            name="mensaje"
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onTextareaKey}
            placeholder={CHAT_TEXT_PLACEHOLDER}
            title={CHAT_TEXT_PLACEHOLDER_HINT}
            maxLength={MAX_LENGTH}
            className="flex-1 resize-none rounded-2xl bg-white/80 px-4 py-3 font-body text-[0.92rem] leading-relaxed text-ink placeholder:text-ink-muted/80 ring-1 ring-inset ring-ink/8 outline-none transition-[box-shadow,background-color] duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] focus:bg-white focus:ring-primary/40 dark:bg-white/5 dark:text-white dark:placeholder:text-white/40 dark:ring-white/10 dark:focus:bg-white/10 dark:focus:ring-primary/60"
            aria-label="Escribir mensaje"
            disabled={isPending}
          />
          <button
            type="submit"
            disabled={isPending || draft.trim().length === 0}
            className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-full bg-primary text-on-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_10px_28px_-10px_rgba(75,100,95,0.45)] transition-[transform,box-shadow,background-color] duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:bg-primary-dim active:scale-[0.95] disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Enviar mensaje"
          >
            <span className="material-symbols-outlined text-[1.2rem]" aria-hidden="true">
              {isPending ? 'sync' : 'send'}
            </span>
          </button>
        </div>

        <p className="mt-1.5 flex items-center justify-end font-body text-[0.65rem] text-ink-muted dark:text-white/55">
          <span className="tabular-nums">
            {draft.length}/{MAX_LENGTH}
          </span>
        </p>
      </form>
    </section>
  );
}

/**
 * Convierte http(s) del texto en enlaces seguros (solo protocolos http/https).
 * El resto del texto se deja en spans (sin interpretar HTML).
 */
function messageBodyWithLinks(text: string, esMio: boolean): ReactNode[] {
  const re = /(https?:\/\/[^\s]+)/gi;
  const parts = text.split(re);
  const linkClass = esMio
    ? 'break-all underline underline-offset-2 text-on-primary hover:brightness-110'
    : 'break-all underline underline-offset-2 text-zinc-800 hover:text-zinc-950 dark:text-white/85 dark:hover:text-white';
  return parts.map((part, i) => {
    if (part === '') return null;
    if (/^https?:\/\//i.test(part)) {
      try {
        const u = new URL(part);
        if (u.protocol !== 'http:' && u.protocol !== 'https:') {
          return <span key={`${i}-${part.slice(0, 12)}`}>{part}</span>;
        }
        return (
          <a
            key={`${i}-${u.hostname}`}
            href={u.href}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            {part}
          </a>
        );
      } catch {
        return <span key={`${i}-x`}>{part}</span>;
      }
    }
    return <span key={`${i}-t`}>{part}</span>;
  });
}

/** Ocultar línea de cuerpo autogenerada (📎 / 🎤 / nombre duplicado del adjunto). */
function isAutoAttachmentCaption(body: string, adjuntos: readonly ChatAdjunto[]): boolean {
  const t = body.trim();
  if (!t || adjuntos.length === 0) return false;
  if (/^📎\s/u.test(t)) return true;
  if (adjuntos.some((a) => a.tipo === 'audio') && t === CHAT_AUDIO_MESSAGE_BODY) {
    return true;
  }
  if (/^🎤/u.test(t) && adjuntos.some((a) => a.tipo === 'audio')) return true;
  if (adjuntos.length === 1) {
    const a0 = adjuntos[0].nombre;
    const aTrim = a0.trim();
    if (t === aTrim) return true;
    if (t === `📎 ${aTrim}`.trim()) return true;
    const pretty = formatChatAttachmentDisplayName(a0);
    if (t === pretty || t === `📎 ${pretty}`.trim()) return true;
  }
  return false;
}

// ───────────────────────────────────────────────────────────────────────────
// Burbuja individual
// ───────────────────────────────────────────────────────────────────────────
function ChatThumb({
  url,
  fallbackLetter,
  align,
}: {
  url?: string | null;
  fallbackLetter: string;
  align: 'left' | 'right';
}) {
  const ring =
    align === 'left'
      ? 'ring-ink/10 dark:ring-white/12'
      : 'ring-primary/25 dark:ring-white/15';
  if (url) {
    return (
      <span className={`mb-0.5 h-8 w-8 shrink-0 overflow-hidden rounded-full ring-1 ${ring}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" className="h-full w-full object-cover" width={32} height={32} />
      </span>
    );
  }
  const ch = fallbackLetter.trim();
  if (ch) {
    return (
      <span
        className={`mb-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink/[0.06] font-body text-[0.68rem] font-semibold text-ink-muted ring-1 ring-ink/10 dark:bg-white/10 dark:text-white/75 dark:ring-white/12 ${ring}`}
        aria-hidden="true"
      >
        {ch.toUpperCase().slice(0, 1)}
      </span>
    );
  }
  return (
    <span
      className={`mb-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink/[0.06] ring-1 ring-ink/10 dark:bg-white/10 dark:ring-white/12 ${ring}`}
      aria-hidden="true"
    >
      <span className="material-symbols-outlined text-[1rem] text-ink-muted dark:text-white/60">
        person
      </span>
    </span>
  );
}

function Burbuja({
  mensaje,
  esMio,
  selfAvatarUrl,
  otherAvatarUrl,
  otherInitial,
}: {
  mensaje: ChatMensaje;
  esMio: boolean;
  selfAvatarUrl?: string | null;
  otherAvatarUrl?: string | null;
  otherInitial: string;
}) {
  const base =
    'max-w-[min(78%,calc(100%-2.75rem))] rounded-2xl px-4 py-2.5 font-body text-[0.92rem] leading-[1.5] whitespace-pre-wrap break-words shadow-[0_6px_20px_-14px_rgba(28,28,25,0.3)]';
  const own = mensaje.failed
    ? 'bg-[#b2675e]/85 text-white'
    : 'bg-primary text-on-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_10px_24px_-12px_rgba(75,100,95,0.45)] dark:bg-primary-dark dark:text-white';
  const other =
    'bg-zinc-200 text-zinc-900 ring-1 ring-inset ring-zinc-300/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_6px_18px_-12px_rgba(28,28,25,0.18)] dark:bg-zinc-800 dark:text-white/95 dark:ring-white/12 dark:shadow-none';

  const adjuntos = mensaje.adjuntos ?? [];
  const hideBodyLine = isAutoAttachmentCaption(mensaje.body, adjuntos);
  const label = (n: string): string => formatChatAttachmentDisplayName(n);

  return (
    <div className={`my-1 flex items-end gap-2 ${esMio ? 'justify-end' : 'justify-start'}`}>
      {!esMio ? (
        <ChatThumb
          url={otherAvatarUrl}
          fallbackLetter={otherInitial}
          align="left"
        />
      ) : null}
      <div className={`${base} ${esMio ? own : other} ${mensaje.pending ? 'opacity-70' : ''}`}>
        {!hideBodyLine && mensaje.body.trim() ? (
          <p className="whitespace-pre-wrap break-words">{messageBodyWithLinks(mensaje.body, esMio)}</p>
        ) : null}
        {adjuntos.length > 0 ? (
          <ul className="mt-2 flex flex-col gap-1.5">
            {adjuntos.map((a) => (
              <li key={a.id}>
                {a.tipo === 'audio' && a.signed_url ? (
                  <div className="w-full min-w-0 max-w-[min(100%,280px)]">
                    <audio
                      controls
                      preload="metadata"
                      src={a.signed_url}
                      title={label(a.nombre)}
                      className="min-h-11 w-full"
                    />
                  </div>
                ) : a.tipo === 'imagen' && a.signed_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <a href={a.signed_url} target="_blank" rel="noreferrer" title={label(a.nombre)}>
                    <img
                      src={a.signed_url}
                      alt={label(a.nombre)}
                      loading="lazy"
                      decoding="async"
                      className="max-h-56 max-w-full rounded-xl object-cover ring-1 ring-inset ring-white/40"
                    />
                  </a>
                ) : a.signed_url ? (
                  <a
                    href={a.signed_url}
                    target="_blank"
                    rel="noreferrer"
                    title={label(a.nombre)}
                    className={`inline-flex min-w-0 max-w-full items-center gap-2 rounded-xl px-3 py-1.5 ring-1 ring-inset transition ${
                      esMio
                        ? 'bg-white/15 ring-white/20 text-on-primary hover:bg-white/25'
                        : 'bg-white ring-ink/10 text-ink hover:bg-white/80 dark:bg-white/10 dark:text-white dark:ring-white/15'
                    }`}
                  >
                    <span
                      className="material-symbols-outlined shrink-0 text-[1rem]"
                      aria-hidden="true"
                    >
                      {a.mime === 'application/pdf' ? 'picture_as_pdf' : 'attach_file'}
                    </span>
                    <span className="min-w-0 break-words font-body text-[0.8rem]">
                      {label(a.nombre)}
                    </span>
                  </a>
                ) : (
                  <span
                    className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 font-body text-[0.78rem] opacity-70 ring-1 ring-inset ${
                      esMio ? 'ring-white/20' : 'ring-ink/10 dark:ring-white/15'
                    }`}
                  >
                    <span
                      className="material-symbols-outlined text-[1rem]"
                      aria-hidden="true"
                    >
                      lock
                    </span>
                    {label(a.nombre)} (no disponible)
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : null}
        <p
          className={`mt-1 flex items-center gap-1 font-body text-[0.62rem] tabular-nums ${
            esMio ? 'justify-end text-on-primary/75' : 'justify-start text-zinc-600 dark:text-white/55'
          }`}
        >
          {timeFormatter.format(new Date(mensaje.created_at))}
          {esMio && mensaje.pending ? (
            <span className="material-symbols-outlined text-[0.8rem]" aria-hidden="true">
              schedule
            </span>
          ) : esMio && mensaje.failed ? (
            <span className="material-symbols-outlined text-[0.8rem]" aria-hidden="true">
              error
            </span>
          ) : esMio && mensaje.read_at ? (
            <span className="material-symbols-outlined text-[0.85rem]" aria-hidden="true">
              done_all
            </span>
          ) : esMio ? (
            <span className="material-symbols-outlined text-[0.85rem]" aria-hidden="true">
              done
            </span>
          ) : null}
        </p>
      </div>
      {esMio ? (
        <ChatThumb url={selfAvatarUrl} fallbackLetter="" align="right" />
      ) : null}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Agrupado por día (labels tipo 'Hoy' / 'Ayer' / '14 abr')
// ───────────────────────────────────────────────────────────────────────────
interface Grupo {
  readonly key: string;
  readonly label: string;
  readonly mensajes: readonly ChatMensaje[];
}

function groupByDay(mensajes: readonly ChatMensaje[]): readonly Grupo[] {
  const out: Grupo[] = [];
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  for (const m of mensajes) {
    const d = new Date(m.created_at);
    const key = dayKeyFormatter.format(d);
    const last = out[out.length - 1];
    if (!last || last.key !== key) {
      const label = isSameLocalDay(d, today)
        ? 'Hoy'
        : isSameLocalDay(d, yesterday)
          ? 'Ayer'
          : dayLabelFormatter.format(d);
      out.push({ key, label, mensajes: [m] });
    } else {
      (last.mensajes as ChatMensaje[]).push(m);
    }
  }
  return out;
}
