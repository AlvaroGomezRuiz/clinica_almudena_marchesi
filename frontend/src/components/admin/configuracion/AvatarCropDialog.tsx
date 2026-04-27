'use client';

/**
 * Modal de recorte circular + zoom antes de subir el avatar (patrón tipo
 * “Tu Calle”, adaptado a tokens del portal: canvas cálido, tipografía existente).
 *
 * Renderiza el overlay con ReactDOM.createPortal para que salga del stacking
 * context creado por backdrop-blur del SurfaceCard padre y quede sobre todo.
 */

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';

import 'react-easy-crop/react-easy-crop.css';

import { getCroppedImageBlob } from '@/lib/avatar-crop';

interface Props {
  readonly open: boolean;
  readonly imageSrc: string;
  readonly onCancel: () => void;
  readonly onConfirm: (jpegBlob: Blob) => void;
}

export default function AvatarCropDialog({
  open,
  imageSrc,
  onCancel,
  onConfirm,
}: Props): JSX.Element | null {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const onCropComplete = useCallback((_area: Area, px: Area) => {
    setCroppedAreaPixels(px);
  }, []);

  const handleGuardar = async (): Promise<void> => {
    if (!croppedAreaPixels) return;
    setBusy(true);
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels, {
        maxSide: 512,
        quality: 0.9,
      });
      onConfirm(blob);
    } finally {
      setBusy(false);
    }
  };

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-ink/60 p-0 backdrop-blur-xl dark:bg-black/75 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="avatar-crop-title"
    >
      <div className="relative max-h-[min(100dvh,640px)] w-full max-w-lg overflow-y-auto overflow-x-hidden rounded-t-3xl border border-white/15 bg-canvas shadow-[0_24px_80px_-24px_rgba(0,0,0,0.45)] dark:border-white/10 dark:bg-[#161514] sm:rounded-3xl">
        <div className="border-b border-ink/8 px-5 py-4 dark:border-white/10">
          <h2
            id="avatar-crop-title"
            className="font-display text-[1.1rem] italic tracking-[-0.02em] text-ink dark:text-white"
          >
            Ajustar foto de perfil
          </h2>
          <p className="mt-1.5 font-body text-[0.8rem] leading-relaxed text-ink-soft dark:text-white/65">
            Encuadra la cara. Para mejor calidad, usa una imagen clara; el archivo
            final se comprime (máx. 2 MB al subir).
          </p>
        </div>

        <div className="relative mx-auto h-[min(52vh,380px)] w-full bg-ink/[0.04] dark:bg-white/[0.04]">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="flex flex-col gap-4 border-t border-ink/8 px-5 py-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <button
              type="button"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-ink/12 bg-white/70 text-ink transition hover:bg-white dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
              onClick={() => setZoom((z) => Math.max(1, z - 0.1))}
              aria-label="Alejar"
            >
              <span className="material-symbols-outlined text-[1.1rem]">remove</span>
            </button>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="h-1.5 min-w-0 flex-1 cursor-pointer accent-primary"
              aria-label="Zoom del recorte"
            />
            <button
              type="button"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-ink/12 bg-white/70 text-ink transition hover:bg-white dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
              onClick={() => setZoom((z) => Math.min(3, z + 0.1))}
              aria-label="Acercar"
            >
              <span className="material-symbols-outlined text-[1.1rem]">add</span>
            </button>
          </div>

          <div className="flex shrink-0 justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="rounded-full bg-white/70 px-4 py-2 font-body text-[0.82rem] text-ink-soft ring-1 ring-inset ring-ink/10 transition hover:bg-white hover:text-ink disabled:opacity-50 dark:bg-white/10 dark:text-white/75 dark:ring-white/15 dark:hover:bg-white/15 dark:hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleGuardar()}
              disabled={busy || !croppedAreaPixels}
              className="rounded-full bg-ink px-5 py-2 font-body text-[0.82rem] font-medium text-canvas transition hover:bg-ink-soft disabled:opacity-50 dark:bg-white dark:text-ink dark:hover:bg-white/90"
            >
              {busy ? 'Procesando…' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
