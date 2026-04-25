'use client';

/**
 * MfaManager — enrolar, verificar y desactivar TOTP real usando supabase.auth.mfa.
 *
 * Flujo enroll:
 *   1. `enroll({ factorType: 'totp' })` → devuelve qr + secret.
 *   2. Usuario escanea QR y escribe código OTP.
 *   3. `challenge(factorId)` + `verify({ factorId, challengeId, code })`.
 *
 * Flujo unenroll: `unenroll(factorId)` tras confirmación.
 */

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';

import { createBrowserClient } from '@/lib/supabase/client';

interface TotpFactor {
  readonly id: string;
  readonly friendly_name: string | null;
  readonly status: 'unverified' | 'verified';
  readonly created_at: string;
}

interface Props {
  readonly factores: readonly TotpFactor[];
  /**
   * Prefijo del friendly_name del factor al enrolar.
   * Default "Admin". En el portal del paciente usar "Paciente".
   */
  readonly friendlyNamePrefix?: string;
}

export default function MfaManager({
  factores,
  friendlyNamePrefix = 'Admin',
}: Props): JSX.Element {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserClient(), []);

  const [enrollMode, setEnrollMode] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const startEnroll = (): void => {
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const { data, error: err } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `${friendlyNamePrefix} · ${new Date().toISOString().slice(0, 10)}`,
      });
      if (err || !data) {
        setError(err?.message ?? 'No se pudo iniciar el alta de MFA.');
        return;
      }
      setQr(data.totp.qr_code);
      setSecret(data.totp.secret);
      setFactorId(data.id);
      setEnrollMode(true);
    });
  };

  const verifyCode = (): void => {
    if (!factorId) return;
    const trimmed = code.trim().replace(/\s+/g, '');
    if (!/^\d{6}$/.test(trimmed)) {
      setError('Introduce el código de 6 dígitos.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({
        factorId,
      });
      if (chErr || !challenge) {
        setError(chErr?.message ?? 'No se pudo generar el desafío.');
        return;
      }
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: trimmed,
      });
      if (vErr) {
        setError(vErr.message);
        return;
      }
      setInfo('MFA activado correctamente.');
      setEnrollMode(false);
      setQr(null);
      setSecret(null);
      setFactorId(null);
      setCode('');
      router.refresh();
    });
  };

  const cancelEnroll = (): void => {
    if (factorId) {
      void supabase.auth.mfa.unenroll({ factorId });
    }
    setEnrollMode(false);
    setQr(null);
    setSecret(null);
    setFactorId(null);
    setCode('');
    setError(null);
  };

  const unenroll = (id: string): void => {
    if (!window.confirm('¿Desactivar este factor TOTP? Perderás el 2FA.')) return;
    startTransition(async () => {
      const { error: err } = await supabase.auth.mfa.unenroll({ factorId: id });
      if (err) {
        setError(err.message);
        return;
      }
      setInfo('Factor desactivado.');
      router.refresh();
    });
  };

  const hasVerified = factores.some((f) => f.status === 'verified');

  return (
    <div className="space-y-4">
      {factores.length > 0 ? (
        <ul className="divide-y divide-ink/5 dark:divide-white/5">
          {factores.map((f) => (
            <li key={f.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-body text-[0.9rem] text-ink dark:text-white">
                  {f.friendly_name ?? 'TOTP'}
                </p>
                <p className="font-body text-[0.7rem] text-ink-muted dark:text-white/55">
                  {f.status === 'verified' ? 'Verificado' : 'Pendiente de verificar'} ·{' '}
                  {new Date(f.created_at).toLocaleDateString('es-ES')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => unenroll(f.id)}
                disabled={isPending}
                className="rounded-full bg-[#b2675e]/10 px-3 py-1.5 font-body text-[0.75rem] text-[#8c4d44] ring-1 ring-inset ring-[#b2675e]/30 transition hover:bg-[#b2675e]/20 disabled:opacity-40 dark:bg-[#b2675e]/20 dark:text-[#f4a294] dark:ring-[#b2675e]/40"
              >
                Desactivar
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="font-body text-[0.85rem] text-ink-soft dark:text-white/60">
          No tienes ningún factor TOTP registrado.
        </p>
      )}

      {!enrollMode ? (
        hasVerified ? (
          <p className="font-body text-[0.85rem] text-ink-soft dark:text-white/60">
            Segundo factor <strong>activo</strong>. Puedes desactivarlo arriba si cambias
            de dispositivo. Para añadir un <strong>segundo dispositivo de reserva</strong>
            ponte en contacto o usa Desactivar y vuelve a activar.
          </p>
        ) : (
          <button
            type="button"
            onClick={startEnroll}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 font-body text-[0.82rem] text-on-primary hover:bg-primary-dim disabled:opacity-40 dark:bg-primary dark:text-white"
          >
            <span className="material-symbols-outlined text-[1rem]" aria-hidden="true">
              key
            </span>
            Activar MFA ahora
          </button>
        )
      ) : (
        <div className="rounded-2xl bg-white/60 p-5 ring-1 ring-inset ring-ink/8 dark:bg-white/5 dark:ring-white/10">
          <h3 className="font-display text-[1.05rem] italic text-ink dark:text-white">
            Escanea el código QR
          </h3>
          <p className="mt-1 font-body text-[0.8rem] text-ink-soft dark:text-white/60">
            Usa Google Authenticator, 1Password, Authy o similar.
          </p>

          {qr ? (
            <div className="mt-3 flex items-start gap-4">
              <div className="rounded-xl bg-white p-2 ring-1 ring-inset ring-ink/10">
                <Image
                  src={qr}
                  alt="Código QR TOTP"
                  width={180}
                  height={180}
                  unoptimized
                />
              </div>
              {secret ? (
                <div>
                  <p className="font-body text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted dark:text-white/55">
                    Clave manual
                  </p>
                  <code className="mt-1 block select-all rounded-lg bg-white/70 px-2 py-1 font-mono text-[0.8rem] text-ink dark:bg-white/10 dark:text-white">
                    {secret}
                  </code>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="mt-4">
            <label className="font-body text-[0.72rem] uppercase tracking-[0.15em] text-ink-muted dark:text-white/55">
              Código de 6 dígitos
            </label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="mt-1 w-40 rounded-xl bg-white/80 px-3 py-2 font-mono text-[1.1rem] tracking-[0.4em] text-ink ring-1 ring-inset ring-ink/10 focus:outline-none focus:ring-2 focus:ring-ink/20 dark:bg-white/5 dark:text-white dark:ring-white/10"
            />
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={verifyCode}
              disabled={isPending || code.length !== 6}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 font-body text-[0.82rem] text-on-primary hover:bg-primary-dim disabled:opacity-40 dark:bg-primary dark:text-white"
            >
              Verificar y activar
            </button>
            <button
              type="button"
              onClick={cancelEnroll}
              disabled={isPending}
              className="rounded-full px-4 py-2 font-body text-[0.82rem] text-ink-muted hover:text-ink disabled:opacity-40 dark:text-white/55 dark:hover:text-white"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {error ? (
        <p role="alert" className="font-body text-[0.8rem] text-red-600 dark:text-red-400">
          Error: {error}
        </p>
      ) : null}
      {info ? (
        <p className="font-body text-[0.8rem] text-primary dark:text-primary/80">{info}</p>
      ) : null}
    </div>
  );
}
