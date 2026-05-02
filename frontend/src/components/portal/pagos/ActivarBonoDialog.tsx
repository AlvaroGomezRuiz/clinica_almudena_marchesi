'use client';

import { useState } from 'react';
import { Button } from '@/components/portal-shell/ui';
import dynamic from 'next/dynamic';

const PaymentElementDrawer = dynamic(() => import('./PaymentElementDrawer'), { ssr: false });

export interface PendingBonoData {
  id: string;
  sesiones_totales: number;
  precio_centimos: number;
  servicio_nombre: string;
}

interface ActivarBonoDialogProps {
  readonly bonos: PendingBonoData[];
}

export default function ActivarBonoDialog({ bonos }: ActivarBonoDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedBonoId, setSelectedBonoId] = useState<string | null>(null);

  if (!bonos || bonos.length === 0) return null;

  const selectedBono = bonos.find((b) => b.id === selectedBonoId);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 font-body text-[0.78rem] font-medium text-on-primary transition-colors hover:bg-primary-dim"
      >
        Activar bono
      </button>

      {/* Modal / Dialog manual usando un overlay */}
      {isOpen && !selectedBonoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-[#1b1b18]">
            <h2 className="font-display text-xl italic text-ink dark:text-white">Selecciona el bono a activar</h2>
            <p className="mt-2 font-body text-[0.85rem] text-ink-soft dark:text-white/60">
              Elige cuál de los bonos pendientes de pago deseas activar ahora.
            </p>

            <div className="mt-5 space-y-3">
              {bonos.map((bono) => (
                <div
                  key={bono.id}
                  className="flex items-center justify-between rounded-xl border border-ink/10 p-4 dark:border-white/10"
                >
                  <div>
                    <h3 className="font-body font-medium text-ink dark:text-white">
                      Bono {bono.servicio_nombre}
                    </h3>
                    <p className="font-body text-[0.8rem] text-ink-muted dark:text-white/50">
                      {bono.sesiones_totales} sesiones
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="font-body text-[0.9rem] font-semibold text-ink dark:text-white">
                      {(bono.precio_centimos / 100).toLocaleString('es-ES', {
                        style: 'currency',
                        currency: 'EUR',
                      })}
                    </span>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setSelectedBonoId(bono.id)}
                    >
                      Pagar
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <Button variant="ghost" onClick={() => setIsOpen(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}

      {selectedBonoId && (
        <PaymentElementDrawer
          open={!!selectedBonoId}
          onClose={() => {
            setSelectedBonoId(null);
            setIsOpen(false);
          }}
          target={{ kind: 'activar_bono', bonoPacienteId: selectedBonoId }}
          titleHint={`Activación Bono ${selectedBono?.servicio_nombre}`}
          amountHint={selectedBono?.precio_centimos}
        />
      )}
    </>
  );
}
