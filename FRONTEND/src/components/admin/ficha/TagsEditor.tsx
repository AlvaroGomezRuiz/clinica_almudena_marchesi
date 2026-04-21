'use client';

/**
 * TagsEditor — edición inline de tags (etiquetas) del paciente.
 * Cada tag es un string libre ≤32 chars; máx 20 tags (validado server-side).
 */

import { useState, useTransition } from 'react';

import { actualizarTagsPacienteAction } from '@/services/admin/ficha-actions';

interface Props {
  readonly pacienteId: string;
  readonly initialTags: readonly string[];
}

export default function TagsEditor({
  pacienteId,
  initialTags,
}: Props): JSX.Element {
  const [tags, setTags] = useState<readonly string[]>(initialTags);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const commit = (next: readonly string[]): void => {
    setError(null);
    startTransition(async () => {
      const res = await actualizarTagsPacienteAction(pacienteId, next);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setTags(next);
    });
  };

  const addTag = (): void => {
    const t = input.trim();
    if (!t) return;
    if (tags.includes(t)) {
      setInput('');
      return;
    }
    commit([...tags, t]);
    setInput('');
  };

  const removeTag = (t: string): void => {
    commit(tags.filter((x) => x !== t));
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {tags.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 rounded-full bg-white/60 px-3 py-1 font-body text-[0.75rem] text-ink ring-1 ring-inset ring-ink/10 dark:bg-white/5 dark:text-white dark:ring-white/10"
          >
            {t}
            <button
              type="button"
              onClick={() => removeTag(t)}
              disabled={isPending}
              className="text-ink-muted hover:text-red-600 dark:text-white/55 dark:hover:text-red-400 disabled:opacity-40"
              aria-label={`Quitar tag ${t}`}
            >
              <span className="material-symbols-outlined text-[0.85rem]" aria-hidden="true">
                close
              </span>
            </button>
          </span>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addTag();
            }
          }}
          placeholder="Añadir etiqueta…"
          maxLength={32}
          className="flex-1 rounded-full bg-white/70 px-3 py-1.5 font-body text-[0.8rem] text-ink ring-1 ring-inset ring-ink/10 focus:outline-none focus:ring-2 focus:ring-ink/20 dark:bg-white/5 dark:text-white dark:ring-white/10"
        />
        <button
          type="button"
          onClick={addTag}
          disabled={isPending || !input.trim()}
          className="rounded-full bg-ink px-3 py-1.5 font-body text-[0.78rem] text-canvas transition hover:bg-ink-soft disabled:opacity-40 dark:bg-white dark:text-ink dark:hover:bg-white/90"
        >
          Añadir
        </button>
      </div>
      {error ? (
        <p className="mt-2 font-body text-[0.7rem] text-red-600 dark:text-red-400">
          Error: {error}
        </p>
      ) : null}
    </div>
  );
}
