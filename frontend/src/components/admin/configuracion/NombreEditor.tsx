'use client';

/**
 * NombreEditor — permite editar el display_name con autosave explícito.
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { actualizarPerfilAction } from '@/services/admin/cuenta-actions';

interface Props {
  readonly initial: string;
}

export default function NombreEditor({ initial }: Props): JSX.Element {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const save = (): void => {
    if (value.trim() === initial.trim()) return;
    setMsg(null);
    startTransition(async () => {
      const res = await actualizarPerfilAction(value);
      if (!res.ok) {
        setMsg({ ok: false, text: res.message ?? 'No se pudo guardar.' });
        return;
      }
      setMsg({ ok: true, text: 'Nombre actualizado.' });
      router.refresh();
    });
  };

  return (
    <div>
      <label className="font-body text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted dark:text-white/55">
        Nombre mostrado
      </label>
      <div className="mt-1 flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={120}
          className="flex-1 rounded-xl bg-white/80 px-3 py-2 font-display text-[0.95rem] italic text-ink ring-1 ring-inset ring-ink/10 focus:outline-none focus:ring-2 focus:ring-ink/20 dark:bg-white/5 dark:text-white dark:ring-white/10"
        />
        <button
          type="button"
          onClick={save}
          disabled={isPending || value.trim() === initial.trim()}
          className="rounded-full bg-ink px-4 py-2 font-body text-[0.78rem] text-canvas transition hover:bg-ink-soft disabled:opacity-40 dark:bg-white dark:text-ink dark:hover:bg-white/90"
        >
          {isPending ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
      {msg ? (
        <p
          className={`mt-1 font-body text-[0.72rem] ${
            msg.ok
              ? 'text-primary dark:text-primary/80'
              : 'text-red-600 dark:text-red-400'
          }`}
        >
          {msg.text}
        </p>
      ) : null}
    </div>
  );
}
