'use client';

import { useEffect, useRef } from 'react';

interface EmailConfirmationModalProps {
  email: string;
  open: boolean;
  onClose: () => void;
}

export function EmailConfirmationModal({ email, open, onClose }: EmailConfirmationModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handler = () => onClose();
    dialog.addEventListener('close', handler);
    return () => dialog.removeEventListener('close', handler);
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-50 m-auto max-w-md w-[90vw] rounded-3xl border border-white/10 dark:border-white/5 bg-canvas dark:bg-[#1a1a17] backdrop-blur-2xl shadow-apple-lg p-0 open:animate-[modal-in_0.4s_cubic-bezier(0.16,1,0.3,1)] [&::backdrop]:bg-ink/50 [&::backdrop]:backdrop-blur-sm"
      aria-labelledby="email-confirm-title"
    >
      <div className="p-8 md:p-10 text-center">
        {/* Animated envelope icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-sage/10 ring-1 ring-sage/20">
          <svg
            className="h-10 w-10 text-sage animate-[float_3s_ease-in-out_infinite]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
            />
          </svg>
        </div>

        <p className="font-display text-[10px] uppercase tracking-[0.15em] text-primary/80 font-medium">
          Cuenta creada
        </p>

        <h2
          id="email-confirm-title"
          className="mt-2 font-display text-[1.75rem] italic leading-tight text-ink"
        >
          Revisa tu correo
        </h2>

        <p className="mt-4 font-body text-[0.95rem] leading-relaxed text-ink-soft">
          Hemos enviado un enlace de confirmación a
        </p>
        <p className="mt-1 font-body text-[1rem] font-medium text-ink break-all">
          {email}
        </p>
        <p className="mt-4 font-body text-[0.9rem] leading-relaxed text-ink-soft">
          Abre el mensaje y haz click en el botón para activar tu cuenta.
          El enlace caduca en <strong className="text-ink">24 horas</strong>.
        </p>

        <div className="mt-6 rounded-2xl bg-sage/5 ring-1 ring-sage/10 p-4">
          <p className="font-body text-[0.8rem] text-ink-muted leading-relaxed">
            💡 ¿No lo encuentras? Revisa la carpeta de{' '}
            <strong className="text-ink-soft">spam</strong> o{' '}
            <strong className="text-ink-soft">promociones</strong>.
            Si sigue sin llegar, contacta con la consulta.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-8 w-full bg-primary text-on-primary font-display text-xs uppercase py-3.5 rounded-xl tracking-[0.15em] font-medium hover:bg-primary-dim transition-all shadow-lg shadow-primary/10"
        >
          Entendido
        </button>

        <a
          href="/login"
          className="mt-4 inline-block font-body text-[0.85rem] text-ink-soft underline underline-offset-4 hover:text-ink transition-colors"
        >
          Ir a iniciar sesión
        </a>
      </div>
    </dialog>
  );
}
