'use client';

/**
 * Vista previa de imagen tipo WhatsApp: encaje en pantalla, zoom por pellizco y botones.
 * Accesible: foco atrapado, ARIA, anuncios del nivel de zoom, teclado (+/-/0/Escape).
 */

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
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
const ZOOM_ANNOUNCE_DEBOUNCE_MS = 400;

function touchDistance(a: React.Touch, b: React.Touch): number {
  const dx = a.clientX - b.clientX;
  const dy = a.clientY - b.clientY;
  return Math.hypot(dx, dy);
}

function getFocusableElements(root: HTMLElement): readonly HTMLElement[] {
  const sel =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  return Array.from(root.querySelectorAll<HTMLElement>(sel)).filter((node) => {
    if (node.hasAttribute('disabled')) return false;
    if (node.tabIndex < 0) return false;
    return node.getAttribute('aria-hidden') !== 'true';
  });
}

export default function ChatImagePreviewModal({
  open,
  src,
  alt,
  onClose,
}: ChatImagePreviewModalProps): JSX.Element | null {
  const [scale, setScale] = useState(1);
  const [zoomAnnouncement, setZoomAnnouncement] = useState('');
  const scaleRef = useRef(1);
  const pinch = useRef<{ startDist: number; startScale: number } | null>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const announceTimerRef = useRef<number | null>(null);

  const titleId = useId();
  const descId = useId();
  const liveZoomId = useId();

  scaleRef.current = scale;

  useEffect(() => {
    if (!open) {
      setScale(1);
      pinch.current = null;
      setZoomAnnouncement('');
      if (announceTimerRef.current !== null) {
        clearTimeout(announceTimerRef.current);
        announceTimerRef.current = null;
      }
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
    const ae = document.activeElement;
    previousFocusRef.current = ae instanceof HTMLElement ? ae : null;
    return () => {
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      backRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(t);
  }, [open, src]);

  useEffect(() => {
    if (!open) return;
    const root = dialogRef.current;
    if (!root) return;

    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key !== 'Tab') return;
      const items = getFocusableElements(root);
      if (items.length === 0) return;
      if (items.length === 1) {
        e.preventDefault();
        items[0].focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey) {
        if (active === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    root.addEventListener('keydown', onKeyDown);
    return () => root.removeEventListener('keydown', onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setScale((s) => Math.min(SCALE_MAX, Math.round((s + SCALE_STEP) * 100) / 100));
        return;
      }
      if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        setScale((s) => Math.max(SCALE_MIN, Math.round((s - SCALE_STEP) * 100) / 100));
        return;
      }
      if (e.key === '0') {
        e.preventDefault();
        setScale(1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    if (announceTimerRef.current !== null) {
      clearTimeout(announceTimerRef.current);
    }
    announceTimerRef.current = window.setTimeout(() => {
      setZoomAnnouncement(`Zoom al ${Math.round(scale * 100)} por ciento`);
      announceTimerRef.current = null;
    }, ZOOM_ANNOUNCE_DEBOUNCE_MS);
    return () => {
      if (announceTimerRef.current !== null) {
        clearTimeout(announceTimerRef.current);
      }
    };
  }, [scale, open]);

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
      ref={dialogRef}
      className="fixed inset-0 z-[260] flex h-[100dvh] max-h-[100dvh] flex-col bg-black"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
    >
      <p id={descId} className="sr-only">
        Vista a pantalla completa. Usa el botón volver o Escape para cerrar. Teclas más y menos
        amplían y reducen; cero restablece el zoom. También puedes usar la rueda del ratón o el
        gesto de pellizco en pantallas táctiles.
      </p>

      <div
        id={liveZoomId}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {zoomAnnouncement}
      </div>

      <header className="flex shrink-0 items-center gap-1 border-b border-white/10 bg-black pt-[max(0.5rem,env(safe-area-inset-top))] pr-[max(0.5rem,env(safe-area-inset-right))] pb-3 pl-[max(0.5rem,env(safe-area-inset-left))]">
        <button
          ref={backRef}
          type="button"
          onClick={onClose}
          className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-full text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          aria-label="Volver al chat"
        >
          <span className="material-symbols-outlined text-[1.35rem]" aria-hidden="true">
            arrow_back
          </span>
        </button>
        <p
          id={titleId}
          role="heading"
          aria-level={1}
          className="min-w-0 flex-1 truncate px-1 text-center font-body text-[0.88rem] font-medium text-white/95"
          title={alt}
        >
          {alt}
        </p>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={zoomOut}
            disabled={scale <= SCALE_MIN}
            className="grid min-h-11 min-w-11 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/15 transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:pointer-events-none disabled:opacity-40"
            aria-label="Alejar imagen"
          >
            <span className="material-symbols-outlined text-[1.25rem]" aria-hidden="true">
              remove
            </span>
          </button>
          <span
            className="hidden w-11 text-center font-body text-[0.7rem] tabular-nums text-white/80 md:inline"
            aria-hidden="true"
          >
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={zoomIn}
            disabled={scale >= SCALE_MAX}
            className="grid min-h-11 min-w-11 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/15 transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:pointer-events-none disabled:opacity-40"
            aria-label="Acercar imagen"
          >
            <span className="material-symbols-outlined text-[1.25rem]" aria-hidden="true">
              add
            </span>
          </button>
        </div>
      </header>

      <div className="relative min-h-0 flex-1 bg-black">
        <div
          role="region"
          aria-label="Imagen del mensaje. Pellizca con dos dedos para cambiar el zoom."
          tabIndex={0}
          className="pointer-events-auto absolute inset-0 flex min-h-0 touch-manipulation items-center justify-center overflow-auto overscroll-contain outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
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
      </div>
    </div>,
    document.body
  );
}
