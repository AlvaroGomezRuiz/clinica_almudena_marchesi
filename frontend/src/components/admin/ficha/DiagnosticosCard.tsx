'use client';

/**
 * DiagnosticosCard — gestor inline de diagnósticos activos del paciente.
 *
 * - Lista diagnósticos activos con severidad + estado.
 * - Permite añadir uno nuevo (titulo + cie + severidad + notas).
 * - Permite archivar (soft-delete via `desactivarDiagnosticoAction`).
 *
 * Los valores NO son sensibles en MVP (plaintext transicional migración 0016).
 * En F5 se cifrarán los campos sensibles (titulo/descripcion).
 */

import { useState, useTransition } from 'react';

import { Button, Chip } from '@/components/portal-shell/ui';
import {
  crearDiagnosticoAction,
  desactivarDiagnosticoAction,
} from '@/services/admin/ficha-actions';
import type {
  PacienteDiagnostico,
  DiagnosticoSeveridad,
} from '@/lib/supabase/types';

interface Props {
  readonly pacienteId: string;
  readonly diagnosticos: readonly PacienteDiagnostico[];
}

export default function DiagnosticosCard({
  pacienteId,
  diagnosticos,
}: Props): JSX.Element {
  const [showForm, setShowForm] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [cie, setCie] = useState('');
  const [severidad, setSeveridad] = useState<DiagnosticoSeveridad | ''>('');
  const [descripcion, setDescripcion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleCrear = (): void => {
    setError(null);
    startTransition(async () => {
      const res = await crearDiagnosticoAction({
        pacienteId,
        titulo,
        cieCode: cie || null,
        severidad: severidad || null,
        descripcion: descripcion || null,
        fechaInicio: null,
      });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setTitulo('');
      setCie('');
      setSeveridad('');
      setDescripcion('');
      setShowForm(false);
    });
  };

  const handleArchivar = (id: string): void => {
    if (!window.confirm('¿Archivar este diagnóstico?')) return;
    startTransition(async () => {
      const res = await desactivarDiagnosticoAction(id, pacienteId);
      if (!res.ok) setError(res.message);
    });
  };

  const activos = diagnosticos.filter((d) => d.activo);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-display text-[1.15rem] italic text-ink dark:text-white">
            Diagnósticos
          </h2>
          <p className="font-body text-[0.72rem] text-ink-muted dark:text-white/55">
            {activos.length} activo{activos.length === 1 ? '' : 's'}
          </p>
        </div>
        <Button
          variant="ghost"
          icon={showForm ? 'close' : 'add'}
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? 'Cancelar' : 'Añadir'}
        </Button>
      </div>

      {showForm ? (
        <div className="mb-4 rounded-2xl bg-white/60 p-5 ring-1 ring-inset ring-ink/8 dark:bg-white/5 dark:ring-white/10">
          <div className="grid gap-4 sm:grid-cols-2">
            <LabeledInput
              label="Título *"
              value={titulo}
              onChange={setTitulo}
              placeholder="Ej. Trastorno de ansiedad generalizada"
            />
            <LabeledInput
              label="Código CIE (opcional)"
              value={cie}
              onChange={setCie}
              placeholder="F41.1"
            />
            <div>
              <label className="font-body text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted dark:text-white/55">
                Severidad
              </label>
              <select
                value={severidad}
                onChange={(e) =>
                  setSeveridad(e.target.value as DiagnosticoSeveridad | '')
                }
                className="mt-1 w-full rounded-xl bg-white/70 px-3 py-2 font-body text-[0.9rem] text-ink ring-1 ring-inset ring-ink/10 focus:outline-none focus:ring-2 focus:ring-ink/20 dark:bg-white/5 dark:text-white dark:ring-white/10"
              >
                <option value="">—</option>
                <option value="leve">Leve</option>
                <option value="moderado">Moderado</option>
                <option value="severo">Severo</option>
              </select>
            </div>
          </div>
          <div className="mt-3">
            <label className="font-body text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted dark:text-white/55">
              Notas
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-xl bg-white/70 px-3 py-2 font-body text-[0.9rem] text-ink ring-1 ring-inset ring-ink/10 focus:outline-none focus:ring-2 focus:ring-ink/20 dark:bg-white/5 dark:text-white dark:ring-white/10"
            />
          </div>
          {error ? (
            <p className="mt-2 font-body text-[0.75rem] text-red-600 dark:text-red-400">
              Error: {error}
            </p>
          ) : null}
          <div className="mt-3 flex justify-end gap-2">
            <Button
              variant="primary"
              icon="check"
              onClick={handleCrear}
              disabled={isPending || !titulo.trim()}
            >
              Guardar diagnóstico
            </Button>
          </div>
        </div>
      ) : null}

      {activos.length === 0 && !showForm ? (
        <p className="py-6 text-center font-body text-[0.85rem] text-ink-soft dark:text-white/45">
          Sin diagnósticos registrados.
        </p>
      ) : (
        <ul className="space-y-2">
          {activos.map((d) => (
            <li
              key={d.id}
              className="flex items-start justify-between gap-3 rounded-xl bg-white/50 p-3 dark:bg-white/5"
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-body text-[0.9rem] text-ink dark:text-white">
                    {d.titulo ?? '(cifrado)'}
                  </p>
                  {d.cie_code ? (
                    <Chip tone="neutral">{d.cie_code}</Chip>
                  ) : null}
                  {d.severidad ? (
                    <Chip
                      tone={
                        d.severidad === 'severo'
                          ? 'critical'
                          : d.severidad === 'moderado'
                            ? 'warning'
                            : 'info'
                      }
                    >
                      {d.severidad}
                    </Chip>
                  ) : null}
                </div>
                {d.descripcion ? (
                  <p className="mt-1 font-body text-[0.78rem] text-ink-muted dark:text-white/60">
                    {d.descripcion}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => handleArchivar(d.id)}
                disabled={isPending}
                className="text-ink-muted hover:text-red-600 dark:text-white/55 dark:hover:text-red-400 disabled:opacity-40"
                aria-label="Archivar diagnóstico"
              >
                <span className="material-symbols-outlined text-[1.1rem]" aria-hidden="true">
                  archive
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}): JSX.Element {
  return (
    <div>
      <label className="font-body text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted dark:text-white/55">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl bg-white/70 px-3 py-2 font-body text-[0.9rem] text-ink ring-1 ring-inset ring-ink/10 focus:outline-none focus:ring-2 focus:ring-ink/20 dark:bg-white/5 dark:text-white dark:ring-white/10"
      />
    </div>
  );
}
