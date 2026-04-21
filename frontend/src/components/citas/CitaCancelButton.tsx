'use client';

/**
 * Botón + modal de confirmación para cancelar una cita.
 * Reutilizable en portal paciente y admin (el RPC diferencia por rol).
 *
 * Props:
 *   - citaId:       id de la cita a cancelar
 *   - inicioISO:    ISO timestamp para calcular ventana 24h
 *   - compact:      si true, usa variant="ghost" size="sm" (para listados)
 *   - isAdmin:      muestra toggle "forzar refund" y oculta advertencia 24h
 *   - onCancelled:  callback opcional tras éxito (para optimistic refresh)
 */

import { useState, useTransition, useId } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/portal-shell/ui';
import { cancelarCitaAction } from '@/services/citas/actions';

interface CitaCancelButtonProps {
  readonly citaId: string;
  readonly inicioISO: string;
  readonly compact?: boolean;
  readonly isAdmin?: boolean;
  readonly servicioNombre?: string;
  readonly onCancelled?: () => void;
}

export function CitaCancelButton({
  citaId,
  inicioISO,
  compact = false,
  isAdmin = false,
  servicioNombre,
  onCancelled,
}: CitaCancelButtonProps): JSX.Element {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [force, setForce] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dialogTitleId = useId();
  const dialogDescId = useId();

  const inicioDate = new Date(inicioISO);
  const within24h = inicioDate.getTime() - Date.now() < 24 * 60 * 60 * 1000;
  const within24hPatient = !isAdmin && within24h;

  function handleSubmit(): void {
    setErr(null);
    startTransition(async () => {
      const res = await cancelarCitaAction(citaId, motivo, isAdmin ? force : false);
      if (!res.ok) {
        setErr(res.message);
        return;
      }
      setOpen(false);
      setMotivo('');
      setForce(false);
      onCancelled?.();
      router.refresh();
    });
  }

  return (
    <>
      <Button
        variant="ghost"
        size={compact ? 'sm' : 'md'}
        icon="close"
        onClick={() => setOpen(true)}
      >
        Cancelar
      </Button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={dialogTitleId}
          aria-describedby={dialogDescId}
          className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
        >
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => !pending && setOpen(false)}
            className="absolute inset-0 bg-ink/35 backdrop-blur-[6px]"
          />

          <div className="relative w-full max-w-lg rounded-[1.75rem] bg-canvas p-7 shadow-[0_40px_80px_-24px_rgba(28,28,25,0.35)] ring-1 ring-ink/10">
            <h2
              id={dialogTitleId}
              className="font-display text-[1.5rem] italic leading-tight tracking-[-0.015em] text-ink"
            >
              Cancelar cita
            </h2>

            <p
              id={dialogDescId}
              className="mt-2 font-body text-[0.9rem] leading-relaxed text-ink-soft"
            >
              {servicioNombre ? (
                <>
                  <strong className="font-medium text-ink">{servicioNombre}</strong> ·{' '}
                </>
              ) : null}
              {inicioDate.toLocaleString('es-ES', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Europe/Madrid',
              })}
            </p>

            {within24hPatient ? (
              <div
                role="alert"
                className="mt-5 rounded-2xl bg-[#FFF3E9] p-4 ring-1 ring-[#E7B28F]/40"
              >
                <p className="font-display text-[0.9rem] italic text-[#8A5436]">
                  Menos de 24 horas de antelación
                </p>
                <p className="mt-1 font-body text-[0.8rem] leading-relaxed text-[#6E4530]">
                  Según la política de la consulta, cancelaciones dentro de las 24h
                  previas no conllevan reembolso Stripe ni devolución al bono. Puedes
                  continuar si igualmente necesitas cancelar.
                </p>
              </div>
            ) : null}

            <label
              htmlFor="cancelar-motivo"
              className="mt-5 block font-body text-[0.72rem] uppercase tracking-[0.15em] text-ink-muted"
            >
              Motivo (opcional)
            </label>
            <textarea
              id="cancelar-motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value.slice(0, 500))}
              disabled={pending}
              rows={3}
              placeholder="Si es por un imprevisto, compartirlo ayuda a Almudena a reorganizar."
              className="mt-2 w-full resize-none rounded-2xl bg-white/70 px-4 py-3 font-body text-[0.9rem] leading-relaxed text-ink placeholder:text-ink-muted/70 ring-1 ring-ink/10 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />

            {isAdmin ? (
              <label className="mt-4 flex items-center gap-2.5 font-body text-[0.85rem] text-ink-soft">
                <input
                  type="checkbox"
                  checked={force}
                  onChange={(e) => setForce(e.target.checked)}
                  disabled={pending}
                  className="size-4 accent-primary"
                />
                Forzar reembolso total (override 24h)
              </label>
            ) : null}

            {err ? (
              <p role="alert" className="mt-4 font-body text-[0.85rem] text-[#b2675e]">
                {err}
              </p>
            ) : null}

            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Volver
              </Button>
              <Button
                variant="destructive"
                icon={pending ? 'progress_activity' : 'check'}
                onClick={handleSubmit}
                disabled={pending}
              >
                {pending ? 'Cancelando…' : 'Confirmar cancelación'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
