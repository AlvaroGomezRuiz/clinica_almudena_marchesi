'use client';

/**
 * CitaNotasEditor — CRUD de notas del paciente para una cita concreta.
 *
 * - Botón "Añadir nota" despliega textarea.
 * - Cada nota existente se puede editar en inline o eliminar (confirm).
 * - Sirve tanto para citas futuras (preparar qué trabajar) como pasadas
 *   (registrar reflexiones). Las ve Almudena pero sólo el paciente las edita.
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import {
  actualizarNotaCitaAction,
  crearNotaCitaAction,
  eliminarNotaCitaAction,
} from '@/services/portal/notas-actions';

export interface CitaNotaItem {
  readonly id: string;
  readonly contenido: string;
  readonly updated_at: string;
}

interface Props {
  readonly citaId: string;
  readonly notas: readonly CitaNotaItem[];
}

export default function CitaNotasEditor({ citaId, notas }: Props): JSX.Element {
  const router = useRouter();
  const [nuevo, setNuevo] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [borrador, setBorrador] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const cancelar = (): void => {
    setNuevo(null);
    setEditandoId(null);
    setBorrador('');
    setError(null);
  };

  const guardarNuevo = (): void => {
    if (!nuevo?.trim()) return;
    setError(null);
    const texto = nuevo;
    startTransition(async () => {
      const res = await crearNotaCitaAction(citaId, texto);
      if (!res.ok) {
        setError(res.message ?? 'No se pudo guardar.');
        return;
      }
      cancelar();
      router.refresh();
    });
  };

  const guardarEdicion = (id: string): void => {
    if (!borrador.trim()) return;
    const texto = borrador;
    startTransition(async () => {
      const res = await actualizarNotaCitaAction(id, texto);
      if (!res.ok) {
        setError(res.message ?? 'No se pudo guardar.');
        return;
      }
      cancelar();
      router.refresh();
    });
  };

  const borrar = (id: string): void => {
    if (!window.confirm('¿Eliminar esta nota? No se puede deshacer.')) return;
    startTransition(async () => {
      const res = await eliminarNotaCitaAction(id);
      if (!res.ok) {
        setError(res.message ?? 'No se pudo eliminar.');
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="space-y-2">
      {notas.length === 0 && nuevo === null ? (
        <p className="font-body text-[0.78rem] text-ink-muted dark:text-white/55">
          Puedes añadir notas para recordar qué trabajar o registrar tus
          reflexiones. Almudena podrá verlas.
        </p>
      ) : null}

      <ul className="space-y-2">
        {notas.map((n) => (
          <li
            key={n.id}
            className="rounded-xl bg-white/60 p-3 ring-1 ring-inset ring-ink/5 dark:bg-white/5 dark:ring-white/10"
          >
            {editandoId === n.id ? (
              <div>
                <textarea
                  value={borrador}
                  onChange={(e) => setBorrador(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg bg-white/80 px-3 py-2 font-body text-[0.85rem] text-ink ring-1 ring-inset ring-ink/10 focus:outline-none focus:ring-2 focus:ring-ink/20 dark:bg-white/5 dark:text-white dark:ring-white/10"
                />
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => guardarEdicion(n.id)}
                    disabled={isPending || borrador.trim() === n.contenido.trim()}
                    className="rounded-full bg-primary px-3 py-1 font-body text-[0.75rem] text-on-primary hover:bg-primary-dim disabled:opacity-40"
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={cancelar}
                    className="rounded-full px-3 py-1 font-body text-[0.75rem] text-ink-muted hover:text-ink dark:text-white/55 dark:hover:text-white"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="whitespace-pre-wrap font-body text-[0.85rem] leading-[1.55] text-ink dark:text-white">
                  {n.contenido}
                </p>
                <div className="mt-1 flex items-center justify-between">
                  <time
                    className="font-body text-[0.68rem] text-ink-muted dark:text-white/50"
                    dateTime={n.updated_at}
                  >
                    {new Date(n.updated_at).toLocaleString('es-ES', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </time>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditandoId(n.id);
                        setBorrador(n.contenido);
                        setNuevo(null);
                      }}
                      className="font-body text-[0.72rem] text-ink-soft underline decoration-dotted underline-offset-2 hover:text-primary dark:text-white/60"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => borrar(n.id)}
                      className="font-body text-[0.72rem] text-[#8c4d44] underline decoration-dotted underline-offset-2 hover:text-[#6f3c35] dark:text-[#f4a294]"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      {nuevo !== null ? (
        <div className="rounded-xl bg-white/60 p-3 ring-1 ring-inset ring-ink/5 dark:bg-white/5 dark:ring-white/10">
          <textarea
            value={nuevo}
            onChange={(e) => setNuevo(e.target.value)}
            rows={3}
            autoFocus
            placeholder="¿Qué querrías recordar o reflexionar sobre esta sesión?"
            className="w-full rounded-lg bg-white/80 px-3 py-2 font-body text-[0.85rem] text-ink ring-1 ring-inset ring-ink/10 focus:outline-none focus:ring-2 focus:ring-ink/20 dark:bg-white/5 dark:text-white dark:ring-white/10"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={guardarNuevo}
              disabled={isPending || !nuevo.trim()}
              className="rounded-full bg-primary px-3 py-1 font-body text-[0.75rem] text-on-primary hover:bg-primary-dim disabled:opacity-40"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={cancelar}
              className="rounded-full px-3 py-1 font-body text-[0.75rem] text-ink-muted hover:text-ink dark:text-white/55 dark:hover:text-white"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setNuevo('')}
          className="inline-flex items-center gap-1.5 font-body text-[0.78rem] text-primary transition hover:text-primary-dim"
        >
          <span className="material-symbols-outlined text-[1rem]" aria-hidden="true">
            add_notes
          </span>
          Añadir nota
        </button>
      )}

      {error ? (
        <p role="alert" className="font-body text-[0.75rem] text-red-600 dark:text-red-400">
          Error: {error}
        </p>
      ) : null}
    </div>
  );
}
