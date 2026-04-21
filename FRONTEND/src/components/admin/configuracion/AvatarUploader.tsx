'use client';

/**
 * AvatarUploader — sube imagen y actualiza `profiles.avatar_url`.
 * Muestra preview inmediato (objectURL) y gestiona estado de subida.
 */

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  readonly currentUrl: string | null;
  readonly displayName: string;
}

export default function AvatarUploader({
  currentUrl,
  displayName,
}: Props): JSX.Element {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase() ?? '')
    .join('') || 'A';

  const handlePick = (): void => {
    fileRef.current?.click();
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setError('Formato no soportado (PNG/JPG/WebP).');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Máximo 2 MB.');
      return;
    }

    setError(null);
    const url = URL.createObjectURL(file);
    setPreview(url);

    const form = new FormData();
    form.append('file', file);

    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/avatar/upload', {
          method: 'POST',
          body: form,
        });
        const body = (await res.json()) as { ok?: boolean; url?: string; error?: string };
        if (!res.ok || !body.ok) {
          setError(body.error ?? `Error ${res.status}`);
          setPreview(currentUrl);
          return;
        }
        setPreview(body.url ?? preview);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'error_red');
        setPreview(currentUrl);
      }
    });
  };

  return (
    <div className="flex items-center gap-4">
      <div
        className="grid h-16 w-16 place-items-center overflow-hidden rounded-2xl bg-primary/10 font-display text-[1.4rem] italic text-primary ring-1 ring-inset ring-primary/15 dark:bg-primary/25 dark:text-white dark:ring-primary/30"
        aria-hidden="true"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          initials
        )}
      </div>

      <div>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFile}
          className="hidden"
        />
        <button
          type="button"
          onClick={handlePick}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-1.5 font-body text-[0.78rem] text-canvas transition hover:bg-ink-soft disabled:opacity-40 dark:bg-white dark:text-ink dark:hover:bg-white/90"
        >
          <span className="material-symbols-outlined text-[1rem]" aria-hidden="true">
            {isPending ? 'progress_activity' : 'upload'}
          </span>
          {isPending ? 'Subiendo…' : 'Cambiar avatar'}
        </button>
        <p className="mt-1 font-body text-[0.7rem] text-ink-muted dark:text-white/55">
          PNG, JPG o WebP · máx 2 MB
        </p>
        {error ? (
          <p className="mt-1 font-body text-[0.7rem] text-red-600 dark:text-red-400">
            Error: {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
