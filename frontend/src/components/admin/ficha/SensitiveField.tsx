'use client';

/**
 * SensitiveField — campo con "ojo" auditado para la ficha clínica.
 *
 * Comportamiento:
 *   - Por defecto oculta el valor con asteriscos (o "Sin datos" si `hasValue=false`).
 *   - Al pulsar el ojo, llama a `revelarCampoSensibleAction(pacienteId, campo)`
 *     que desencripta vía RPC `paciente_revelar_campo` + registra el acceso
 *     en `admin_lookups` (RGPD art. 30) en una única transacción atómica.
 *   - Revelado se auto-oculta tras 15s para minimizar exposición shoulder-surfing.
 *
 * Props:
 *   - `hasValue`: si false, el ojo queda deshabilitado (no hay nada que desvelar).
 *   - `plaintextOverride`: si se pasa, se muestra directamente sin llamar a RPC
 *     (útil para valores que NO son ciphertext, p.ej. fecha de nacimiento).
 */

import { useCallback, useEffect, useState, useTransition } from 'react';

import {
  revelarCampoSensibleAction,
  type CampoSensible,
} from '@/services/admin/ficha-actions';

const AUTO_HIDE_MS = 15_000;

interface SensitiveFieldProps {
  readonly label: string;
  readonly pacienteId: string;
  readonly campo: CampoSensible;
  readonly hasValue: boolean;
  /** Valor ya descifrado (p.ej. por el backend). Si se pasa, el ojo lo muestra sin RPC. */
  readonly plaintextOverride?: string | null;
  readonly mask?: string;
  readonly requireReason?: boolean;
}

export default function SensitiveField({
  label,
  pacienteId,
  campo,
  hasValue,
  plaintextOverride,
  mask = '• • • • • •',
  requireReason = false,
}: SensitiveFieldProps): JSX.Element {
  const [revealed, setRevealed] = useState(false);
  const [value, setValue] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!revealed) return;
    const t = setTimeout(() => {
      setRevealed(false);
      setValue(null);
    }, AUTO_HIDE_MS);
    return () => clearTimeout(t);
  }, [revealed]);

  const handleReveal = useCallback(() => {
    if (!hasValue) return;
    setError(null);

    let justificacion: string | null = null;
    if (requireReason) {
      const reason = window.prompt(
        `Estás a punto de ver "${label}". Este acceso queda registrado en admin_lookups (RGPD art. 30).\n\nIndica la justificación clínica u operativa:`
      );
      if (!reason || !reason.trim()) return;
      justificacion = reason.trim();
    }

    startTransition(async () => {
      // Si el consumidor ya tiene el plaintext cacheado (p.ej. server-side
      // pre-fetch), evitamos el round-trip pero mantenemos la auditoría.
      if (plaintextOverride !== undefined && plaintextOverride !== null) {
        await revelarCampoSensibleAction(pacienteId, campo, justificacion);
        setValue(plaintextOverride);
        setRevealed(true);
        return;
      }

      const res = await revelarCampoSensibleAction(
        pacienteId,
        campo,
        justificacion
      );
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setValue(res.data.plaintext ?? '—');
      setRevealed(true);
    });
  }, [campo, hasValue, label, pacienteId, plaintextOverride, requireReason]);

  const handleHide = useCallback(() => {
    setRevealed(false);
    setValue(null);
  }, []);

  return (
    <div className="group">
      <dt className="font-body text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted dark:text-white/55">
        {label}
      </dt>
      <dd className="mt-1 flex items-center gap-2">
        <span
          className={`font-display text-[0.95rem] ${
            revealed
              ? 'text-ink dark:text-white tabular-nums'
              : 'text-ink-soft tracking-[0.25em] dark:text-white/60'
          }`}
          aria-live="polite"
        >
          {!hasValue
            ? 'Sin datos'
            : revealed && value !== null
              ? value
              : mask}
        </span>

        {hasValue ? (
          <button
            type="button"
            onClick={revealed ? handleHide : handleReveal}
            disabled={isPending}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-ink-muted ring-1 ring-inset ring-ink/8 transition hover:bg-white/60 hover:text-ink dark:text-white/55 dark:ring-white/10 dark:hover:bg-white/5 dark:hover:text-white disabled:cursor-wait disabled:opacity-40"
            aria-label={revealed ? `Ocultar ${label}` : `Revelar ${label} (queda auditado)`}
            aria-pressed={revealed}
          >
            <span
              className="material-symbols-outlined text-[1rem]"
              aria-hidden="true"
            >
              {isPending
                ? 'progress_activity'
                : revealed
                  ? 'visibility_off'
                  : 'visibility'}
            </span>
          </button>
        ) : null}
      </dd>

      {revealed ? (
        <p className="mt-1 font-body text-[0.68rem] text-amber-700 dark:text-amber-300">
          Revelado. Se ocultará en {AUTO_HIDE_MS / 1000}s.
        </p>
      ) : null}
      {error ? (
        <p className="mt-1 font-body text-[0.68rem] text-red-600 dark:text-red-400">
          Error: {error}
        </p>
      ) : null}
    </div>
  );
}
