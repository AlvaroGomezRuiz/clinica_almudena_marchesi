'use client';

/**
 * AvatarUploader — recorte + subida al bucket `avatares` y actualización de
 * `profiles.avatar_url`. El recorte evita fotos desalineadas y reduce peso.
 */

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import AvatarCropDialog from '@/components/admin/configuracion/AvatarCropDialog';

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
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  useEffect(() => {
    setPreview(currentUrl);
  }, [currentUrl]);

  const revokeCrop = (): void => {
    if (cropSrc?.startsWith('blob:')) {
      URL.revokeObjectURL(cropSrc);
    }
  };

  useEffect(() => {
    return () => {
      if (cropSrc?.startsWith('blob:')) {
        URL.revokeObjectURL(cropSrc);
      }
    };
  }, [cropSrc]);

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
    revokeCrop();
    const url = URL.createObjectURL(file);
    setCropSrc(url);
    setCropOpen(true);
    e.target.value = '';
  };

  const handleCropCancel = (): void => {
    revokeCrop();
    setCropSrc(null);
    setCropOpen(false);
  };

  const handleCropConfirm = (jpegBlob: Blob): void => {
    setCropOpen(false);
    revokeCrop();
    setCropSrc(null);

    const localPreview = URL.createObjectURL(jpegBlob);
    setPreview(localPreview);

    const form = new FormData();
    form.append('file', new File([jpegBlob], 'avatar.jpg', { type: 'image/jpeg' }));

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
          URL.revokeObjectURL(localPreview);
          return;
        }
        URL.revokeObjectURL(localPreview);
        setPreview(body.url ?? currentUrl);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'error_red');
        setPreview(currentUrl);
        URL.revokeObjectURL(localPreview);
      }
    });
  };

  return (
    <div className="flex items-center gap-4">
      <AvatarCropDialog
        open={cropOpen && Boolean(cropSrc)}
        imageSrc={cropSrc ?? ''}
        onCancel={handleCropCancel}
        onConfirm={handleCropConfirm}
      />

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
          className="rounded-full bg-ink px-4 py-2 font-body text-[0.78rem] font-medium text-canvas transition hover:bg-ink-soft disabled:opacity-40 dark:bg-white/[0.14] dark:text-white dark:ring-1 dark:ring-inset dark:ring-white/25 dark:hover:bg-white/[0.22]"
        >
          {isPending ? 'Subiendo…' : 'Cambiar avatar'}
        </button>
        <p className="mt-1 font-body text-[0.7rem] text-ink-muted dark:text-white/70">
          PNG, JPG o WebP · máx 2 MB · podrás recortar antes de guardar
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
