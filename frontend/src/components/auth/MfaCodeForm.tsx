'use client';

import { useFormStatus } from 'react-dom';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type JSX,
  type KeyboardEvent,
} from 'react';

import { cn } from '@/lib/utils';
import { completeMfaLoginAction, logoutAction } from '@/services/auth/actions';

const MFA_CODE_LENGTH = 6 as const;

interface SubmitMfaProps {
  className?: string;
}

function SubmitMfa({ className }: SubmitMfaProps): JSX.Element {
  const { pending } = useFormStatus();
  return (
    <button
      className={cn(
        'flex-1 rounded-xl bg-primary px-4 py-3.5 font-display text-xs font-medium uppercase tracking-[0.15em] text-on-primary shadow-lg shadow-primary/15 transition-all hover:bg-primary-dim disabled:opacity-50 dark:shadow-primary/20',
        className
      )}
      disabled={pending}
      type="submit"
    >
      {pending ? 'Verificando…' : 'Verificar'}
    </button>
  );
}

interface MfaCodeFormProps {
  nextPath: string | undefined;
  error: string | null;
}

export default function MfaCodeForm({ nextPath, error: initialError }: MfaCodeFormProps): JSX.Element {
  const formRef = useRef<HTMLFormElement>(null);
  const hiddenCodeRef = useRef<HTMLInputElement>(null);
  const inputRefsArr = useRef<Array<HTMLInputElement | null>>([]);
  const lastSubmittedCodeRef = useRef<string | null>(null);

  const [cells, setCells] = useState<ReadonlyArray<string>>(() =>
    Array.from({ length: MFA_CODE_LENGTH }, () => '')
  );

  const setInputRef = useCallback((index: number, el: HTMLInputElement | null): void => {
    inputRefsArr.current[index] = el;
  }, []);

  useLayoutEffect(() => {
    const el = hiddenCodeRef.current;
    if (el) {
      el.value = cells.join('');
    }
  }, [cells]);

  const codeJoined = cells.join('');
  useEffect(() => {
    if (lastSubmittedCodeRef.current !== null && codeJoined !== lastSubmittedCodeRef.current) {
      lastSubmittedCodeRef.current = null;
    }
  }, [codeJoined]);

  const trySubmitCode = useCallback((code: string): void => {
    if (code.length !== MFA_CODE_LENGTH) {
      return;
    }
    if (lastSubmittedCodeRef.current === code) {
      return;
    }
    lastSubmittedCodeRef.current = code;
    const hidden = hiddenCodeRef.current;
    const form = formRef.current;
    if (hidden) {
      hidden.value = code;
    }
    form?.requestSubmit();
  }, []);

  const applyDigitsFromIndex = useCallback(
    (startIndex: number, digits: string): void => {
      const chars = digits.replace(/\D/g, '').slice(0, MFA_CODE_LENGTH).split('');
      if (chars.length === 0) {
        return;
      }
      setCells((prev) => {
        const next = [...prev];
        for (let j = 0; j < chars.length && startIndex + j < MFA_CODE_LENGTH; j += 1) {
          const ch = chars[j];
          if (ch !== undefined) {
            next[startIndex + j] = ch;
          }
        }
        const code = next.join('');
        if (code.length === MFA_CODE_LENGTH && next.every((c) => c !== '')) {
          queueMicrotask(() => {
            trySubmitCode(code);
          });
        }
        return next;
      });
      const endFocus = Math.min(startIndex + chars.length - 1, MFA_CODE_LENGTH - 1);
      queueMicrotask(() => {
        inputRefsArr.current[endFocus]?.focus();
      });
    },
    [trySubmitCode]
  );

  const onDigitChange = useCallback(
    (index: number, raw: string): void => {
      const filtered = raw.replace(/\D/g, '');
      if (filtered.length === 0) {
        setCells((prev) => {
          const next = [...prev];
          next[index] = '';
          return next;
        });
        return;
      }
      const digit = filtered.slice(-1);
      setCells((prev) => {
        const next = [...prev];
        next[index] = digit;
        const code = next.join('');
        if (code.length === MFA_CODE_LENGTH && next.every((c) => c !== '')) {
          queueMicrotask(() => {
            trySubmitCode(code);
          });
        }
        return next;
      });
      if (digit !== '' && index < MFA_CODE_LENGTH - 1) {
        queueMicrotask(() => {
          inputRefsArr.current[index + 1]?.focus();
        });
      }
    },
    [trySubmitCode]
  );

  const onDigitKeyDown = useCallback(
    (index: number, e: KeyboardEvent<HTMLInputElement>): void => {
      if (e.key === 'Backspace') {
        if (cells[index] !== '') {
          e.preventDefault();
          onDigitChange(index, '');
          return;
        }
        if (index > 0) {
          e.preventDefault();
          inputRefsArr.current[index - 1]?.focus();
          setCells((prev) => {
            const next = [...prev];
            next[index - 1] = '';
            return next;
          });
        }
        return;
      }
      if (e.key === 'ArrowLeft' && index > 0) {
        e.preventDefault();
        inputRefsArr.current[index - 1]?.focus();
        return;
      }
      if (e.key === 'ArrowRight' && index < MFA_CODE_LENGTH - 1) {
        e.preventDefault();
        inputRefsArr.current[index + 1]?.focus();
      }
    },
    [cells, onDigitChange]
  );

  const onDigitPaste = useCallback(
    (index: number, e: ClipboardEvent<HTMLInputElement>): void => {
      const text = e.clipboardData.getData('text');
      const normalized = text.replace(/\D/g, '');
      if (normalized.length === 0) {
        return;
      }
      e.preventDefault();
      applyDigitsFromIndex(index, normalized);
    },
    [applyDigitsFromIndex]
  );

  return (
    <div className="space-y-6">
      {initialError ? (
        <div
          className="rounded-lg border border-red-500/25 bg-red-500/5 px-4 py-3 font-body text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
          role="alert"
        >
          {initialError}
        </div>
      ) : null}

      <form ref={formRef} action={completeMfaLoginAction} className="space-y-6" id="mfa-verify-form">
        <input defaultValue="" name="code" ref={hiddenCodeRef} type="hidden" />
        {nextPath ? <input name="next" type="hidden" value={nextPath} /> : null}

        <fieldset className="space-y-3">
          <legend className="sr-only">Código de verificación en dos pasos</legend>
          <div
            className="flex justify-center gap-2 sm:gap-3"
            role="group"
            aria-label={`Código de ${MFA_CODE_LENGTH} dígitos`}
          >
            {cells.map((digit, index) => (
              <input
                key={index}
                aria-label={`Dígito ${index + 1} de ${MFA_CODE_LENGTH}`}
                autoComplete={index === 0 ? 'one-time-code' : 'off'}
                className={cn(
                  'h-12 w-10 shrink-0 rounded-lg border text-center font-body text-xl font-semibold tabular-nums text-ink transition-all sm:h-14 sm:w-12 sm:text-2xl',
                  'border-line bg-surface-alt dark:border-white/10 dark:bg-canvas-alt',
                  'placeholder:text-ink-muted/25 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 dark:focus:ring-sage-mid/30'
                )}
                inputMode="numeric"
                maxLength={1}
                onChange={(e) => {
                  onDigitChange(index, e.target.value);
                }}
                onKeyDown={(e) => {
                  onDigitKeyDown(index, e);
                }}
                onPaste={(e) => {
                  onDigitPaste(index, e);
                }}
                pattern="[0-9]*"
                ref={(el) => {
                  setInputRef(index, el);
                }}
                type="text"
                value={digit}
              />
            ))}
          </div>
          <p className="text-center font-body text-[0.8rem] leading-relaxed text-ink-soft dark:text-ink-muted">
            ¿No coincide el código?{' '}
            <span className="text-ink dark:text-ink-soft">Revisa la hora del dispositivo o genera uno nuevo en la app.</span>
          </p>
        </fieldset>

        <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-stretch">
          <button
            className="flex-1 rounded-xl border border-line bg-sage-wash px-4 py-3.5 font-display text-xs font-medium uppercase tracking-[0.15em] text-ink transition-all hover:bg-sage-light/50 dark:border-white/10 dark:bg-white/10 dark:text-ink dark:hover:bg-white/[0.14]"
            form="mfa-logout-form"
            type="submit"
          >
            Cancelar
          </button>
          <SubmitMfa />
        </div>
      </form>

      <form action={logoutAction} className="hidden" id="mfa-logout-form" aria-hidden="true" tabIndex={-1} />

      <p className="text-center font-body text-[0.85rem] text-ink-muted dark:text-ink-soft">
        <button
          className="underline decoration-ink-muted/50 underline-offset-4 hover:text-ink dark:decoration-white/30 dark:hover:text-ink"
          form="mfa-logout-form"
          type="submit"
        >
          Cerrar sesión e intentar con otra cuenta
        </button>
      </p>
    </div>
  );
}
