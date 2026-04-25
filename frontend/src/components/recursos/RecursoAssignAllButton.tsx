'use client';

/**
 * Asigna un recurso a todos los pacientes activos (idempotente vía Edge/RPC).
 */

import { useId, useState, useTransition, type JSX } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/portal-shell/ui';
import { asignarRecursoATodosPacientesAction } from '@/services/recursos/actions';

interface Props {
  readonly recursoId: string;
  readonly recursoTitulo: string;
}

export function RecursoAssignAllButton({ recursoId, recursoTitulo }: Props): JSX.Element {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const titleId = useId();

  const run = (): void => {
    setMsg(null);
    startTransition(async () => {
      const res = await asignarRecursoATodosPacientesAction(recursoId);
      if (!res.ok) {
        setMsg(res.message);
        return;
      }
      setMsg(
        `Listo: ${res.creados} nuevas · ${res.yaExistian} ya tenían el recurso` +
          (res.fallos > 0 ? ` · ${res.fallos} error(es)` : '')
      );
      router.refresh();
    });
  };

  return (
    <>
      <Button
        variant="surface"
        size="sm"
        icon="group"
        type="button"
        onClick={() => {
          setMsg(null);
          setOpen(true);
        }}
      >
        Todos
      </Button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
        >
          <button
            type="button"
            aria-label="Cerrar"
            className="absolute inset-0 bg-ink/35 backdrop-blur-[6px]"
            onClick={() => !pending && setOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-[1.75rem] bg-canvas p-6 shadow-2xl ring-1 ring-ink/10 dark:bg-[#1a1a1a] dark:ring-white/10">
            <h2 id={titleId} className="font-display text-[1.2rem] italic text-ink dark:text-white">
              Asignar a todos los pacientes
            </h2>
            <p className="mt-2 font-body text-[0.85rem] leading-relaxed text-ink-soft dark:text-white/65">
              Se enviará el recurso «{recursoTitulo}» a cada paciente activo que
              aún no lo tenga (máx. 200 en lista). Puede tardar unos segundos.
            </p>
            {msg ? (
              <p className="mt-4 rounded-xl bg-white/60 px-3 py-2 font-body text-[0.82rem] text-ink dark:bg-white/5 dark:text-white">
                {msg}
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Button variant="ghost" size="sm" type="button" disabled={pending} onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button variant="primary" size="sm" type="button" disabled={pending} onClick={run}>
                {pending ? 'Asignando…' : 'Confirmar'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
