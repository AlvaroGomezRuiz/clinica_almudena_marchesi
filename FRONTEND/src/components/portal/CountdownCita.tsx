'use client';

/**
 * CountdownCita — cuenta atrás viva (segundos) hasta la próxima sesión.
 *
 * - Actualiza cada 1s durante la última hora, cada 60s antes.
 * - Formato adaptativo: "en 3 días · 14h" → "en 58 min" → "en 4 min 12s".
 */

import { useEffect, useState } from 'react';

interface Props {
  readonly target: string;
}

interface Breakdown {
  readonly past: boolean;
  readonly days: number;
  readonly hours: number;
  readonly minutes: number;
  readonly seconds: number;
}

function diff(targetMs: number): Breakdown {
  const delta = targetMs - Date.now();
  const past = delta <= 0;
  const abs = Math.abs(delta);
  return {
    past,
    days: Math.floor(abs / 86_400_000),
    hours: Math.floor((abs % 86_400_000) / 3_600_000),
    minutes: Math.floor((abs % 3_600_000) / 60_000),
    seconds: Math.floor((abs % 60_000) / 1_000),
  };
}

function render(b: Breakdown): string {
  if (b.past) {
    if (b.days > 0) return `hace ${b.days}d ${b.hours}h`;
    if (b.hours > 0) return `hace ${b.hours}h ${b.minutes}m`;
    return `hace ${b.minutes}m`;
  }
  if (b.days > 0) return `en ${b.days}d ${b.hours}h`;
  if (b.hours > 1) return `en ${b.hours}h ${b.minutes}m`;
  if (b.hours === 1) return `en 1h ${b.minutes}m`;
  if (b.minutes > 5) return `en ${b.minutes} min`;
  return `en ${b.minutes}m ${String(b.seconds).padStart(2, '0')}s`;
}

export default function CountdownCita({ target }: Props): JSX.Element {
  const targetMs = new Date(target).getTime();
  const [b, setB] = useState<Breakdown>(() => diff(targetMs));

  useEffect(() => {
    const within1h = Math.abs(targetMs - Date.now()) < 3_600_000;
    const interval = window.setInterval(
      () => setB(diff(targetMs)),
      within1h ? 1000 : 60_000
    );
    return () => window.clearInterval(interval);
  }, [targetMs]);

  return (
    <span
      role="timer"
      aria-live="polite"
      className="font-body text-[0.75rem] tabular-nums text-ink-soft dark:text-white/70"
    >
      {render(b)}
    </span>
  );
}
