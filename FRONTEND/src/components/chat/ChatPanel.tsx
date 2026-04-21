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

import { format, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
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
} from 'react';

import ChatAttachButton from '@/components/chat/ChatAttachButton';
import { createBrowserClient } from '@/lib/supabase/client';
import { marcarLeidosAction, sendMensajeAction } from '@/services/mensajes/actions';

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
  readonly body_ciphertext: string;
  readonly created_at: string;
  readonly read_at: string | null;
  readonly adjuntos?: readonly ChatAdjunto[];
  readonly pending?: boolean;
  readonly failed?: boolean;
}

interface ChatPanelProps {
  readonly conversacionId: string;
  readonly currentUserId: string;
  readonly initialMensajes: readonly ChatMensaje[];
  readonly otherLabel: string;
  readonly otherSubtitle?: string;
}

const MAX_LENGTH = 4000;
const NEAR_BOTTOM_PX = 120;

export default function ChatPanel({
  conversacionId,
  currentUserId,
  initialMensajes,
  otherLabel,
  otherSubtitle,
}: ChatPanelProps) {
  const [mensajes, setMensajes] = useState<readonly ChatMensaje[]>(initialMensajes);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const listRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  // Memoizamos el cliente Supabase (singleton por render de vida del componente)
  const supabase = useMemo(() => createBrowserClient(), []);

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

  // ───── Suscripción Realtime ─────
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
        (payload) => {
          const m = payload.new as ChatMensaje;
          setMensajes((prev) => {
            if (prev.some((x) => x.id === m.id)) return prev;
            const withoutOptimistic = prev.filter(
              (x) => !(x.pending && x.body_ciphertext === m.body_ciphertext && x.sender_user_id === m.sender_user_id)
            );
            return [...withoutOptimistic, m];
          });

          if (m.sender_user_id !== currentUserId) {
            marcarLeidosAction(conversacionId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, conversacionId, currentUserId]);

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
        body_ciphertext: trimmed,
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
        });
      });
    },
    [conversacionId, currentUserId]
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
      className="relative flex h-[calc(100vh-220px)] min-h-[480px] flex-col overflow-hidden rounded-[1.625rem] bg-white/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_20px_48px_-24px_rgba(75,100,95,0.14)] backdrop-blur-xl dark:bg-[#161616]/80 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_20px_48px_-24px_rgba(0,0,0,0.6)]"
      aria-label="Conversación de chat"
    >
      {/* Cabecera */}
      <header className="flex items-center justify-between gap-3 px-6 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-2xl bg-primary/10 ring-1 ring-inset ring-primary/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] dark:bg-primary/25 dark:ring-primary/30 dark:shadow-none">
            <span className="material-symbols-outlined text-[1.25rem] text-primary dark:text-white" aria-hidden="true">
              person
            </span>
          </span>
          <div className="min-w-0">
            <p className="font-display text-[1.05rem] italic text-ink leading-tight tracking-[-0.01em] truncate dark:text-white">
              {otherLabel}
            </p>
            {otherSubtitle ? (
              <p className="font-body text-[0.72rem] text-ink-muted truncate dark:text-white/55">{otherSubtitle}</p>
            ) : null}
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/50 ring-1 ring-inset ring-white/50 px-2.5 py-1 backdrop-blur-md dark:bg-white/5 dark:ring-white/10">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" aria-hidden="true" />
          <span className="font-body text-[0.65rem] uppercase tracking-[0.18em] text-ink-soft dark:text-white/60">
            En vivo
          </span>
        </span>
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
                  <Burbuja key={m.id} mensaje={m} esMio={m.sender_user_id === currentUserId} />
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

        <div className="flex items-end gap-2">
          <ChatAttachButton
            conversationId={conversacionId}
            disabled={isPending}
          />
          <textarea
            name="mensaje"
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onTextareaKey}
            placeholder="Escribe un mensaje… (Enter para enviar · Shift+Enter salto)"
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

        <p className="mt-1.5 flex items-center justify-between font-body text-[0.65rem] text-ink-muted dark:text-white/55">
          <span>Los mensajes se envían cifrados en tránsito (TLS) y quedan archivados.</span>
          <span className="tabular-nums">
            {draft.length}/{MAX_LENGTH}
          </span>
        </p>
      </form>
    </section>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Burbuja individual
// ───────────────────────────────────────────────────────────────────────────
function Burbuja({ mensaje, esMio }: { mensaje: ChatMensaje; esMio: boolean }) {
  const base =
    'max-w-[78%] rounded-2xl px-4 py-2.5 font-body text-[0.92rem] leading-[1.5] whitespace-pre-wrap break-words shadow-[0_6px_20px_-14px_rgba(28,28,25,0.3)]';
  const own = mensaje.failed
    ? 'bg-[#b2675e]/85 text-white'
    : 'bg-primary text-on-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_10px_24px_-12px_rgba(75,100,95,0.45)] dark:bg-primary-dark dark:text-white';
  const other =
    'bg-white text-ink ring-1 ring-inset ring-ink/6 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_8px_20px_-14px_rgba(28,28,25,0.2)] dark:bg-white/5 dark:text-white dark:ring-white/10 dark:shadow-none';

  const adjuntos = mensaje.adjuntos ?? [];

  return (
    <div className={`my-1 flex ${esMio ? 'justify-end' : 'justify-start'}`}>
      <div className={`${base} ${esMio ? own : other} ${mensaje.pending ? 'opacity-70' : ''}`}>
        <p>{mensaje.body_ciphertext}</p>
        {adjuntos.length > 0 ? (
          <ul className="mt-2 flex flex-col gap-1.5">
            {adjuntos.map((a) => (
              <li key={a.id}>
                {a.tipo === 'imagen' && a.signed_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <a href={a.signed_url} target="_blank" rel="noreferrer">
                    <img
                      src={a.signed_url}
                      alt={a.nombre}
                      className="max-h-56 max-w-full rounded-xl object-cover ring-1 ring-inset ring-white/40"
                    />
                  </a>
                ) : a.signed_url ? (
                  <a
                    href={a.signed_url}
                    target="_blank"
                    rel="noreferrer"
                    className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 ring-1 ring-inset transition ${
                      esMio
                        ? 'bg-white/15 ring-white/20 text-on-primary hover:bg-white/25'
                        : 'bg-white ring-ink/10 text-ink hover:bg-white/80 dark:bg-white/10 dark:text-white dark:ring-white/15'
                    }`}
                  >
                    <span
                      className="material-symbols-outlined text-[1rem]"
                      aria-hidden="true"
                    >
                      {a.mime === 'application/pdf' ? 'picture_as_pdf' : 'attach_file'}
                    </span>
                    <span className="max-w-[220px] truncate font-body text-[0.8rem]">
                      {a.nombre}
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
                    {a.nombre} (no disponible)
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : null}
        <p
          className={`mt-1 flex items-center gap-1 font-body text-[0.62rem] tabular-nums ${
            esMio ? 'justify-end text-on-primary/75' : 'text-ink-muted'
          }`}
        >
          {format(new Date(mensaje.created_at), 'HH:mm')}
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
    const key = format(d, 'yyyy-MM-dd');
    const last = out[out.length - 1];
    if (!last || last.key !== key) {
      const label = isSameDay(d, today)
        ? 'Hoy'
        : isSameDay(d, yesterday)
          ? 'Ayer'
          : format(d, "d 'de' MMMM", { locale: es });
      out.push({ key, label, mensajes: [m] });
    } else {
      (last.mensajes as ChatMensaje[]).push(m);
    }
  }
  return out;
}
