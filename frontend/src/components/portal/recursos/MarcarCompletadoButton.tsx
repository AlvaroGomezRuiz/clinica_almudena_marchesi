'use client';

/**
 * Botón de toggle "Completado" para una asignación de recurso en el
 * portal del paciente. Feedback optimista, revalida path al terminar.
 */

import { useState, useTransition } from 'react';

import { marcarRecursoCompletadoAction } from '@/services/portal/recursos-actions';

interface Props {
  readonly asignacionId: string;
  readonly initialCompleted: boolean;
}

export default function MarcarCompletadoButton({
  asignacionId,
  initialCompleted,
}: Props): JSX.Element {
  const [completed, setCompleted] = useState(initialCompleted);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const toggle = (): void => {
    const target = !completed;
    setCompleted(target);
    setError(null);
    startTransition(async () => {
      const res = await marcarRecursoCompletadoAction(asignacionId, target);
      if (!res.ok) {
        setCompleted(!target);
        setError(res.message);
      }
    });
  };

  const label = completed ? 'Hecho' : 'Marcar como hecho';
  const icon = completed ? 'task_alt' : 'radio_button_unchecked';

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      aria-pressed={completed}
      title={error ? `Error: ${error}` : label}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-body text-[0.78rem] transition disabled:opacity-50 ${
        completed
          ? 'bg-primary/12 text-primary ring-1 ring-inset ring-primary/25 dark:bg-primary/25 dark:text-white dark:ring-primary/40'
          : 'bg-white/70 text-ink-soft ring-1 ring-inset ring-ink/10 hover:bg-white hover:text-ink dark:bg-white/10 dark:text-white/65 dark:ring-white/15 dark:hover:bg-white/15 dark:hover:text-white'
      }`}
    >
      <span
        className="material-symbols-outlined text-[1rem]"
        aria-hidden="true"
      >
        {icon}
      </span>
      {label}
    </button>
  );
}
