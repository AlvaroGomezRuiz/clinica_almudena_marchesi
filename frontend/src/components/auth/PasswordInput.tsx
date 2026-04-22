'use client';

/**
 * PasswordInput — input de contraseña con medidor de fortaleza.
 *
 * Política aplicada (endurecida para historia clínica):
 *   - Mínimo 12 caracteres (recomendación OWASP 2024 para datos sensibles).
 *   - Al menos 1 número, 1 minúscula, 1 mayúscula, 1 carácter especial.
 *
 * Controlado externamente (value/onChange) para que el padre pueda:
 *   - Leer el valor al submit.
 *   - Hacer cross-validation con "confirmar contraseña".
 *   - Bloquear el botón si la fuerza no llega al mínimo.
 *
 * Adaptado al stack:
 *   - Material Symbols (fuente subset, no lucide-react).
 *   - Textos en español.
 *   - Tokens de color propios (primary, ink, canvas) en lugar de neutral-950.
 */

import { useId, useMemo, useState } from 'react';

interface Requirement {
  readonly regex: RegExp;
  readonly text: string;
}

const REQUIREMENTS: readonly Requirement[] = [
  { regex: /.{12,}/, text: 'Al menos 12 caracteres' },
  { regex: /[0-9]/, text: 'Al menos 1 número' },
  { regex: /[a-z]/, text: 'Al menos 1 minúscula' },
  { regex: /[A-Z]/, text: 'Al menos 1 mayúscula' },
  { regex: /[!-/:-@[-`{-~]/, text: 'Al menos 1 símbolo' },
] as const;

type Score = 0 | 1 | 2 | 3 | 4 | 5;

const BAR_COLOR: Record<Score, string> = {
  0: 'bg-ink/10',
  1: 'bg-red-500',
  2: 'bg-orange-500',
  3: 'bg-amber-500',
  4: 'bg-emerald-500',
  5: 'bg-emerald-600',
};

const BAR_LABEL: Record<Score, string> = {
  0: 'Introduce una contraseña',
  1: 'Contraseña muy débil',
  2: 'Contraseña débil',
  3: 'Contraseña aceptable',
  4: 'Contraseña fuerte',
  5: 'Contraseña muy fuerte',
};

interface PasswordInputProps {
  readonly id?: string;
  readonly name: string;
  readonly value: string;
  readonly onChange: (next: string) => void;
  readonly label?: string;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly autoComplete?: 'new-password' | 'current-password';
  /** Si `false`, oculta el medidor (para el campo "confirmar contraseña"). */
  readonly showStrength?: boolean;
}

export function PasswordInput({
  id,
  name,
  value,
  onChange,
  label = 'Contraseña',
  placeholder = 'Mín. 12 caracteres',
  disabled = false,
  autoComplete = 'new-password',
  showStrength = true,
}: PasswordInputProps): JSX.Element {
  const [visible, setVisible] = useState(false);
  const autoId = useId();
  const fieldId = id ?? `password-${autoId}`;
  const hintId = `${fieldId}-strength`;

  const { score, requirements } = useMemo(() => {
    const reqs = REQUIREMENTS.map((r) => ({
      met: r.regex.test(value),
      text: r.text,
    }));
    return {
      requirements: reqs,
      score: reqs.filter((r) => r.met).length as Score,
    };
  }, [value]);

  return (
    <div>
      <label
        htmlFor={fieldId}
        className="block font-display text-[10px] uppercase tracking-[0.15em] text-ink-soft mb-2 font-medium"
      >
        {label}
      </label>

      <div className="relative">
        <input
          id={fieldId}
          name={name}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          required
          minLength={12}
          aria-invalid={showStrength ? score < 4 : undefined}
          aria-describedby={showStrength ? hintId : undefined}
          className="w-full bg-white/50 dark:bg-black/30 border border-outline-variant/30 dark:border-white/10 rounded-lg px-4 py-3 pr-12 font-body text-[0.95rem] text-ink placeholder:text-ink-muted/70 focus:ring-2 focus:ring-sage focus:outline-none disabled:opacity-60"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          aria-pressed={visible}
          tabIndex={-1}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-ink-muted hover:text-ink transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
            {visible ? 'visibility_off' : 'visibility'}
          </span>
        </button>
      </div>

      {showStrength ? (
        <>
          <div
            className="mt-3 mb-2 h-1 rounded-full bg-ink/5 dark:bg-white/5 overflow-hidden"
            role="progressbar"
            aria-valuenow={score}
            aria-valuemin={0}
            aria-valuemax={5}
            aria-label="Fortaleza de la contraseña"
          >
            <div
              className={`h-full ${BAR_COLOR[score]} transition-all duration-500`}
              style={{ width: `${(score / 5) * 100}%` }}
            />
          </div>

          <p
            id={hintId}
            className="mb-2 flex justify-between font-body text-[0.8rem] font-medium text-ink-soft"
          >
            <span>Debe contener:</span>
            <span className={score >= 4 ? 'text-emerald-600' : 'text-ink-muted'}>
              {BAR_LABEL[score]}
            </span>
          </p>

          <ul className="space-y-1" aria-label="Requisitos de contraseña">
            {requirements.map((r) => (
              <li key={r.text} className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={`material-symbols-outlined text-[16px] ${
                    r.met ? 'text-emerald-500' : 'text-ink-muted/70'
                  }`}
                >
                  {r.met ? 'check_circle' : 'radio_button_unchecked'}
                </span>
                <span
                  className={`font-body text-[0.75rem] ${
                    r.met ? 'text-emerald-600' : 'text-ink-muted'
                  }`}
                >
                  {r.text}
                  <span className="sr-only">
                    {r.met ? ' — cumplido' : ' — no cumplido'}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

/** Devuelve true si la contraseña cumple las 5 reglas de la política. */
export function isPasswordStrong(pw: string): boolean {
  return REQUIREMENTS.every((r) => r.regex.test(pw));
}
