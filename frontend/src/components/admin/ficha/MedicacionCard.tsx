'use client';

/**
 * MedicacionCard — gestor inline de medicación activa del paciente.
 *
 * Similar a DiagnosticosCard pero con los campos de medicación (nombre, dosis,
 * frecuencia, vía, prescrita por). Las notas son plaintext en MVP (migración
 * 0016) y pasarán a ciphertext en F5.
 */

import { useState, useTransition } from 'react';

import { Button, Chip } from '@/components/portal-shell/ui';
import {
  crearMedicacionAction,
  desactivarMedicacionAction,
} from '@/services/admin/ficha-actions';
import type { PacienteMedicacion } from '@/lib/supabase/types';

interface Props {
  readonly pacienteId: string;
  readonly medicaciones: readonly PacienteMedicacion[];
}

export default function MedicacionCard({
  pacienteId,
  medicaciones,
}: Props): JSX.Element {
  const [showForm, setShowForm] = useState(false);
  const [nombre, setNombre] = useState('');
  const [dosis, setDosis] = useState('');
  const [frecuencia, setFrecuencia] = useState('');
  const [via, setVia] = useState('');
  const [prescritaPor, setPrescritaPor] = useState('');
  const [notas, setNotas] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const activas = medicaciones.filter((m) => m.activo);

  const handleCrear = (): void => {
    setError(null);
    startTransition(async () => {
      const res = await crearMedicacionAction({
        pacienteId,
        nombre,
        dosis: dosis || null,
        frecuencia: frecuencia || null,
        via: via || null,
        prescritaPor: prescritaPor || null,
        fechaInicio: null,
        notas: notas || null,
      });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setNombre('');
      setDosis('');
      setFrecuencia('');
      setVia('');
      setPrescritaPor('');
      setNotas('');
      setShowForm(false);
    });
  };

  const handleArchivar = (id: string): void => {
    if (!window.confirm('¿Archivar esta medicación?')) return;
    startTransition(async () => {
      const res = await desactivarMedicacionAction(id, pacienteId);
      if (!res.ok) setError(res.message);
    });
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-display text-[1.15rem] italic text-ink dark:text-white">
            Medicación
          </h2>
          <p className="font-body text-[0.72rem] text-ink-muted dark:text-white/55">
            {activas.length} activa{activas.length === 1 ? '' : 's'}
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
        <div className="mb-4 rounded-2xl bg-white/60 p-4 ring-1 ring-inset ring-ink/8 dark:bg-white/5 dark:ring-white/10">
          <div className="grid gap-3 sm:grid-cols-2">
            <LabeledInput label="Nombre *" value={nombre} onChange={setNombre} placeholder="Ej. Sertralina" />
            <LabeledInput label="Dosis" value={dosis} onChange={setDosis} placeholder="50 mg" />
            <LabeledInput label="Frecuencia" value={frecuencia} onChange={setFrecuencia} placeholder="1/día" />
            <LabeledInput label="Vía" value={via} onChange={setVia} placeholder="oral" />
            <LabeledInput label="Prescrita por" value={prescritaPor} onChange={setPrescritaPor} placeholder="Dr. …" />
          </div>
          <div className="mt-3">
            <label className="font-body text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted dark:text-white/55">
              Notas
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-xl bg-white/70 px-3 py-2 font-body text-[0.9rem] text-ink ring-1 ring-inset ring-ink/10 focus:outline-none focus:ring-2 focus:ring-ink/20 dark:bg-white/5 dark:text-white dark:ring-white/10"
            />
          </div>
          {error ? (
            <p className="mt-2 font-body text-[0.75rem] text-red-600 dark:text-red-400">Error: {error}</p>
          ) : null}
          <div className="mt-3 flex justify-end">
            <Button variant="primary" icon="check" onClick={handleCrear} disabled={isPending || !nombre.trim()}>
              Guardar medicación
            </Button>
          </div>
        </div>
      ) : null}

      {activas.length === 0 && !showForm ? (
        <p className="py-6 text-center font-body text-[0.85rem] text-ink-soft dark:text-white/45">
          Sin medicación registrada.
        </p>
      ) : (
        <ul className="space-y-2">
          {activas.map((m) => (
            <li
              key={m.id}
              className="flex items-start justify-between gap-3 rounded-xl bg-white/50 p-3 dark:bg-white/5"
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-body text-[0.9rem] text-ink dark:text-white">{m.nombre}</p>
                  {m.dosis ? <Chip tone="info">{m.dosis}</Chip> : null}
                  {m.frecuencia ? <Chip tone="neutral">{m.frecuencia}</Chip> : null}
                  {m.via ? <Chip tone="neutral">vía {m.via}</Chip> : null}
                </div>
                {m.prescrita_por ? (
                  <p className="mt-1 font-body text-[0.7rem] text-ink-muted dark:text-white/55">
                    Prescrita por {m.prescrita_por}
                  </p>
                ) : null}
                {m.notas ? (
                  <p className="mt-1 font-body text-[0.78rem] text-ink-muted dark:text-white/60">{m.notas}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => handleArchivar(m.id)}
                disabled={isPending}
                className="text-ink-muted hover:text-red-600 dark:text-white/55 dark:hover:text-red-400 disabled:opacity-40"
                aria-label="Archivar medicación"
              >
                <span className="material-symbols-outlined text-[1.1rem]" aria-hidden="true">archive</span>
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
