'use client';

/**
 * NuevaConversacionButton — abre un modal con buscador de pacientes.
 * Al seleccionar un paciente, llama a `abrirConversacionConPaciente` y navega
 * al chat correspondiente.
 */

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/portal-shell/ui';
import { listarPacientesQuickAction } from '@/services/admin/actions';
import { abrirConversacionConPaciente } from '@/services/mensajes/admin-actions';

interface Paciente {
  readonly id: string;
  readonly display_name: string;
  readonly email: string;
}

export default function NuevaConversacionButton(): JSX.Element {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [resultados, setResultados] = useState<readonly Paciente[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResultados([]);
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    const handle = setTimeout(() => {
      startTransition(async () => {
        const res = await listarPacientesQuickAction(q);
        setResultados(res as readonly Paciente[]);
      });
    }, 220);
    return () => clearTimeout(handle);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const handleSeleccionar = useCallback(
    (pacienteId: string) => {
      setError(null);
      startTransition(async () => {
        const res = await abrirConversacionConPaciente(pacienteId);
        if (!res.ok) {
          setError(res.message);
          return;
        }
        setOpen(false);
        router.push(`/admin/mensajes/${res.data.conversacionId}`);
        router.refresh();
      });
    },
    [router]
  );

  return (
    <>
      <Button variant="primary" icon="edit_square" onClick={() => setOpen(true)}>
        Nueva conversación
      </Button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Seleccionar paciente para iniciar conversación"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-xl overflow-hidden rounded-[1.5rem] bg-canvas shadow-2xl ring-1 ring-inset ring-ink/10 dark:bg-[#1a1a1a] dark:ring-white/10">
            <div className="flex items-center gap-2 border-b border-ink/8 px-4 py-3 dark:border-white/10">
              <span className="material-symbols-outlined text-ink-muted dark:text-white/55" aria-hidden="true">
                search
              </span>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar paciente por nombre o email…"
                className="flex-1 bg-transparent font-body text-[0.95rem] text-ink placeholder:text-ink-muted outline-none dark:text-white dark:placeholder:text-white/40"
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-ink-muted hover:text-ink dark:text-white/55 dark:hover:text-white"
                aria-label="Cerrar"
              >
                <span className="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto px-2 py-2">
              {error ? (
                <p className="px-4 py-2 font-body text-[0.8rem] text-red-600 dark:text-red-400">
                  Error: {error}
                </p>
              ) : null}
              {isPending && resultados.length === 0 ? (
                <p className="px-4 py-4 text-center font-body text-[0.85rem] text-ink-muted dark:text-white/55">
                  Buscando…
                </p>
              ) : resultados.length === 0 ? (
                <p className="px-4 py-6 text-center font-body text-[0.85rem] text-ink-soft dark:text-white/45">
                  {query ? 'Sin coincidencias.' : 'Escribe para buscar un paciente.'}
                </p>
              ) : (
                <ul className="divide-y divide-ink/5 dark:divide-white/5">
                  {resultados.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => handleSeleccionar(p.id)}
                        disabled={isPending}
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-white/60 disabled:opacity-40 dark:hover:bg-white/5"
                      >
                        <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 font-display text-[0.85rem] text-primary ring-1 ring-inset ring-primary/15 dark:bg-primary/20 dark:text-white dark:ring-primary/30">
                          {(p.display_name || p.email || '?').trim().charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-body text-[0.9rem] text-ink dark:text-white">
                            {p.display_name || 'Sin nombre'}
                          </p>
                          {p.email ? (
                            <p className="truncate font-body text-[0.72rem] text-ink-muted dark:text-white/55">
                              {p.email}
                            </p>
                          ) : null}
                        </div>
                        <span
                          className="material-symbols-outlined text-ink-muted dark:text-white/55"
                          aria-hidden="true"
                        >
                          arrow_forward
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
