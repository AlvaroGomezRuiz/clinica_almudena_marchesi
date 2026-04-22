'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useFormStatus } from 'react-dom';

import { verifyOtpAction } from '@/services/auth/registerActions';

/* Tipo local para el resultado de zxcvbn → evita arrastrar sus types al bundle. */
type ZxcvbnFn = (password: string) => { score: 0 | 1 | 2 | 3 | 4 };

function SubmitButton({ disabled }: { disabled: boolean }): JSX.Element {
  const { pending } = useFormStatus();

  return (
    <button
      className="w-full bg-primary text-on-primary font-label uppercase py-4 rounded-xl tracking-widest hover:bg-primary-dim transition-all shadow-lg shadow-primary/10"
      type="submit"
      disabled={pending || disabled}
    >
      {pending ? 'Procesando...' : 'Verificar'}
    </button>
  );
}

export default function VerificarOtpClient(): JSX.Element {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const [password, setPassword] = useState<string>('');
  const [passwordConfirm, setPasswordConfirm] = useState<string>('');
  const [zxcvbnFn, setZxcvbnFn] = useState<ZxcvbnFn | null>(null);

  const passwordPolicy = useMemo(() => {
    return {
      minLength: password.length >= 14,
      hasLower: /[a-z]/.test(password),
      hasUpper: /[A-Z]/.test(password),
      hasDigit: /\d/.test(password),
      hasSymbol: /[^A-Za-z0-9]/.test(password),
    };
  }, [password]);

  /* Cargamos zxcvbn (~400 KB) sólo cuando el usuario empieza a escribir.
     Así el First Load JS de esta ruta baja drásticamente. */
  useEffect(() => {
    if (!password || zxcvbnFn) return;
    let cancelled = false;
    import('zxcvbn')
      .then((mod) => {
        if (!cancelled) setZxcvbnFn(() => mod.default as ZxcvbnFn);
      })
      .catch(() => {
        /* Si falla la descarga, la política básica sigue funcionando. */
      });
    return () => {
      cancelled = true;
    };
  }, [password, zxcvbnFn]);

  const zxcvbnResult = useMemo(() => {
    if (!password || !zxcvbnFn) return null;
    return zxcvbnFn(password);
  }, [password, zxcvbnFn]);

  const isPolicyOk =
    passwordPolicy.minLength &&
    passwordPolicy.hasLower &&
    passwordPolicy.hasUpper &&
    passwordPolicy.hasDigit &&
    passwordPolicy.hasSymbol;

  /* Si zxcvbn aún no ha cargado, no bloqueamos por entropy (la política
     básica ya garantiza 14 chars + todas las clases). Cuando cargue,
     se aplica el threshold de score ≥ 3. */
  const isEntropyOk = zxcvbnFn ? (zxcvbnResult?.score ?? 0) >= 3 : true;
  const passwordsMatch = password.length > 0 && password === passwordConfirm;
  const isSubmitBlocked = !(isPolicyOk && isEntropyOk && passwordsMatch);

  return (
    <main className="min-h-screen pt-32 pb-20 flex items-center justify-center bg-surface px-6 text-on-surface font-body selection:bg-primary-container selection:text-on-primary-container">
      <form
        action={verifyOtpAction}
        className="w-full max-w-2xl bg-surface-container-lowest p-10 rounded-xl shadow-[0_20px_40px_rgba(75,100,95,0.06)] border-l-[5px] border-primary flex flex-col justify-between"
      >
        {error ? (
          <div className="mb-8 bg-error-container text-on-error-container border border-error/20 rounded-xl p-4 text-sm">
            {error}
          </div>
        ) : null}
        <div>
          <div className="flex justify-between items-start mb-8">
            <div className="bg-primary-container p-3 rounded-full">
              <span
                className="material-symbols-outlined text-primary"
                style={{ fontVariationSettings: '"FILL" 1' }}
              >
                security
              </span>
            </div>
            <span className="font-label text-[10px] uppercase tracking-widest text-primary font-bold">
              Verificación OTP
            </span>
          </div>

          <h4 className="font-headline text-2xl mb-4">Código de 6 dígitos</h4>
          <p className="font-body text-on-surface-variant mb-10 leading-relaxed">
            Introduce el código enviado a tu correo.
          </p>

          <div className="flex justify-center mb-10">
            <input
              className="w-full max-w-xs bg-transparent border-t-0 border-x-0 border-b-2 border-primary-fixed-dim focus:border-primary focus:ring-0 px-0 py-4 font-body text-4xl text-on-surface transition-all placeholder-stone-300 text-center tracking-[0.5em]"
              type="text"
              name="code"
              placeholder="000000"
              maxLength={6}
              inputMode="numeric"
              autoComplete="one-time-code"
              required
            />
          </div>

          <h4 className="font-headline text-2xl mb-4">Crea tu contraseña</h4>
          <p className="font-body text-on-surface-variant mb-8 leading-relaxed">
            Mínimo 14 caracteres, con mayúsculas, minúsculas, números y símbolos.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12">
            <div className="relative">
              <label className="absolute -top-6 left-0 font-label text-[10px] uppercase tracking-widest text-primary font-bold">
                Contraseña
              </label>
              <input
                className="w-full bg-transparent border-t-0 border-x-0 border-b-2 border-primary-fixed-dim focus:border-primary focus:ring-0 px-0 py-2 font-body text-lg text-on-surface transition-all placeholder-stone-300"
                type="password"
                name="password"
                placeholder="••••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="relative">
              <label className="absolute -top-6 left-0 font-label text-[10px] uppercase tracking-widest text-primary font-bold">
                Confirmación
              </label>
              <input
                className="w-full bg-transparent border-t-0 border-x-0 border-b-2 border-primary-fixed-dim focus:border-primary focus:ring-0 px-0 py-2 font-body text-lg text-on-surface transition-all placeholder-stone-300"
                type="password"
                name="password_confirm"
                placeholder="••••••••••••••"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="mt-10">
            <div className="flex items-center justify-between mb-2">
              <span className="font-label text-[10px] uppercase tracking-widest text-primary font-bold">
                Fortaleza
              </span>
              <span className="text-xs text-on-surface-variant">
                Score: {zxcvbnResult?.score ?? 0}/4
              </span>
            </div>
            <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${((zxcvbnResult?.score ?? 0) + 1) * 20}%` }}
              />
            </div>
            <div className="mt-4 text-xs text-on-surface-variant space-y-1">
              <div>
                {isPolicyOk ? '✔' : '✖'} Política (14+, may/min/número/símbolo)
              </div>
              <div>
                {isEntropyOk ? '✔' : '✖'} Entropía (bloquea contraseñas comunes/débiles)
              </div>
              <div>{passwordsMatch ? '✔' : '✖'} Coincidencia</div>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-outline-variant/15">
          <SubmitButton disabled={isSubmitBlocked} />
        </div>
      </form>
    </main>
  );
}

