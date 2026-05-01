'use client';

/**
 * Vista previa de imagen de chat en pantalla completa (portal a `document.body`).
 * Fondo oscuro, zoom con rueda, botones +/- y pellizco en táctil. No abre pestaña nueva.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface ChatImagePreviewModalProps {
  readonly open: boolean;
  readonly src: string;
  readonly alt: string;
  readonly onClose: () => void;
}

const SCALE_MIN = 0.5;
const SCALE_MAX = 4;
const SCALE_STEP = 0.25;

function touchDistance(a: React.Touch, b: React.Touch): number {
  const dx = a.clientX - b.clientX;
  const dy = a.clientY - b.clientY;
  return Math.hypot(dx, dy);
}

export default function ChatImagePreviewModal({
  open,
  src,
  alt,
  onClose,
}: ChatImagePreviewModalProps): JSX.Element | null {
  const [scale, setScale] = useState(1);
  const scaleRef = useRef(1);
  const pinch = useRef<{ startDist: number; startScale: number } | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  scaleRef.current = scale;

  useEffect(() => {
    if (!open) {
      setScale(1);
      pinch.current = null;
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
  }, [open, src]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const zoomIn = useCallback((): void => {
    setScale((s) => Math.min(SCALE_MAX, Math.round((s + SCALE_STEP) * 100) / 100));
  }, []);

  const zoomOut = useCallback((): void => {
    setScale((s) => Math.max(SCALE_MIN, Math.round((s - SCALE_STEP) * 100) / 100));
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>): void => {
    if (e.touches.length === 2) {
      pinch.current = {
        startDist: touchDistance(e.touches[0], e.touches[1]),
        startScale: scaleRef.current,
      };
    }
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>): void => {
    if (e.touches.length !== 2 || !pinch.current) return;
    const d = touchDistance(e.touches[0], e.touches[1]);
    if (pinch.current.startDist < 8) return;
    const ratio = d / pinch.current.startDist;
    const next = Math.min(SCALE_MAX, Math.max(SCALE_MIN, pinch.current.startScale * ratio));
    setScale(Math.round(next * 100) / 100);
    e.preventDefault();
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>): void => {
    if (e.touches.length < 2) pinch.current = null;
  }, []);

  const onWheel = useCallback((e: React.WheelEvent<HTMLDivElement>): void => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -SCALE_STEP : SCALE_STEP;
    setScale((s) => Math.min(SCALE_MAX, Math.max(SCALE_MIN, Math.round((s + delta) * 100) / 100)));
  }, []);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[260] flex flex-col bg-black/85 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Vista previa de imagen"
    >
      <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <p className="min-w-0 truncate font-body text-[0.78rem] text-white/80" title={alt}>
          {alt}
        </p>
        <div className="flex items-center gap-2">
          <span className="hidden font-body text-[0.72rem] text-white/50 sm:inline" aria-hidden="true">
            Rueda o Ctrl+rueda · pellizco en móvil
          </span>
          <button
            type="button"
            onClick={zoomOut}
            disabled={scale <= SCALE_MIN}
            className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/20 transition hover:bg-white/20 disabled:opacity-40"
            aria-label="Alejar"
          >
            <span className="material-symbols-outlined text-[1.25rem]" aria-hidden="true">
              remove
            </span>
          </button>
          <span className="w-12 text-center font-body text-[0.75rem] tabular-nums text-white/90">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={zoomIn}
            disabled={scale >= SCALE_MAX}
            className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/20 transition hover:bg-white/20 disabled:opacity-40"
            aria-label="Acercar"
          >
            <span className="material-symbols-outlined text-[1.25rem]" aria-hidden="true">
              add
            </span>
          </button>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="ml-1 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/20 transition hover:bg-white/20"
            aria-label="Cerrar vista previa"
          >
            <span className="material-symbols-outlined text-[1.2rem]" aria-hidden="true">
              close
            </span>
          </button>
        </div>
      </div>

      <button
        type="button"
        className="relative min-h-0 flex-1 cursor-zoom-out border-0 bg-transparent p-0"
        onClick={onClose}
        aria-label="Cerrar (pulsar fuera de la imagen)"
      >
        <div
          role="presentation"
          className="pointer-events-auto absolute inset-4 flex touch-manipulation items-center justify-center overflow-auto overscroll-contain sm:inset-8"
          onClick={(ev) => ev.stopPropagation()}
          onWheel={onWheel}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada Supabase; lightbox no usa optimization LCP */}
          <img
            src={src}
            alt={alt}
            className="max-h-none max-w-none select-none"
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'center center',
            }}
            draggable={false}
          />
        </div>
      </button>
    </div>,
    document.body
  );
}
