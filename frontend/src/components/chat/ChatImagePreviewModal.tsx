'use client';

/**
 * Vista previa de imagen tipo WhatsApp: fondo negro, imagen encajada en pantalla,
 * pellizco para zoom (mínimo = encaje). En escritorio: rueda y controles +/- opcionales.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface ChatImagePreviewModalProps {
  readonly open: boolean;
  readonly src: string;
  readonly alt: string;
  readonly onClose: () => void;
}

const SCALE_MIN = 1;
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
  const backRef = useRef<HTMLButtonElement>(null);

  scaleRef.current = scale;

  useEffect(() => {
    if (!open) {
      setScale(1);
      pinch.current = null;
      return;
    }
    setScale(1);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, src]);

  useEffect(() => {
    if (!open) return;
    backRef.current?.focus();
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
      className="fixed inset-0 z-[260] flex h-[100dvh] max-h-[100dvh] flex-col bg-black"
      role="dialog"
      aria-modal="true"
      aria-label="Vista previa de imagen"
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-white/10 bg-black pt-[max(0.5rem,env(safe-area-inset-top))] pr-[max(0.75rem,env(safe-area-inset-right))] pb-3 pl-[max(0.5rem,env(safe-area-inset-left))]">
        <button
          ref={backRef}
          type="button"
          onClick={onClose}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-white transition hover:bg-white/10"
          aria-label="Volver al chat"
        >
          <span className="material-symbols-outlined text-[1.35rem]" aria-hidden="true">
            arrow_back
          </span>
        </button>
        <p className="min-w-0 flex-1 truncate text-center font-body text-[0.88rem] font-medium text-white/95" title={alt}>
          {alt}
        </p>
        <div className="hidden items-center gap-1 md:flex">
          <span className="pr-1 font-body text-[0.65rem] text-white/45" aria-hidden="true">
            Rueda
          </span>
          <button
            type="button"
            onClick={zoomOut}
            disabled={scale <= SCALE_MIN}
            className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/15 transition hover:bg-white/20 disabled:opacity-40"
            aria-label="Alejar"
          >
            <span className="material-symbols-outlined text-[1.25rem]" aria-hidden="true">
              remove
            </span>
          </button>
          <span className="w-11 text-center font-body text-[0.7rem] tabular-nums text-white/80">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={zoomIn}
            disabled={scale >= SCALE_MAX}
            className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/15 transition hover:bg-white/20 disabled:opacity-40"
            aria-label="Acercar"
          >
            <span className="material-symbols-outlined text-[1.25rem]" aria-hidden="true">
              add
            </span>
          </button>
        </div>
        <div className="h-11 w-11 shrink-0 md:hidden" aria-hidden="true" />
      </header>

      <button
        type="button"
        className="relative min-h-0 flex-1 cursor-default border-0 bg-black p-0"
        onClick={onClose}
        aria-label="Cerrar (pulsar fuera de la imagen)"
      >
        <div
          role="presentation"
          className="pointer-events-auto absolute inset-0 flex min-h-0 touch-manipulation items-center justify-center overflow-auto overscroll-contain"
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
            className="box-border max-h-full max-w-full select-none object-contain"
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
