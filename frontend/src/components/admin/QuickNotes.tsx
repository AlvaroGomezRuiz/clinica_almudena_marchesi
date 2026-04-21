'use client';

/**
 * QuickNotes — nota rápida global editable con autosave (debounce 1200 ms).
 *
 * Persistencia: singleton public.facturacion_nota (id = 1). Visible solo por
 * admin (protegida por RLS + server action `actualizarNotaGlobalAction`).
 *
 * Reduced-motion y accesibilidad:
 *   - Textarea con aria-label
 *   - Indicador de estado en vivo (aria-live="polite")
 *   - Sin animaciones si reduced-motion activo
 */

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';

import { actualizarNotaGlobalAction } from '@/services/admin/actions';

interface QuickNotesProps {
  readonly initial: string;
}

type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

const DEBOUNCE_MS = 1200;
const MAX_LENGTH = 4000;

export default function QuickNotes({ initial }: QuickNotesProps) {
  const [value, setValue] = useState(initial ?? '');
  const [state, setState] = useState<SaveState>('idle');
  const [, startTransition] = useTransition();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef(initial ?? '');

  const persist = useCallback((next: string) => {
    setState('saving');
    startTransition(() => {
      actualizarNotaGlobalAction(next).then((res) => {
        if (res.ok) {
          lastSavedRef.current = next;
          setState('saved');
          setTimeout(() => setState((s) => (s === 'saved' ? 'idle' : s)), 1800);
        } else {
          setState('error');
        }
      });
    });
  }, []);

  useEffect(() => {
    if (value === lastSavedRef.current) return;
    setState('dirty');

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      persist(value);
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, persist]);

  const statusLabel =
    state === 'saving'
      ? 'Guardando…'
      : state === 'saved'
        ? 'Guardado'
        : state === 'error'
          ? 'Error al guardar'
          : state === 'dirty'
            ? 'Editando…'
            : 'Al día';

  const statusCls =
    state === 'error'
      ? 'text-[#8c4d44] dark:text-[#f3b3aa]'
      : state === 'saved'
        ? 'text-primary dark:text-primary-fixed-dim'
        : 'text-ink-muted dark:text-white/55';

  return (
    <div className="relative">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="font-body text-[0.62rem] uppercase tracking-[0.22em] text-ink-muted dark:text-white/55">
            Nota rápida
          </p>
          <h3 className="mt-1.5 font-display text-[1.25rem] italic text-ink leading-none tracking-[-0.015em] dark:text-white">
            Anotaciones del día
          </h3>
        </div>
        <span
          aria-live="polite"
          className={`font-body text-[0.68rem] uppercase tracking-[0.18em] tabular-nums ${statusCls}`}
        >
          {statusLabel}
        </span>
      </div>

      <textarea
        aria-label="Nota rápida global de administración"
        value={value}
        maxLength={MAX_LENGTH}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Pendientes, recordatorios propios, ideas sueltas… (se guarda automáticamente)"
        className="w-full min-h-[180px] resize-y rounded-2xl bg-white/80 px-4 py-3 font-body text-[0.92rem] leading-relaxed text-ink placeholder:text-ink-muted/80 ring-1 ring-inset ring-ink/8 outline-none transition-[box-shadow,background-color] duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] focus:bg-white focus:ring-primary/40 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-white/40 dark:ring-white/10 dark:focus:bg-white/[0.06] dark:focus:ring-primary/40"
      />

      <div className="mt-2 flex items-center justify-between font-body text-[0.68rem] text-ink-muted dark:text-white/45">
        <span>Sólo visible para Almudena. Encriptado en tránsito (TLS).</span>
        <span className="tabular-nums">
          {value.length}/{MAX_LENGTH}
        </span>
      </div>
    </div>
  );
}
