'use client';

/**
 * EditableSensitiveField — envoltorio editable sobre SensitiveField.
 *
 * Objetivo:
 *   - Mantener la UX "visible por defecto + ojo individual" de SensitiveField.
 *   - Añadir botón lápiz → input inline con botones guardar/cancelar.
 *   - Guardado vía `actualizarPacienteSensiblesAction` (RPC cifrada).
 *
 * Notas:
 *   - La prop `campoEdit` debe coincidir con uno de los `CampoEditable`
 *     admitidos por la RPC (`paciente_actualizar_cifrado`).
 *   - Tras guardar se llama a `router.refresh()` para que la ficha vuelva
 *     a descifrar los datos desde el servidor (una sola auditoría).
 */

import { useCallback, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import {
  actualizarPacienteSensiblesAction,
  type CampoEditable,
} from '@/services/admin/pacientes-actions';
import type { CampoSensible } from '@/services/admin/ficha-actions';
import SensitiveField from './SensitiveField';

interface Props {
  readonly label: string;
  readonly pacienteId: string;
  readonly campo: CampoSensible;
  /** Nombre del campo editable en la RPC. */
  readonly campoEdit: CampoEditable;
  readonly value: string | null;
  readonly emptyLabel?: string;
  readonly keepShape?: boolean;
  readonly multiline?: boolean;
  readonly placeholder?: string;
  /** Input type HTML (por defecto text; útil para tel/email/date). */
  readonly inputType?: 'text' | 'tel' | 'email' | 'date';
}

export default function EditableSensitiveField({
  label,
  pacienteId,
  campo,
  campoEdit,
  value,
  emptyLabel = 'Sin datos',
  keepShape = false,
  multiline = false,
  placeholder,
  inputType = 'text',
}: Props): JSX.Element {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(value ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const startEdit = useCallback(() => {
    setDraft(value ?? '');
    setError(null);
    setEditing(true);
  }, [value]);

  const cancelEdit = useCallback(() => {
    setEditing(false);
    setDraft(value ?? '');
    setError(null);
  }, [value]);

  const save = useCallback(() => {
    setError(null);
    const trimmed = draft.trim();
    const next = trimmed === '' ? null : trimmed;
    if (next === (value ?? null)) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      const res = await actualizarPacienteSensiblesAction(pacienteId, {
        [campoEdit]: next,
      });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }, [campoEdit, draft, pacienteId, router, value]);

  if (!editing) {
    return (
      <div className="group flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <SensitiveField
            label={label}
            pacienteId={pacienteId}
            campo={campo}
            value={value}
            emptyLabel={emptyLabel}
            keepShape={keepShape}
          />
        </div>
        <button
          type="button"
          onClick={startEdit}
          className="mt-5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-muted ring-1 ring-inset ring-ink/8 opacity-0 transition hover:bg-white/60 hover:text-ink group-hover:opacity-100 focus-visible:opacity-100 dark:text-white/55 dark:ring-white/10 dark:hover:bg-white/5 dark:hover:text-white"
          aria-label={`Editar ${label}`}
          title={`Editar ${label}`}
        >
          <span
            className="material-symbols-outlined text-[1rem]"
            aria-hidden="true"
          >
            edit
          </span>
        </button>
      </div>
    );
  }

  return (
    <div>
      <dt className="font-body text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted dark:text-white/55">
        {label}
      </dt>
      <dd className="mt-1">
        {multiline ? (
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            rows={3}
            maxLength={2000}
            disabled={isPending}
            className="w-full rounded-xl border border-ink/15 bg-white/80 px-3 py-2 font-body text-[0.9rem] text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60 dark:border-white/15 dark:bg-white/5 dark:text-white dark:focus:border-primary-fixed-dim"
          />
        ) : (
          <input
            autoFocus
            type={inputType}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            maxLength={2000}
            disabled={isPending}
            className="w-full rounded-xl border border-ink/15 bg-white/80 px-3 py-2 font-body text-[0.95rem] text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60 dark:border-white/15 dark:bg-white/5 dark:text-white dark:focus:border-primary-fixed-dim"
          />
        )}

        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={save}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 font-body text-[0.78rem] text-on-primary transition hover:bg-primary-dim disabled:opacity-60"
          >
            <span
              className="material-symbols-outlined text-[1rem]"
              aria-hidden="true"
            >
              {isPending ? 'progress_activity' : 'check'}
            </span>
            Guardar
          </button>
          <button
            type="button"
            onClick={cancelEdit}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5 font-body text-[0.78rem] text-ink-soft ring-1 ring-inset ring-ink/10 transition hover:bg-white hover:text-ink dark:bg-white/10 dark:text-white/70 dark:ring-white/15 dark:hover:bg-white/15 dark:hover:text-white"
          >
            Cancelar
          </button>
        </div>

        {error ? (
          <p className="mt-2 font-body text-[0.72rem] text-red-600 dark:text-red-400">
            Error: {error}
          </p>
        ) : null}
      </dd>
    </div>
  );
}
