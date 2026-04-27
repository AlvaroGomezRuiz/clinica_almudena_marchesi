'use client';

import { useEffect, useRef, useState } from 'react';

interface EmailConfirmationModalProps {
  email: string;
  open: boolean;
  onClose: () => void;
}

export function EmailConfirmationModal({ email, open, onClose }: EmailConfirmationModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // Slight delay to trigger CSS transition
      requestAnimationFrame(() => setAnimateIn(true));
    } else if (!open && dialog.open) {
      setAnimateIn(false);
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handler = () => {
      setAnimateIn(false);
      onClose();
    };
    dialog.addEventListener('close', handler);
    return () => dialog.removeEventListener('close', handler);
  }, [onClose]);

  const maskedEmail = email
    ? email.replace(/^(.{2})(.*)(@.*)$/, (_m, start, middle, domain) =>
        `${start}${'•'.repeat(Math.min(middle.length, 6))}${domain}`
      )
    : '';

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-50 m-auto max-w-[420px] w-[92vw] rounded-3xl border border-white/10 dark:border-white/5 bg-transparent backdrop-blur-none p-0 [&::backdrop]:bg-ink/60 [&::backdrop]:backdrop-blur-md"
      style={{ background: 'transparent' }}
      aria-labelledby="email-confirm-title"
    >
      <div
        className={`relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#1a1f1e] via-[#1c2120] to-[#151917] shadow-2xl transition-all duration-500 ease-apple ${
          animateIn
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 translate-y-4'
        }`}
      >
        {/* Decorative glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-sage/10 blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-16 right-0 w-48 h-48 rounded-full bg-sage/5 blur-[80px] pointer-events-none" />

        {/* Subtle grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative p-8 sm:p-10">
          {/* Progress steps */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="flex items-center gap-1.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sage/90 text-white text-[10px] font-bold">
                ✓
              </span>
              <span className="text-sage/80 text-[10px] font-body uppercase tracking-wider hidden sm:inline">
                Datos
              </span>
            </div>
            <div className="w-6 h-px bg-sage/30" />
            <div className="flex items-center gap-1.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sage/90 text-white text-[10px] font-bold">
                ✓
              </span>
              <span className="text-sage/80 text-[10px] font-body uppercase tracking-wider hidden sm:inline">
                Cuenta
              </span>
            </div>
            <div className="w-6 h-px bg-sage/30" />
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-6 w-6 items-center justify-center rounded-full border-2 border-sage/60 text-sage text-[10px] font-bold">
                3
                <span className="absolute inset-0 rounded-full border-2 border-sage/40 animate-ping" />
              </span>
              <span className="text-sage text-[10px] font-body uppercase tracking-wider hidden sm:inline font-semibold">
                Email
              </span>
            </div>
          </div>

          {/* Animated envelope */}
          <div className="mx-auto mb-6 relative w-24 h-24">
            {/* Outer ring with rotation */}
            <div className="absolute inset-0 rounded-full border border-sage/20 animate-[spin_20s_linear_infinite]">
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-sage/40" />
            </div>

            {/* Inner ring */}
            <div className="absolute inset-2 rounded-full bg-sage/5 ring-1 ring-sage/10" />

            {/* Envelope icon with floating animation */}
            <div className="absolute inset-0 flex items-center justify-center animate-[float_3s_ease-in-out_infinite]">
              <svg
                className="h-10 w-10 text-sage"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.2}
              >
                {/* Envelope body */}
                <rect x="2" y="5" width="20" height="14" rx="2.5" className="fill-sage/10" />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2 7.5l8.9 5.5a2 2 0 002.2 0L22 7.5"
                />
                <rect x="2" y="5" width="20" height="14" rx="2.5" />
                {/* Small sparkle */}
                <circle cx="18" cy="8" r="0.8" className="fill-sage animate-pulse" />
              </svg>
            </div>
          </div>

          {/* Title section */}
          <div className="text-center mb-6">
            <p className="font-display text-[10px] uppercase tracking-[0.2em] text-sage/70 font-medium mb-2">
              ¡Todo listo!
            </p>
            <h2
              id="email-confirm-title"
              className="font-display text-[1.65rem] sm:text-[1.85rem] italic leading-tight text-white/95"
            >
              Revisa tu correo
            </h2>
          </div>

          {/* Email badge */}
          <div className="mx-auto max-w-[300px] mb-5">
            <div className="flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-full bg-white/5 ring-1 ring-white/10 backdrop-blur-sm">
              <svg className="h-4 w-4 text-sage/70 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
              </svg>
              <span className="font-body text-[0.85rem] text-white/80 truncate">
                {maskedEmail || email}
              </span>
            </div>
          </div>

          {/* Instructions */}
          <p className="text-center font-body text-[0.88rem] leading-relaxed text-white/50 mb-6 max-w-[320px] mx-auto">
            Hemos enviado un enlace de verificación. Haz clic en el botón del email para{' '}
            <span className="text-white/70 font-medium">activar tu cuenta</span>.
            <br />
            <span className="text-[0.8rem] text-white/35">
              El enlace caduca en 24 horas.
            </span>
          </p>

          {/* Tip box */}
          <div className="mb-8 rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06] p-4 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 shrink-0 text-base" aria-hidden="true">💡</span>
              <div className="font-body text-[0.78rem] text-white/40 leading-relaxed space-y-1">
                <p>
                  ¿No lo encuentras? Mira en{' '}
                  <strong className="text-white/55">spam</strong> o{' '}
                  <strong className="text-white/55">promociones</strong>.
                </p>
                <p>
                  <strong className="text-amber-400/70">Importante:</strong> abre el enlace en el{' '}
                  <em className="text-white/55">mismo navegador</em> donde te registraste.
                </p>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <button
            type="button"
            onClick={onClose}
            className="group relative w-full overflow-hidden rounded-2xl bg-sage py-4 text-center font-display text-xs uppercase tracking-[0.15em] font-medium text-white transition-all duration-300 hover:shadow-lg hover:shadow-sage/20 active:scale-[0.98]"
          >
            <span className="relative z-10">Entendido</span>
            <div className="absolute inset-0 bg-gradient-to-r from-sage via-sage-mid to-sage opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </button>

          {/* Secondary link */}
          <div className="mt-5 text-center">
            <a
              href="/login"
              className="inline-flex items-center gap-1.5 font-body text-[0.82rem] text-white/35 hover:text-white/60 underline underline-offset-4 decoration-white/10 hover:decoration-white/30 transition-all duration-300"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
              </svg>
              Ir a iniciar sesión
            </a>
          </div>
        </div>
      </div>
    </dialog>
  );
}
