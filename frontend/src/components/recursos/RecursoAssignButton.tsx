'use client';

/**
 * Botón + modal para asignar un recurso a un paciente desde admin.
 * Auto-carga la lista de pacientes la primera vez que se abre el modal.
 */

import { useState, useTransition, useEffect, useId } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/portal-shell/ui';
import {
  asignarRecursoAction,
  listarPacientesParaAsignarAction,
  type PacienteOption,
} from '@/services/recursos/actions';

interface Props {
  readonly recursoId: string;
  readonly recursoTitulo: string;
}

export function RecursoAssignButton({ recursoId, recursoTitulo }: Props): JSX.Element {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pacientes, setPacientes] = useState<readonly PacienteOption[] | null>(null);
  const [selected, setSelected] = useState<string>('');
  const [query, setQuery] = useState('');
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err' | 'info'; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [loadingPacientes, setLoadingPacientes] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!open || pacientes !== null) return;
    setLoadingPacientes(true);
    listarPacientesParaAsignarAction()
      .then((list) => setPacientes(list))
      .finally(() => setLoadingPacientes(false));
  }, [open, pacientes]);

  function reset(): void {
    setSelected('');
    setQuery('');
    setMsg(null);
  }

  function handleSubmit(): void {
    if (!selected) {
      setMsg({ tone: 'err', text: 'Selecciona un paciente.' });
      return;
    }
    setMsg(null);
    startTransition(async () => {
      const res = await asignarRecursoAction(recursoId, selected);
      if (!res.ok) {
        setMsg({ tone: 'err', text: res.message });
        return;
      }
      setMsg({
        tone: res.yaExistia ? 'info' : 'ok',
        text: res.yaExistia
          ? 'Este paciente ya tenía el recurso asignado.'
          : 'Recurso asignado. Se le ha enviado un email.',
      });
      router.refresh();
      setTimeout(() => {
        setOpen(false);
        reset();
      }, 1400);
    });
  }

  const filtered = (pacientes ?? []).filter((p) =>
    p.label.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        icon="group_add"
        onClick={() => setOpen(true)}
      >
        Asignar
      </Button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
        >
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => !pending && (setOpen(false), reset())}
            className="absolute inset-0 bg-ink/35 backdrop-blur-[6px]"
          />

          <div className="relative w-full max-w-lg rounded-[1.75rem] bg-canvas p-7 shadow-[0_40px_80px_-24px_rgba(28,28,25,0.35)] ring-1 ring-ink/10">
            <p className="font-body text-[0.72rem] uppercase tracking-[0.15em] text-primary/80">
              Asignar recurso
            </p>
            <h2
              id={titleId}
              className="mt-1 font-display text-[1.5rem] italic leading-tight tracking-[-0.015em] text-ink"
            >
              {recursoTitulo}
            </h2>
            <p className="mt-2 font-body text-[0.85rem] leading-relaxed text-ink-soft">
              Selecciona el paciente al que quieres asignar este recurso. Se le
              enviará un email automáticamente (si tiene notificaciones activas).
            </p>

            <label
              htmlFor="asig-search"
              className="mt-6 block font-body text-[0.72rem] uppercase tracking-[0.15em] text-ink-muted"
            >
              Buscar paciente
            </label>
            <input
              id="asig-search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Escribe un nombre…"
              autoFocus
              disabled={pending}
              className="mt-2 w-full rounded-2xl bg-white/70 px-4 py-3 font-body text-[0.9rem] text-ink placeholder:text-ink-muted/70 ring-1 ring-ink/10 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />

            <div
              role="listbox"
              aria-label="Pacientes disponibles"
              className="mt-3 max-h-72 overflow-y-auto rounded-2xl bg-white/45 p-1 ring-1 ring-ink/8"
            >
              {loadingPacientes ? (
                <p className="p-4 text-center font-body text-[0.85rem] text-ink-muted">
                  Cargando pacientes…
                </p>
              ) : filtered.length === 0 ? (
                <p className="p-4 text-center font-body text-[0.85rem] text-ink-muted">
                  Sin resultados.
                </p>
              ) : (
                filtered.slice(0, 40).map((p) => {
                  const isSelected = selected === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => setSelected(p.id)}
                      disabled={pending}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-colors ${
                        isSelected
                          ? 'bg-primary/12 ring-1 ring-primary/35'
                          : 'hover:bg-ink/4'
                      }`}
                    >
                      <span className="font-body text-[0.9rem] text-ink">{p.label}</span>
                      {isSelected ? (
                        <span
                          className="material-symbols-outlined text-[1.1rem] text-primary"
                          aria-hidden="true"
                        >
                          check_circle
                        </span>
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>

            {msg ? (
              <p
                role={msg.tone === 'err' ? 'alert' : 'status'}
                className={`mt-4 font-body text-[0.85rem] ${
                  msg.tone === 'err'
                    ? 'text-[#b2675e]'
                    : msg.tone === 'ok'
                      ? 'text-primary'
                      : 'text-ink-soft'
                }`}
              >
                {msg.text}
              </p>
            ) : null}

            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setOpen(false);
                  reset();
                }}
                disabled={pending}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                icon={pending ? 'progress_activity' : 'send'}
                onClick={handleSubmit}
                disabled={pending || !selected}
              >
                {pending ? 'Asignando…' : 'Asignar y notificar'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
