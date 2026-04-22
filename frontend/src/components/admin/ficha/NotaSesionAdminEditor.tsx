'use client';

/**
 * NotaSesionAdminEditor — editor expandible de nota post-sesión para admin.
 *
 * UX:
 *   - Colapsado por defecto (ahorra espacio en el timeline).
 *   - Al expandir: si existe `notaId`, llama a `leerNotaCitaAdminAction`
 *     para descifrar el contenido bajo demanda (genera 1 admin_lookups
 *     con justificacion=`lectura_nota_admin`).
 *   - El admin puede editar y guardar con `guardarNotaCitaAdminAction`.
 *   - Si no existe `notaId`, el editor arranca vacío y se crea al guardar.
 *
 * Notas sobre auditoría:
 *   - Cada expansión de una nota ya existente = 1 lectura registrada.
 *   - Guardar no añade auditoría específica (queda reflejado por
 *     updated_at del registro y por Sentry si hay error).
 */

import { useCallback, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import {
  guardarNotaCitaAdminAction,
  leerNotaCitaAdminAction,
} from '@/services/admin/notas-cita-actions';

interface Props {
  readonly citaId: string;
  readonly pacienteId: string;
  /** Id de la nota existente (si ya se había guardado antes). */
  readonly notaId: string | null;
  /** Estado agregado para mostrar badge ("Con nota" / "Sin nota"). */
  readonly hasNota: boolean;
}

export default function NotaSesionAdminEditor({
  citaId,
  pacienteId,
  notaId,
  hasNota,
}: Props): JSX.Element {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState('');
  const [initial, setInitial] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, startLoad] = useTransition();
  const [isSaving, startSave] = useTransition();

  const loadIfNeeded = useCallback(() => {
    if (loaded || !notaId) {
      setLoaded(true);
      return;
    }
    startLoad(async () => {
      const res = await leerNotaCitaAdminAction(notaId, pacienteId);
      if (!res.ok) {
        setError(res.message);
        setLoaded(true);
        return;
      }
      const txt = res.data.plaintext ?? '';
      setDraft(txt);
      setInitial(txt);
      setLoaded(true);
    });
  }, [loaded, notaId, pacienteId]);

  const toggle = useCallback(() => {
    if (!open) loadIfNeeded();
    setOpen((o) => !o);
  }, [loadIfNeeded, open]);

  const save = useCallback(() => {
    const texto = draft.trim();
    if (!texto) {
      setError('La nota no puede estar vacía.');
      return;
    }
    setError(null);
    startSave(async () => {
      const res = await guardarNotaCitaAdminAction(citaId, pacienteId, texto);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setInitial(texto);
      router.refresh();
    });
  }, [citaId, draft, pacienteId, router]);

  const cancel = useCallback(() => {
    setDraft(initial ?? '');
    setError(null);
    setOpen(false);
  }, [initial]);

  const dirty = (initial ?? '') !== draft;

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5 font-body text-[0.76rem] text-ink-soft ring-1 ring-inset ring-ink/10 transition hover:bg-white hover:text-ink dark:bg-white/10 dark:text-white/70 dark:ring-white/15 dark:hover:bg-white/15 dark:hover:text-white"
      >
        <span
          className="material-symbols-outlined text-[1rem]"
          aria-hidden="true"
        >
          {hasNota ? 'edit_note' : 'add_notes'}
        </span>
        {hasNota ? 'Ver / editar nota clínica' : 'Añadir nota clínica'}
        <span
          className="material-symbols-outlined text-[1rem] transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : 'none' }}
          aria-hidden="true"
        >
          expand_more
        </span>
      </button>

      {open ? (
        <div className="mt-3 rounded-2xl bg-white/60 p-4 ring-1 ring-inset ring-ink/10 dark:bg-white/[0.03] dark:ring-white/10">
          {isLoading && !loaded ? (
            <p className="font-body text-[0.78rem] text-ink-soft dark:text-white/55">
              Descifrando nota…
            </p>
          ) : (
            <>
              <label
                htmlFor={`nota-${citaId}`}
                className="font-body text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted dark:text-white/55"
              >
                Nota clínica de sesión
              </label>
              <textarea
                id={`nota-${citaId}`}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={5}
                maxLength={8000}
                disabled={isSaving}
                placeholder="Observaciones, progresos, tareas acordadas, intervenciones, hipótesis, etc."
                className="mt-2 w-full rounded-xl border border-ink/15 bg-white/90 px-3 py-2 font-body text-[0.88rem] leading-[1.55] text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60 dark:border-white/15 dark:bg-white/[0.04] dark:text-white dark:focus:border-primary-fixed-dim"
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="font-body text-[0.7rem] text-ink-muted dark:text-white/55">
                  {draft.length} / 8000 caracteres · AES-256 en reposo
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={cancel}
                    disabled={isSaving}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5 font-body text-[0.76rem] text-ink-soft ring-1 ring-inset ring-ink/10 transition hover:bg-white hover:text-ink dark:bg-white/10 dark:text-white/70 dark:ring-white/15 dark:hover:bg-white/15 dark:hover:text-white"
                  >
                    Cerrar
                  </button>
                  <button
                    type="button"
                    onClick={save}
                    disabled={isSaving || !dirty || !draft.trim()}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 font-body text-[0.78rem] text-on-primary transition hover:bg-primary-dim disabled:opacity-60"
                  >
                    <span
                      className="material-symbols-outlined text-[1rem]"
                      aria-hidden="true"
                    >
                      {isSaving ? 'progress_activity' : 'save'}
                    </span>
                    Guardar nota
                  </button>
                </div>
              </div>
              {error ? (
                <p className="mt-2 font-body text-[0.72rem] text-red-600 dark:text-red-400">
                  Error: {error}
                </p>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
