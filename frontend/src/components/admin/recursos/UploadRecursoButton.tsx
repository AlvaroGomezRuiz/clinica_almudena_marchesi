'use client';

/**
 * UploadRecursoButton — abre modal con form de subida de recurso.
 * Envía multipart/form-data a /api/admin/recursos/upload y refresca la ruta.
 */

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/portal-shell/ui';

const CATEGORIAS = [
  { id: 'tarea', label: 'Tarea' },
  { id: 'lectura', label: 'Lectura' },
  { id: 'ejercicio', label: 'Ejercicio' },
  { id: 'evaluacion', label: 'Evaluación' },
  { id: 'recurso', label: 'Recurso general' },
] as const;

export default function UploadRecursoButton(): JSX.Element {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState<(typeof CATEGORIAS)[number]['id']>('recurso');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const close = (): void => {
    if (isPending) return;
    setOpen(false);
    setTitulo('');
    setDescripcion('');
    setCategoria('recurso');
    setError(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSubmit = (): void => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError('Selecciona un archivo.');
      return;
    }
    if (!titulo.trim()) {
      setError('El título es obligatorio.');
      return;
    }

    const form = new FormData();
    form.append('file', file);
    form.append('titulo', titulo.trim());
    form.append('descripcion', descripcion.trim());
    form.append('categoria', categoria);

    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/recursos/upload', {
          method: 'POST',
          body: form,
        });
        const body = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !body.ok) {
          setError(body.error ?? `Error ${res.status}`);
          return;
        }
        close();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'error_red');
      }
    });
  };

  return (
    <>
      <Button variant="primary" icon="upload" onClick={() => setOpen(true)}>
        Subir recurso
      </Button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Subir recurso"
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-20 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className="w-full max-w-lg overflow-hidden rounded-[1.5rem] bg-canvas shadow-2xl ring-1 ring-inset ring-ink/10 dark:bg-[#1a1a1a] dark:ring-white/10">
            <header className="flex items-center justify-between border-b border-ink/8 px-5 py-3 dark:border-white/10">
              <h2 className="font-display text-[1.1rem] italic text-ink dark:text-white">
                Subir recurso
              </h2>
              <button
                type="button"
                onClick={close}
                disabled={isPending}
                className="text-ink-muted hover:text-ink disabled:opacity-40 dark:text-white/55 dark:hover:text-white"
                aria-label="Cerrar"
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  close
                </span>
              </button>
            </header>

            <div className="space-y-4 p-5">
              <div>
                <label className="font-body text-[0.72rem] uppercase tracking-[0.15em] text-ink-muted dark:text-white/55">
                  Archivo *
                </label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf,audio/*,video/mp4,image/*"
                  className="mt-1 block w-full font-body text-[0.85rem] text-ink file:mr-3 file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-1.5 file:font-body file:text-[0.75rem] file:text-canvas file:hover:bg-ink-soft dark:text-white/80 dark:file:bg-white dark:file:text-ink"
                />
                <p className="mt-1 font-body text-[0.7rem] text-ink-muted dark:text-white/55">
                  PDF, audio, vídeo o imagen. Máximo 50&nbsp;MB.
                </p>
              </div>

              <div>
                <label className="font-body text-[0.72rem] uppercase tracking-[0.15em] text-ink-muted dark:text-white/55">
                  Título *
                </label>
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  maxLength={200}
                  className="mt-1 w-full rounded-xl bg-white/70 px-3 py-2 font-body text-[0.9rem] text-ink ring-1 ring-inset ring-ink/10 focus:outline-none focus:ring-2 focus:ring-ink/20 dark:bg-white/5 dark:text-white dark:ring-white/10"
                  placeholder="Ej. Guía de respiración diafragmática"
                />
              </div>

              <div>
                <label className="font-body text-[0.72rem] uppercase tracking-[0.15em] text-ink-muted dark:text-white/55">
                  Descripción
                </label>
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  rows={2}
                  maxLength={500}
                  className="mt-1 w-full rounded-xl bg-white/70 px-3 py-2 font-body text-[0.9rem] text-ink ring-1 ring-inset ring-ink/10 focus:outline-none focus:ring-2 focus:ring-ink/20 dark:bg-white/5 dark:text-white dark:ring-white/10"
                />
              </div>

              <div>
                <label className="font-body text-[0.72rem] uppercase tracking-[0.15em] text-ink-muted dark:text-white/55">
                  Categoría
                </label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {CATEGORIAS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategoria(c.id)}
                      className={`rounded-full px-3 py-1.5 font-body text-[0.78rem] ring-1 ring-inset transition ${
                        categoria === c.id
                          ? 'bg-primary text-on-primary ring-primary/60 dark:bg-primary dark:ring-primary'
                          : 'bg-white/60 text-ink ring-ink/10 hover:bg-white/80 dark:bg-white/5 dark:text-white dark:ring-white/10 dark:hover:bg-white/10'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {error ? (
                <p className="font-body text-[0.8rem] text-red-600 dark:text-red-400">
                  Error: {error}
                </p>
              ) : null}
            </div>

            <footer className="flex justify-end gap-2 border-t border-ink/8 bg-white/40 px-5 py-3 dark:border-white/10 dark:bg-white/[0.02]">
              <button
                type="button"
                onClick={close}
                disabled={isPending}
                className="rounded-full px-4 py-2 font-body text-[0.82rem] text-ink-muted hover:text-ink disabled:opacity-40 dark:text-white/55 dark:hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending}
                className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 font-body text-[0.82rem] text-on-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] hover:bg-primary-dim disabled:opacity-40 dark:bg-primary dark:text-white"
              >
                <span className="material-symbols-outlined text-[1rem]" aria-hidden="true">
                  {isPending ? 'progress_activity' : 'upload'}
                </span>
                {isPending ? 'Subiendo…' : 'Subir'}
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </>
  );
}
