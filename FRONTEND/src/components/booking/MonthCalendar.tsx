'use client';

/**
 * MonthCalendar — rejilla mensual Lunes-Domingo con navegación prev/next.
 *
 * No consulta disponibilidad por día (sería N llamadas). Sólo marca:
 *   - Días pasados → deshabilitados
 *   - Día seleccionado → resaltado
 *   - Día actual → borde discreto
 *
 * Devuelve el día elegido a través de `onSelect(date)`.
 */

import {
  addMonths,
  endOfMonth,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  subMonths,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { useMemo, useState } from 'react';

interface Props {
  readonly selected: Date;
  readonly onSelect: (date: Date) => void;
  readonly minDate?: Date;
  readonly maxDate?: Date;
}

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'] as const;

export default function MonthCalendar({
  selected,
  onSelect,
  minDate,
  maxDate,
}: Props): JSX.Element {
  const [cursor, setCursor] = useState<Date>(startOfMonth(selected));
  const today = useMemo(() => startOfDay(new Date()), []);
  const min = minDate ? startOfDay(minDate) : today;
  const max = maxDate ? startOfDay(maxDate) : null;

  // Construye la grilla 6x7 (42 celdas) empezando en lunes
  const grid = useMemo<readonly Date[]>(() => {
    const first = startOfMonth(cursor);
    const weekday = (first.getDay() + 6) % 7; // 0 = lunes
    const start = new Date(first);
    start.setDate(first.getDate() - weekday);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return startOfDay(d);
    });
  }, [cursor]);

  const monthLabel = format(cursor, "MMMM yyyy", { locale: es });

  const prev = (): void => setCursor(subMonths(cursor, 1));
  const next = (): void => setCursor(addMonths(cursor, 1));

  const canPrev = !isBefore(startOfMonth(cursor), startOfMonth(min));
  const canNext = max ? !isBefore(endOfMonth(cursor), endOfMonth(max)) : true;

  return (
    <div>
      <header className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={prev}
          disabled={!canPrev}
          aria-label="Mes anterior"
          className="grid h-9 w-9 place-items-center rounded-full bg-white/55 text-ink ring-1 ring-inset ring-white/55 transition hover:bg-white/80 disabled:opacity-30 dark:bg-white/8 dark:text-white dark:ring-white/10 dark:hover:bg-white/12"
        >
          <span className="material-symbols-outlined text-[1.1rem]" aria-hidden="true">
            chevron_left
          </span>
        </button>
        <p className="font-display text-[1.05rem] italic capitalize text-ink dark:text-white">
          {monthLabel}
        </p>
        <button
          type="button"
          onClick={next}
          disabled={!canNext}
          aria-label="Mes siguiente"
          className="grid h-9 w-9 place-items-center rounded-full bg-white/55 text-ink ring-1 ring-inset ring-white/55 transition hover:bg-white/80 disabled:opacity-30 dark:bg-white/8 dark:text-white dark:ring-white/10 dark:hover:bg-white/12"
        >
          <span className="material-symbols-outlined text-[1.1rem]" aria-hidden="true">
            chevron_right
          </span>
        </button>
      </header>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="py-1 text-center font-body text-[0.65rem] uppercase tracking-[0.2em] text-ink-muted dark:text-white/45"
            aria-hidden="true"
          >
            {w}
          </div>
        ))}
        {grid.map((d) => {
          const outMonth = !isSameMonth(d, cursor);
          const isPast = isBefore(d, min);
          const isMax = max && isBefore(max, d);
          const disabled = isPast || !!isMax;
          const isSelected = isSameDay(d, selected);
          const isToday = isSameDay(d, today);

          return (
            <button
              key={d.toISOString()}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(d)}
              aria-pressed={isSelected}
              className={`relative aspect-square rounded-xl font-body text-[0.88rem] tabular-nums transition ${
                isSelected
                  ? 'bg-primary text-on-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_8px_18px_-8px_rgba(75,100,95,0.4)]'
                  : outMonth
                  ? 'text-ink-muted/50 hover:bg-white/40 dark:text-white/25 dark:hover:bg-white/5'
                  : 'text-ink hover:bg-white/70 dark:text-white dark:hover:bg-white/10'
              } ${isToday && !isSelected ? 'ring-1 ring-inset ring-primary/40' : ''} ${
                disabled ? 'cursor-not-allowed opacity-30' : ''
              }`}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
