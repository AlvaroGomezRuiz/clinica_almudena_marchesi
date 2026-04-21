'use client';

/**
 * DerechosRgpdCard — formulario para solicitar derechos RGPD (acceso/export,
 * rectificación, portabilidad, limitación). La baja de cuenta es una acción
 * aparte (BajaCuentaCard).
 *
 * El payload se guarda como solicitud pendiente; la Edge Function rgpd-request
 * (F5) se encarga de generar el ZIP / notificación.
 */

import { useState, useTransition } from 'react';

import {
  solicitarDerechoRgpdAction,
  type RgpdDerecho,
} from '@/services/admin/cuenta-actions';

interface DerechoDef {
  readonly id: RgpdDerecho;
  readonly label: string;
  readonly description: string;
  readonly icon: string;
}

const DERECHOS: readonly DerechoDef[] = [
  {
    id: 'exportar',
    label: 'Exportar mis datos',
    description:
      'Recibirás un archivo con todos tus datos personales, citas, pagos y mensajes.',
    icon: 'download',
  },
  {
    id: 'rectificar',
    label: 'Rectificar datos',
    description:
      'Solicita corregir algún dato personal que aparezca incorrecto en tu ficha.',
    icon: 'edit',
  },
  {
    id: 'portabilidad',
    label: 'Portabilidad',
    description:
      'Transferencia de tus datos en formato estructurado a otro profesional o plataforma.',
    icon: 'sync_alt',
  },
  {
    id: 'limitacion',
    label: 'Limitar tratamiento',
    description:
      'Restringe temporalmente el uso de tus datos sin eliminar la cuenta.',
    icon: 'lock',
  },
];

export default function DerechosRgpdCard(): JSX.Element {
  const [selected, setSelected] = useState<RgpdDerecho | null>(null);
  const [motivo, setMotivo] = useState('');
  const [done, setDone] = useState<RgpdDerecho | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = (): void => {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const res = await solicitarDerechoRgpdAction(selected, motivo);
      if (!res.ok) {
        setError(res.message ?? 'No se pudo enviar la solicitud.');
        return;
      }
      setDone(selected);
      setSelected(null);
      setMotivo('');
    });
  };

  if (done) {
    return (
      <div className="rounded-2xl bg-primary/10 p-4 ring-1 ring-inset ring-primary/20 dark:bg-primary/20 dark:ring-primary/30">
        <p className="font-body text-[0.85rem] text-primary dark:text-white">
          Solicitud <strong>{done}</strong> registrada. Almudena la revisará en
          un plazo máximo de 30 días naturales (RGPD art. 12).
        </p>
        <button
          type="button"
          onClick={() => setDone(null)}
          className="mt-2 font-body text-[0.78rem] text-primary underline-offset-2 hover:underline dark:text-white/90"
        >
          Enviar otra solicitud
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        {DERECHOS.map((d) => {
          const active = selected === d.id;
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => setSelected(d.id)}
              className={`flex items-start gap-3 rounded-2xl p-4 text-left transition ${
                active
                  ? 'bg-primary/10 ring-2 ring-inset ring-primary dark:bg-primary/25'
                  : 'bg-white/70 ring-1 ring-inset ring-ink/8 hover:bg-white/90 dark:bg-white/5 dark:ring-white/10 dark:hover:bg-white/10'
              }`}
            >
              <span
                className="material-symbols-outlined text-primary"
                aria-hidden="true"
              >
                {d.icon}
              </span>
              <div>
                <p className="font-body text-[0.88rem] text-ink dark:text-white">
                  {d.label}
                </p>
                <p className="mt-0.5 font-body text-[0.74rem] text-ink-muted dark:text-white/55">
                  {d.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {selected ? (
        <div className="space-y-3 rounded-2xl bg-white/70 p-4 ring-1 ring-inset ring-ink/8 dark:bg-white/5 dark:ring-white/10">
          <label className="block">
            <span className="font-body text-[0.72rem] uppercase tracking-[0.15em] text-ink-muted dark:text-white/55">
              Detalles (opcional)
            </span>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              placeholder="Indica qué datos concretos quieres rectificar o el motivo de la solicitud…"
              className="mt-1 w-full rounded-xl bg-white/80 px-3 py-2 font-body text-[0.85rem] text-ink ring-1 ring-inset ring-ink/10 focus:outline-none focus:ring-2 focus:ring-ink/20 dark:bg-white/5 dark:text-white dark:ring-white/10"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={isPending}
              className="rounded-full bg-primary px-4 py-2 font-body text-[0.82rem] text-on-primary hover:bg-primary-dim disabled:opacity-40"
            >
              {isPending ? 'Enviando…' : 'Enviar solicitud'}
            </button>
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setMotivo('');
              }}
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
      ) : null}
    </div>
  );
}
