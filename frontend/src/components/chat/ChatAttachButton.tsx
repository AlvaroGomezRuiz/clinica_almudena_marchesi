'use client';

/**
 * Añade archivo al chat: vista previa (imágenes) y carga a `/api/mensajes/attach`.
 */

import { useCallback, useEffect, useRef, useState, useTransition, type JSX } from 'react';
import { useRouter } from 'next/navigation';

import {
  CHAT_ATTACH_TOOLTIP,
  formatFileSizeForChat,
} from '@/lib/chat/chat-composer-copy';
import { formatChatAttachmentDisplayName } from '@/lib/chat/format-chat-attachment-name';
import { cn } from '@/lib/utils';

interface Props {
  readonly conversationId: string;
  readonly disabled?: boolean;
  readonly onUploaded?: (mensajeId: string) => void;
}

const ACCEPT =
  'image/png,image/jpeg,image/webp,image/heic,application/pdf,audio/webm,audio/ogg,audio/mpeg,audio/mp3,audio/mp4,audio/x-m4a,audio/aac';

function isImageMime(mime: string): boolean {
  return mime.startsWith('image/');
}

export default function ChatAttachButton({
  conversationId,
  disabled,
  onUploaded,
}: Props): JSX.Element {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const lightboxRef = useRef<HTMLDialogElement | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imagePreviewBroken, setImagePreviewBroken] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const openLightbox = useCallback((): void => {
    lightboxRef.current?.showModal();
  }, []);

  const closeLightbox = useCallback((): void => {
    lightboxRef.current?.close();
  }, []);

  const pick = (): void => {
    if (disabled || isPending) return;
    fileRef.current?.click();
  };

  const clearPending = useCallback((): void => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPendingFile(null);
    setError(null);
    setImagePreviewBroken(false);
    if (fileRef.current) fileRef.current.value = '';
    closeLightbox();
  }, [closeLightbox, previewUrl]);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setImagePreviewBroken(false);
    const url = isImageMime(file.type) ? URL.createObjectURL(file) : null;
    setPendingFile(file);
    setPreviewUrl(url);
    if (fileRef.current) fileRef.current.value = '';
  };

  const uploadPending = (): void => {
    if (!pendingFile || disabled || isPending) return;
    const file = pendingFile;
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
        const body = (await res.json()) as {
          ok?: boolean;
          error?: string;
          mensaje_id?: string;
        };
        if (!res.ok || !body.ok) {
          setError(body.error ?? `HTTP ${res.status}`);
          return;
        }
        clearPending();
        if (body.mensaje_id) onUploaded?.(body.mensaje_id);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'error_red');
      }
    });
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT}
        onChange={onFile}
        className="hidden"
        aria-label={CHAT_ATTACH_TOOLTIP}
      />

      {pendingFile ? (
        <div className="mb-2 w-full min-w-0 basis-full space-y-2">
          {previewUrl && isImageMime(pendingFile.type) && !imagePreviewBroken ? (
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={openLightbox}
                className="group relative overflow-hidden rounded-2xl ring-1 ring-inset ring-ink/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/50 dark:ring-white/10"
                aria-label="Ampliar vista previa de la imagen"
              >
                <img
                  src={previewUrl}
                  alt=""
                  onError={() => {
                    setImagePreviewBroken(true);
                  }}
                  className="max-h-44 w-full object-contain transition group-hover:brightness-[0.98] dark:group-hover:brightness-110"
                />
                <span
                  className="pointer-events-none absolute inset-0 flex items-end justify-end bg-gradient-to-t from-ink/25 to-transparent p-2"
                  aria-hidden
                >
                  <span className="rounded-full bg-white/80 px-2 py-0.5 font-body text-[0.62rem] text-ink shadow dark:bg-ink/80 dark:text-white">
                    Ampliar
                  </span>
                </span>
              </button>
              <p className="text-center font-body text-[0.62rem] text-ink-muted dark:text-white/50">
                Vista previa. Pulsa en la imagen o en «Ampliar» para verla en grande.
              </p>
            </div>
          ) : null}

          {previewUrl && isImageMime(pendingFile.type) && imagePreviewBroken ? (
            <p className="text-center font-body text-[0.7rem] text-ink-muted dark:text-white/55" role="status">
              No se pudo previsualizar este tipo de imagen. El archivo se puede enviar
              igualmente.
            </p>
          ) : null}

          <div
            className={cn(
              'flex w-full min-w-0 items-center gap-3 rounded-2xl bg-white/70 px-3 py-2 ring-1 ring-inset ring-ink/10',
              'dark:bg-white/5 dark:ring-white/10',
              (previewUrl && isImageMime(pendingFile.type) && !imagePreviewBroken) && 'pt-0'
            )}
          >
            {!isImageMime(pendingFile.type) || imagePreviewBroken ? (
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-ink/5 dark:bg-white/10">
                <span
                  className="material-symbols-outlined text-ink-muted dark:text-white/55"
                  aria-hidden
                >
                  {pendingFile.type === 'application/pdf'
                    ? 'picture_as_pdf'
                    : pendingFile.type.startsWith('audio/')
                      ? 'graphic_eq'
                      : 'description'}
                </span>
              </span>
            ) : null}

            <div className="min-w-0 flex-1">
              <p
                className="truncate font-body text-[0.8rem] font-medium text-ink dark:text-white"
                title={pendingFile.name}
              >
                {formatChatAttachmentDisplayName(pendingFile.name)}
              </p>
              <p className="font-body text-[0.68rem] text-ink-muted dark:text-white/50">
                {isImageMime(pendingFile.type) ? 'Imagen' : pendingFile.type || 'Archivo'}
                {pendingFile.size > 0 ? ` · ${formatFileSizeForChat(pendingFile.size)}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={clearPending}
              disabled={isPending}
              className="shrink-0 rounded-full p-2 text-ink-muted hover:bg-ink/5 dark:text-white/55 dark:hover:bg-white/10"
              aria-label="Quitar el archivo y no enviarlo"
            >
              <span className="material-symbols-outlined text-[1.1rem]" aria-hidden>
                close
              </span>
            </button>
            <button
              type="button"
              onClick={uploadPending}
              disabled={isPending || disabled}
              className="shrink-0 rounded-full bg-primary px-3 py-2 font-body text-[0.72rem] font-semibold text-on-primary disabled:opacity-40"
            >
              {isPending ? '…' : 'Enviar con el mensaje'}
            </button>
          </div>

          {previewUrl && isImageMime(pendingFile.type) && !imagePreviewBroken ? (
            <dialog
              ref={lightboxRef}
              className="w-[min(100vw-1.5rem,56rem)] max-w-none rounded-2xl border-0 bg-[#0d0c0a]/80 p-3 text-white shadow-2xl backdrop:bg-ink/60"
              aria-labelledby="lightbox-attach-title"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2
                  id="lightbox-attach-title"
                  className="min-w-0 truncate font-body text-[0.85rem] text-white/90"
                >
                  {formatChatAttachmentDisplayName(pendingFile.name)}
                </h2>
                <button
                  type="button"
                  onClick={closeLightbox}
                  className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 font-body text-[0.7rem] hover:bg-white/20"
                >
                  Cerrar
                </button>
              </div>
              <img
                src={previewUrl}
                alt=""
                className="max-h-[min(78vh,720px)] w-full rounded-xl object-contain"
              />
            </dialog>
          ) : null}
        </div>
      ) : null}

      <button
        type="button"
        onClick={pick}
        disabled={disabled || isPending}
        aria-label={CHAT_ATTACH_TOOLTIP}
        title={error != null && error.length > 0 ? `Problema: ${error}` : CHAT_ATTACH_TOOLTIP}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/55 text-ink-soft ring-1 ring-inset ring-white/50 transition hover:bg-white/90 hover:text-primary disabled:opacity-40 dark:bg-white/5 dark:text-white/60 dark:ring-white/10 dark:hover:bg-white/10 dark:hover:text-primary"
      >
        <span className="material-symbols-outlined text-[1.15rem]" aria-hidden="true">
          {isPending ? 'sync' : 'attach_file'}
        </span>
      </button>
    </>
  );
}
