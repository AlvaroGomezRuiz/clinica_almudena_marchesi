'use client';

/**
 * BajaCuentaCard — inicia un request RGPD de borrado.
 *
 * El admin nunca debería autoborrarse (rompería el negocio). Si el user es
 * admin, mostramos un aviso en su lugar. La API sólo inserta la solicitud;
 * el borrado físico lo procesa la Edge Function rgpd-request (F5).
 */

import { useState, useTransition } from 'react';

import { solicitarBajaCuentaAction } from '@/services/admin/cuenta-actions';

interface Props {
  readonly isAdmin: boolean;
}

export default function BajaCuentaCard({ isAdmin }: Props): JSX.Element {
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (isAdmin) {
    return (
      <p className="font-body text-[0.82rem] text-ink-soft dark:text-white/60">
        Las cuentas de administrador no pueden auto-borrarse desde aquí. Si
        necesitas bajar la cuenta de Almudena, contacta con soporte técnico.
      </p>
    );
  }

  if (done) {
    return (
      <div className="rounded-2xl bg-primary/10 p-4 ring-1 ring-inset ring-primary/20 dark:bg-primary/20 dark:ring-primary/30">
        <p className="font-body text-[0.85rem] text-primary dark:text-white">
          Solicitud recibida. Tendrás respuesta en un plazo máximo de 30 días
          naturales, conforme al RGPD.
        </p>
      </div>
    );
  }

  const submit = (): void => {
    setError(null);
    startTransition(async () => {
      const res = await solicitarBajaCuentaAction(motivo);
      if (!res.ok) {
        setError(res.message ?? 'No se pudo enviar la solicitud.');
        return;
      }
      setDone(true);
    });
  };

  return !open ? (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="rounded-full bg-[#b2675e]/10 px-4 py-2 font-body text-[0.82rem] text-[#8c4d44] ring-1 ring-inset ring-[#b2675e]/30 transition hover:bg-[#b2675e]/20 dark:bg-[#b2675e]/20 dark:text-[#f4a294] dark:ring-[#b2675e]/40"
    >
      Solicitar baja de mi cuenta
    </button>
  ) : (
    <div className="space-y-3 rounded-2xl bg-white/70 p-4 ring-1 ring-inset ring-ink/8 dark:bg-white/5 dark:ring-white/10">
      <p className="font-body text-[0.82rem] text-ink dark:text-white">
        Al solicitar la baja se eliminarán tus datos personales conforme al
        derecho de supresión (RGPD art. 17). Conservaremos únicamente lo
        exigido por obligaciones fiscales (facturación) durante el plazo legal.
      </p>
      <label className="block">
        <span className="font-body text-[0.72rem] uppercase tracking-[0.15em] text-ink-muted dark:text-white/55">
          Motivo (opcional)
        </span>
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-xl bg-white/80 px-3 py-2 font-body text-[0.85rem] text-ink ring-1 ring-inset ring-ink/10 focus:outline-none focus:ring-2 focus:ring-ink/20 dark:bg-white/5 dark:text-white dark:ring-white/10"
        />
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={isPending}
          className="rounded-full bg-[#8c4d44] px-4 py-2 font-body text-[0.82rem] text-white hover:bg-[#6f3c35] disabled:opacity-40"
        >
          Confirmar solicitud
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={isPending}
          className="rounded-full px-4 py-2 font-body text-[0.82rem] text-ink-muted hover:text-ink disabled:opacity-40 dark:text-white/55 dark:hover:text-white"
        >
          Cancelar
        </button>
      </div>
      {error ? (
        <p className="font-body text-[0.78rem] text-red-600 dark:text-red-400">
          Error: {error}
        </p>
      ) : null}
    </div>
  );
}
