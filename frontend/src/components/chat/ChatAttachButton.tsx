'use client';

/**
 * ChatAttachButton — botón clip para adjuntar imagen/PDF al chat.
 *
 * Sube vía /api/mensajes/attach, que crea el mensaje + el registro adjunto.
 * Refresca server-side para que el nuevo mensaje aparezca en la lista.
 */

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  readonly conversationId: string;
  readonly disabled?: boolean;
}

const ACCEPT = 'image/png,image/jpeg,image/webp,image/heic,application/pdf';

export default function ChatAttachButton({
  conversationId,
  disabled,
}: Props): JSX.Element {
  const router = useRouter();
  const ref = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const pick = (): void => {
    if (disabled || isPending) return;
    ref.current?.click();
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    const form = new FormData();
    form.append('file', file);
    form.append('conversation_id', conversationId);

    startTransition(async () => {
      try {
        const res = await fetch('/api/mensajes/attach', {
          method: 'POST',
          body: form,
        });
        const body = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !body.ok) {
          setError(body.error ?? `HTTP ${res.status}`);
          return;
        }
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'error_red');
      } finally {
        if (ref.current) ref.current.value = '';
      }
    });
  };

  return (
    <>
      <input
        ref={ref}
        type="file"
        accept={ACCEPT}
        onChange={onFile}
        className="hidden"
      />
      <button
        type="button"
        onClick={pick}
        disabled={disabled || isPending}
        aria-label="Adjuntar archivo"
        title={error ? `Error: ${error}` : 'Adjuntar imagen o PDF'}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/55 text-ink-soft ring-1 ring-inset ring-white/50 transition hover:bg-white/90 hover:text-primary disabled:opacity-40 dark:bg-white/5 dark:text-white/60 dark:ring-white/10 dark:hover:bg-white/10 dark:hover:text-primary"
      >
        <span
          className="material-symbols-outlined text-[1.15rem]"
          aria-hidden="true"
        >
          {isPending ? 'sync' : 'attach_file'}
        </span>
      </button>
    </>
  );
}
