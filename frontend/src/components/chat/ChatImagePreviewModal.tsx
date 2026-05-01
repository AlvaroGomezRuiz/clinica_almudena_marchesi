'use client';

/**
 * Galería tipo WhatsApp Web: fondo gris, tap fuera de la imagen cierra,
 * varias imágenes con flechas, miniaturas y gesto de deslizar.
 */

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

export interface ChatImagePreviewSlide {
  readonly src: string;
  readonly alt: string;
}

export interface ChatImagePreviewModalProps {
  readonly open: boolean;
  readonly slides: readonly ChatImagePreviewSlide[];
  readonly initialIndex: number;
  readonly onClose: () => void;
}

/** Fondo oscuro tipo WhatsApp (no negro puro, gris tenue). */
const VIEWER_BG = 'bg-[#1b1b1b]';
const HEADER_BG = 'bg-[#1b1b1b]';
const THUMB_ACTIVE =
  'ring-2 ring-[#25D366] ring-offset-2 ring-offset-[#141414]';

const SCALE_MIN = 1;
const SCALE_MAX = 4;
const SCALE_STEP = 0.25;
const ZOOM_ANNOUNCE_DEBOUNCE_MS = 400;
const SWIPE_PX = 56;

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

function clampSlideIndex(i: number, len: number): number {
  if (len <= 0) return 0;
  return Math.min(Math.max(0, i), len - 1);
}

export default function ChatImagePreviewModal({
  open,
  slides,
  initialIndex,
  onClose,
}: ChatImagePreviewModalProps): JSX.Element | null {
  const safeLen = slides.length;
  const clampIndex = useCallback(
    (i: number): number => {
      if (safeLen <= 0) return 0;
      return Math.min(Math.max(0, i), safeLen - 1);
    },
    [safeLen]
  );

  const [index, setIndex] = useState(() => clampSlideIndex(initialIndex, slides.length));
  const [scale, setScale] = useState(1);
  const [zoomAnnouncement, setZoomAnnouncement] = useState('');
  const [fitted, setFitted] = useState<{ width: number; height: number } | null>(null);

  const scaleRef = useRef(1);
  const pinch = useRef<{ startDist: number; startScale: number } | null>(null);
  const swipeStart = useRef<number | null>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const announceTimerRef = useRef<number | null>(null);

  const titleId = useId();
  const descId = useId();
  const liveZoomId = useId();

  const current = slides[index];
  const src = current?.src ?? '';
  const alt = current?.alt ?? '';
  const hasMany = safeLen > 1;

  scaleRef.current = scale;

  useEffect(() => {
    if (!open) {
      setScale(1);
      setFitted(null);
      pinch.current = null;
      swipeStart.current = null;
      setZoomAnnouncement('');
      if (announceTimerRef.current !== null) {
        clearTimeout(announceTimerRef.current);
        announceTimerRef.current = null;
      }
      return;
    }
    setScale(1);
    setFitted(null);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setScale(1);
    setFitted(null);
  }, [index, open]);

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
  }, [open, index]);

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
  }, [open, hasMany]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (hasMany) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setIndex((i) => clampIndex(i - 1));
          return;
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          setIndex((i) => clampIndex(i + 1));
          return;
        }
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
  }, [open, onClose, hasMany, clampIndex]);

  useEffect(() => {
    if (!open) return;
    if (announceTimerRef.current !== null) {
      clearTimeout(announceTimerRef.current);
    }
    announceTimerRef.current = window.setTimeout(() => {
      const slideMsg = hasMany ? ` Imagen ${index + 1} de ${safeLen}.` : '';
      setZoomAnnouncement(`Zoom al ${Math.round(scale * 100)} por ciento.${slideMsg}`);
      announceTimerRef.current = null;
    }, ZOOM_ANNOUNCE_DEBOUNCE_MS);
    return () => {
      if (announceTimerRef.current !== null) {
        clearTimeout(announceTimerRef.current);
      }
    };
  }, [scale, open, index, hasMany, safeLen]);

  const recalcFit = useCallback((): void => {
    const img = imgRef.current;
    const c = containerRef.current;
    if (!img || !c || img.naturalWidth <= 0 || img.naturalHeight <= 0) return;
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    const cw = c.clientWidth;
    const ch = c.clientHeight;
    if (cw <= 0 || ch <= 0) return;
    const r = Math.min(cw / nw, ch / nh);
    setFitted({ width: nw * r, height: nh * r });
  }, []);

  useLayoutEffect(() => {
    if (!open || !src) return;
    recalcFit();
  }, [open, src, scale, recalcFit]);

  useEffect(() => {
    if (!open) return;
    const c = containerRef.current;
    if (!c) return;
    const ro = new ResizeObserver(() => {
      recalcFit();
    });
    ro.observe(c);
    return () => ro.disconnect();
  }, [open, recalcFit]);

  const goPrev = useCallback((): void => {
    setIndex((i) => clampIndex(i - 1));
  }, [clampIndex]);

  const goNext = useCallback((): void => {
    setIndex((i) => clampIndex(i + 1));
  }, [clampIndex]);

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
      swipeStart.current = null;
      return;
    }
    if (e.touches.length === 1 && pinch.current === null) {
      swipeStart.current = e.touches[0].clientX;
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

  const onTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLDivElement>): void => {
      if (e.touches.length < 2) pinch.current = null;

      if (hasMany && swipeStart.current !== null && e.changedTouches.length === 1) {
        const startX = swipeStart.current;
        swipeStart.current = null;
        const endX = e.changedTouches[0].clientX;
        const dx = endX - startX;
        if (scaleRef.current <= 1.02 && Math.abs(dx) > SWIPE_PX) {
          if (dx < 0) goNext();
          else goPrev();
        }
      } else if (e.touches.length === 0) {
        swipeStart.current = null;
      }
    },
    [hasMany, goNext, goPrev]
  );

  const onWheel = useCallback((e: React.WheelEvent<HTMLDivElement>): void => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -SCALE_STEP : SCALE_STEP;
    setScale((s) => Math.min(SCALE_MAX, Math.max(SCALE_MIN, Math.round((s + delta) * 100) / 100)));
  }, []);

  if (!open || typeof document === 'undefined' || safeLen === 0 || !current) return null;

  const canPrev = index > 0;
  const canNext = index < safeLen - 1;

  return createPortal(
    <div
      ref={dialogRef}
      className={`fixed inset-0 z-[260] flex h-[100dvh] max-h-[100dvh] flex-col ${VIEWER_BG}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
    >
      <p id={descId} className="sr-only">
        Vista a pantalla completa. Pulsa fuera de la imagen o usa volver o Escape para cerrar.
        Teclas más y menos amplían o reducen; cero restablece el zoom. Flechas izquierda y derecha
        cambian de imagen cuando hay varias. También puedes usar la rueda del ratón o el pellizco.
      </p>

      <div id={liveZoomId} aria-live="polite" aria-atomic="true" className="sr-only">
        {zoomAnnouncement}
      </div>

      <header
        className={`flex shrink-0 items-center gap-1 border-b border-white/10 ${HEADER_BG} pt-[max(0.5rem,env(safe-area-inset-top))] pr-[max(0.5rem,env(safe-area-inset-right))] pb-3 pl-[max(0.5rem,env(safe-area-inset-left))]`}
      >
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
          {hasMany ? `${index + 1} / ${safeLen} · ${alt}` : alt}
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

      <div className="relative flex min-h-0 flex-1 flex-col">
        <div
          ref={containerRef}
          role="presentation"
          className={`relative min-h-0 flex-1 ${VIEWER_BG}`}
          onClick={onClose}
        >
          {hasMany ? (
            <button
              type="button"
              className={`absolute inset-y-0 left-0 z-10 grid w-12 place-items-center bg-gradient-to-r from-black/40 to-transparent text-white transition hover:from-black/55 md:w-14 ${!canPrev ? 'cursor-default opacity-30' : ''}`}
              style={{ paddingLeft: 'max(0.25rem, env(safe-area-inset-left))' }}
              onClick={(e) => {
                e.stopPropagation();
                if (canPrev) goPrev();
              }}
              aria-disabled={!canPrev}
              aria-label="Imagen anterior"
            >
              <span
                className={`material-symbols-outlined text-3xl md:text-4xl ${!canPrev ? 'opacity-25' : ''}`}
                aria-hidden="true"
              >
                chevron_left
              </span>
            </button>
          ) : null}
          {hasMany ? (
            <button
              type="button"
              className={`absolute inset-y-0 right-0 z-10 grid w-12 place-items-center bg-gradient-to-l from-black/40 to-transparent text-white transition hover:from-black/55 md:w-14 ${!canNext ? 'cursor-default opacity-30' : ''}`}
              style={{ paddingRight: 'max(0.25rem, env(safe-area-inset-right))' }}
              onClick={(e) => {
                e.stopPropagation();
                if (canNext) goNext();
              }}
              aria-disabled={!canNext}
              aria-label="Imagen siguiente"
            >
              <span
                className={`material-symbols-outlined text-3xl md:text-4xl ${!canNext ? 'opacity-25' : ''}`}
                aria-hidden="true"
              >
                chevron_right
              </span>
            </button>
          ) : null}

          <div
            role="region"
            aria-label={
              hasMany
                ? `Imagen ${index + 1} de ${safeLen}. Pellizca con dos dedos para el zoom.`
                : 'Imagen del mensaje. Pellizca con dos dedos para el zoom.'
            }
            tabIndex={0}
            className="pointer-events-auto absolute inset-0 flex min-h-0 touch-manipulation items-center justify-center overflow-auto overscroll-contain outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1b1b1b]"
            onWheel={onWheel}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <div
              className="flex shrink-0 items-center justify-center"
              role="presentation"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              style={
                fitted
                  ? {
                      width: fitted.width,
                      height: fitted.height,
                      transform: `scale(${scale})`,
                      transformOrigin: 'center center',
                    }
                  : {
                      maxHeight: '100%',
                      maxWidth: '100%',
                      transform: `scale(${scale})`,
                      transformOrigin: 'center center',
                    }
              }
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada Supabase */}
              <img
                ref={imgRef}
                src={src}
                alt={alt}
                onLoad={recalcFit}
                className="block max-h-[85dvh] max-w-[min(100vw,100%)] select-none object-contain md:max-h-[min(90dvh,90vh)]"
                style={
                  fitted
                    ? { width: '100%', height: '100%', objectFit: 'contain' }
                    : undefined
                }
                draggable={false}
              />
            </div>
          </div>
        </div>

        {hasMany ? (
          <footer
            className="shrink-0 border-t border-white/10 bg-[#141414] px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
            onClick={onClose}
          >
            <div
              role="group"
              aria-label="Miniaturas de imágenes"
              className="flex gap-2 overflow-x-auto overscroll-x-contain py-1"
              onClick={(e) => e.stopPropagation()}
            >
              {slides.map((s, i) => (
                <button
                  key={`${s.src}-${i}`}
                  type="button"
                  aria-label={`Imagen ${i + 1} de ${safeLen}: ${s.alt}`}
                  className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-md ring-offset-2 ring-offset-[#141414] transition ${
                    i === index ? THUMB_ACTIVE : 'opacity-80 ring-1 ring-white/20 hover:opacity-100'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIndex(i);
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.src}
                    alt=""
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                </button>
              ))}
            </div>
          </footer>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
