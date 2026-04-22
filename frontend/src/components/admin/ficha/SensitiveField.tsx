'use client';

/**
 * SensitiveField — campo clínico con botón "ojo" individual.
 *
 * Modelo v2 (abril 2026):
 *   - Los valores llegan ya descifrados desde el servidor (la RPC
 *     `paciente_ficha_sensibles_bulk` realiza el descifrado atómico +
 *     una única auditoría `acceso_ficha_completa` por visita).
 *   - Por defecto, el campo se muestra SIEMPRE visible.
 *   - El botón "ojo" oculta o revela SOLO ese campo localmente (sin
 *     llamar a ninguna RPC). Esto evita ruido de shoulder-surfing sin
 *     generar ruido en admin_lookups.
 *
 * Modo compat v1:
 *   - Si no se pasa `value` pero sí `pacienteId`+`campo`, mantenemos el
 *     comportamiento antiguo (oculto por defecto + RPC al revelar).
 *     Esto es útil para campos puntuales fuera de la ficha bulk.
 *
 * Auditoría:
 *   - v2: el acceso a la ficha ya queda registrado. Ocultar/revelar
 *     localmente NO genera eventos extra.
 *   - v1 (compat): cada reveal llama a `paciente_revelar_campo` y
 *     registra `admin_lookups` (antiguo flujo).
 */

import { useCallback, useState, useTransition } from 'react';

import {
  revelarCampoSensibleAction,
  type CampoSensible,
} from '@/services/admin/ficha-actions';

interface SensitiveFieldProps {
  readonly label: string;
  readonly pacienteId: string;
  readonly campo: CampoSensible;
  /**
   * Plaintext ya descifrado (v2). Si viene (aunque sea string vacío),
   * el componente opera en modo "visible por defecto".
   * - null  = campo vacío en BBDD
   * - undefined = modo compat v1 (oculto + reveal via RPC)
   */
  readonly value?: string | null;
  /**
   * Texto cuando el campo está vacío en BBDD. Default "Sin datos".
   */
  readonly emptyLabel?: string;
  /**
   * Máscara al ocultar. Default bolitas unicode.
   */
  readonly mask?: string;
  /**
   * Si true, al ocultar usamos una máscara que conserva la longitud
   * aproximada para dar pista visual (útil para teléfono/DNI).
   */
  readonly keepShape?: boolean;
}

function shapedMask(value: string): string {
  // Reemplaza cada carácter alfanumérico por "•". Deja separadores.
  return value.replace(/[\p{L}\p{N}]/gu, '•');
}

export default function SensitiveField({
  label,
  pacienteId,
  campo,
  value,
  emptyLabel = 'Sin datos',
  mask = '• • • • • •',
  keepShape = false,
}: SensitiveFieldProps): JSX.Element {
  // --- MODO v2: valor pre-descifrado ---
  const v2 = value !== undefined;
  const hasValue = v2 ? value !== null && value !== '' : false;

  const [hidden, setHidden] = useState(false);
  const toggleHidden = useCallback(() => setHidden((h) => !h), []);

  // --- MODO v1 compat: reveal via RPC ---
  const [v1Value, setV1Value] = useState<string | null>(null);
  const [v1Revealed, setV1Revealed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const v1HandleReveal = useCallback(() => {
    setError(null);
    startTransition(async () => {
      const res = await revelarCampoSensibleAction(pacienteId, campo, null);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setV1Value(res.data.plaintext ?? '—');
      setV1Revealed(true);
    });
  }, [campo, pacienteId]);
  const v1HandleHide = useCallback(() => {
    setV1Revealed(false);
    setV1Value(null);
  }, []);

  // ─── Render ───
  if (v2) {
    // Valor pre-descifrado. Por defecto visible; botón ojo oculta local.
    const shown = hasValue ? (value as string) : null;
    const displayed = !hasValue
      ? emptyLabel
      : hidden
        ? keepShape
          ? shapedMask(shown ?? '')
          : mask
        : (shown ?? emptyLabel);

    return (
      <div className="group">
        <dt className="font-body text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted dark:text-white/55">
          {label}
        </dt>
        <dd className="mt-1 flex items-center gap-2">
          <span
            className={`font-display text-[0.95rem] ${
              hidden
                ? 'text-ink-soft tracking-[0.15em] dark:text-white/55'
                : 'text-ink dark:text-white'
            }`}
            aria-live="polite"
          >
            {displayed}
          </span>

          {hasValue ? (
            <button
              type="button"
              onClick={toggleHidden}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-ink-muted ring-1 ring-inset ring-ink/8 transition hover:bg-white/60 hover:text-ink dark:text-white/55 dark:ring-white/10 dark:hover:bg-white/5 dark:hover:text-white"
              aria-label={hidden ? `Mostrar ${label}` : `Ocultar ${label}`}
              aria-pressed={hidden}
              title={hidden ? `Mostrar ${label}` : `Ocultar ${label}`}
            >
              <span className="material-symbols-outlined text-[1rem]" aria-hidden="true">
                {hidden ? 'visibility' : 'visibility_off'}
              </span>
            </button>
          ) : null}
        </dd>
      </div>
    );
  }

  // ─── MODO v1 (compat): oculto por defecto + RPC al revelar ───
  return (
    <div className="group">
      <dt className="font-body text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted dark:text-white/55">
        {label}
      </dt>
      <dd className="mt-1 flex items-center gap-2">
        <span
          className={`font-display text-[0.95rem] ${
            v1Revealed
              ? 'text-ink dark:text-white tabular-nums'
              : 'text-ink-soft tracking-[0.25em] dark:text-white/60'
          }`}
          aria-live="polite"
        >
          {v1Revealed && v1Value !== null ? v1Value : mask}
        </span>

        <button
          type="button"
          onClick={v1Revealed ? v1HandleHide : v1HandleReveal}
          disabled={isPending}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-ink-muted ring-1 ring-inset ring-ink/8 transition hover:bg-white/60 hover:text-ink dark:text-white/55 dark:ring-white/10 dark:hover:bg-white/5 dark:hover:text-white disabled:cursor-wait disabled:opacity-40"
          aria-label={v1Revealed ? `Ocultar ${label}` : `Revelar ${label}`}
          aria-pressed={v1Revealed}
          title={v1Revealed ? `Ocultar ${label}` : `Revelar ${label}`}
        >
          <span className="material-symbols-outlined text-[1rem]" aria-hidden="true">
            {isPending
              ? 'progress_activity'
              : v1Revealed
                ? 'visibility_off'
                : 'visibility'}
          </span>
        </button>
      </dd>

      {error ? (
        <p className="mt-1 font-body text-[0.68rem] text-red-600 dark:text-red-400">
          Error: {error}
        </p>
      ) : null}
    </div>
  );
}
