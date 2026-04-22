'use client';

import { useCallback, useId, useState, type ReactNode, type JSX } from 'react';

import { FichaSectionEditProvider } from '@/components/admin/ficha/FichaSectionEditContext';

interface Props {
  /** Título de la sección (p. ej. "Datos personales"). */
  readonly title: string;
  readonly description?: string;
  readonly children: ReactNode;
  /** Al montar, si true la sección ya permite edición inline por campo. */
  readonly defaultEditing?: boolean;
}

/**
 * Patrón "solo lectura" por bloque: por defecto sin lápiz en cada fila; un solo
 * botón "Editar sección" expone el modo de edición existente.
 */
export default function FichaSectionEditGate({
  title,
  description,
  children,
  defaultEditing = false,
}: Props): JSX.Element {
  const [editing, setEditing] = useState(defaultEditing);
  const id = useId();
  const bodyId = `${id}-body`;

  const onToggle = useCallback((): void => {
    setEditing((e) => !e);
  }, []);

  return (
    <FichaSectionEditProvider showFieldEditButtons={editing}>
      <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-display text-[1.25rem] italic text-ink dark:text-white">
            {title}
          </h2>
          {description ? (
            <p className="mt-0.5 font-body text-[0.72rem] text-ink-muted dark:text-white/55">
              {description}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 self-start rounded-full bg-white/70 px-3.5 py-2 font-body text-[0.78rem] text-ink ring-1 ring-inset ring-ink/10 transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/50 dark:bg-white/10 dark:text-white dark:ring-white/15 dark:hover:bg-white/15"
          aria-expanded={editing}
          aria-controls={bodyId}
        >
          <span className="material-symbols-outlined text-[1rem]" aria-hidden="true">
            {editing ? 'visibility' : 'edit_square'}
          </span>
          {editing ? 'Cerrar edición' : 'Editar sección'}
        </button>
      </div>
      <div id={bodyId} className="pt-0.5">
        {children}
      </div>
    </FichaSectionEditProvider>
  );
}
