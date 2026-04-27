'use client';

/**
 * AsignarBonoManualButton — modal administrativo para crear bonos fuera
 * de Stripe (tarjeta, transferencia, regalo, efectivo, Klarna).
 *
 * Flujo:
 *   1. Admin busca paciente (reusa listarPacientesQuickAction).
 *   2. Elige servicio del catálogo (listarServiciosCatalogoAction).
 *   3. Configura sesiones, importe, método, validez, notas.
 *   4. Submit → asignarBonoManualAction (RPC SECURITY DEFINER).
 *   5. El modal se cierra y la página se revalida.
 *
 * Queda rastro siempre en `pagos` (auditoría). Si el método es `regalo`
 * o importe = 0, se marca como `excluir_de_facturacion` automáticamente.
 */

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { RedeemGiftIcon } from '@/components/icons/RedeemGiftIcon';
import { Button } from '@/components/portal-shell/ui';
import { METODOS_ASIGNAR_BONO } from '@/lib/admin/facturacion-metodo-display';
import {
  listarPacientesQuickAction,
  listarServiciosCatalogoAction,
  asignarBonoManualAction,
  type ServicioCatalogo,
  type MetodoPagoManual,
} from '@/services/admin/actions';

interface Paciente {
  readonly id: string;
  readonly display_name: string;
  readonly email: string;
}

export default function AsignarBonoManualButton(): JSX.Element {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'paciente' | 'detalles'>('paciente');

  // Paso 1: paciente
  const [query, setQuery] = useState('');
  const [resultados, setResultados] = useState<readonly Paciente[]>([]);
  const [paciente, setPaciente] = useState<Paciente | null>(null);

  // Paso 2: detalles
  const [servicios, setServicios] = useState<readonly ServicioCatalogo[]>([]);
  const [servicioId, setServicioId] = useState<string>('');
  const [sesionesStr, setSesionesStr] = useState<string>('3');
  const [importeEuros, setImporteEuros] = useState<string>('');
  const [metodo, setMetodo] = useState<MetodoPagoManual>('tarjeta');
  const [validezDias, setValidezDias] = useState<number>(180);
  const [notas, setNotas] = useState<string>('');
  const [excluirFacturacion, setExcluirFacturacion] = useState<boolean>(false);

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset total cuando se cierra
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setStep('paciente');
      setQuery('');
      setResultados([]);
      setPaciente(null);
      setServicioId('');
      setSesionesStr('3');
      setImporteEuros('');
      setMetodo('tarjeta');
      setValidezDias(180);
      setNotas('');
      setExcluirFacturacion(false);
      setError(null);
    }
  }, [open]);

  // Debounce búsqueda
  useEffect(() => {
    if (!open || step !== 'paciente') return;
    const h = setTimeout(() => {
      startTransition(async () => {
        try {
          const data = await listarPacientesQuickAction(query);
          setResultados(data);
        } catch {
          setError('No se pudo buscar pacientes.');
        }
      });
    }, 250);
    return () => clearTimeout(h);
  }, [query, open, step]);

  // Cargar catálogo al pasar al paso 2
  useEffect(() => {
    if (step !== 'detalles' || servicios.length > 0) return;
    startTransition(async () => {
      try {
        const cat = await listarServiciosCatalogoAction();
        setServicios(cat);
        if (cat.length > 0 && !servicioId) {
          setServicioId(cat[0].id);
        }
      } catch {
        setError('No se pudo cargar el catálogo.');
      }
    });
  }, [step, servicios.length, servicioId]);

  const sesiones = useMemo(() => {
    const raw = sesionesStr.trim();
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 1) return 1;
    return Math.min(50, n);
  }, [sesionesStr]);

  // Auto-calcular importe cuando cambia servicio × sesiones (si el admin
  // no ha tocado el campo manualmente).
  const [importeTocado, setImporteTocado] = useState(false);
  useEffect(() => {
    if (importeTocado) return;
    const s = servicios.find((x) => x.id === servicioId);
    if (!s) return;
    const total = (s.precio_centimos * sesiones) / 100;
    setImporteEuros(total.toFixed(2));
  }, [servicioId, sesiones, servicios, importeTocado]);

  const seleccionarPaciente = useCallback((p: Paciente) => {
    setPaciente(p);
    setStep('detalles');
  }, []);

  const onSubmit = useCallback(() => {
    if (!paciente || !servicioId) return;
    setError(null);

    const importeNum = Number.parseFloat(importeEuros.replace(',', '.'));
    if (!Number.isFinite(importeNum) || importeNum < 0) {
      setError('Importe inválido.');
      return;
    }

    startTransition(async () => {
      const result = await asignarBonoManualAction({
        paciente_id: paciente.id,
        servicio_id: servicioId,
        sesiones,
        metodo,
        importe_centimos: Math.round(importeNum * 100),
        validez_dias: validezDias,
        notas: notas.trim() || undefined,
        excluir_facturacion: excluirFacturacion,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }, [paciente, servicioId, sesiones, metodo, importeEuros, validezDias, notas, excluirFacturacion, router]);

  return (
    <>
      <Button
        variant="surface"
        icon="add_card"
        onClick={() => setOpen(true)}
        type="button"
      >
        Asignar bono
      </Button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Asignar bono manual"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-canvas shadow-2xl dark:bg-[#1a1a1a]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-ink/10 px-6 py-4 dark:border-white/10">
              <div className="flex min-w-0 items-start gap-3">
                <span
                  className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary dark:bg-primary/25 dark:text-white"
                  aria-hidden="true"
                >
                  <span className="material-symbols-outlined text-[1.2rem]">card_membership</span>
                </span>
                <div>
                <h2 className="font-display text-[1.1rem] italic text-ink dark:text-white">
                  {step === 'paciente' ? 'Asignar bono · Paciente' : 'Asignar bono · Detalles'}
                </h2>
                <p className="mt-0.5 font-body text-[0.75rem] text-ink-muted dark:text-white/55">
                  {step === 'paciente'
                    ? 'Selecciona el paciente al que asignar el bono'
                    : `Paciente: ${paciente?.display_name}`}
                </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="material-symbols-outlined rounded-full p-2 text-ink-muted hover:bg-ink/5 dark:text-white/55 dark:hover:bg-white/10"
                aria-label="Cerrar"
              >
                close
              </button>
            </div>

            {/* Paso 1: paciente */}
            {step === 'paciente' ? (
              <div className="p-6">
                <label className="block">
                  <span className="sr-only">Buscar paciente</span>
                  <div className="relative">
                    <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted dark:text-white/55">
                      search
                    </span>
                    <input
                      ref={inputRef}
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Nombre o email…"
                      className="w-full rounded-lg border border-ink/10 bg-white py-3 pl-10 pr-4 font-body text-[0.9rem] text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-white/15 dark:bg-white/5 dark:text-white"
                    />
                  </div>
                </label>

                <div className="mt-4 max-h-72 overflow-y-auto">
                  {resultados.length === 0 ? (
                    <p className="py-8 text-center font-body text-[0.85rem] text-ink-muted dark:text-white/55">
                      {isPending ? 'Buscando…' : 'Sin resultados'}
                    </p>
                  ) : (
                    <ul className="space-y-1">
                      {resultados.map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => seleccionarPaciente(p)}
                            className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left hover:bg-ink/5 dark:hover:bg-white/10"
                          >
                            <div>
                              <div className="font-body text-[0.9rem] text-ink dark:text-white">
                                {p.display_name}
                              </div>
                              <div className="font-body text-[0.75rem] text-ink-muted dark:text-white/55">
                                {p.email}
                              </div>
                            </div>
                            <span className="material-symbols-outlined text-ink-muted dark:text-white/55">
                              chevron_right
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ) : (
              /* Paso 2: detalles */
              <div className="max-h-[70vh] space-y-4 overflow-y-auto p-6">
                {/* Servicio */}
                <Campo label="Servicio">
                  <select
                    value={servicioId}
                    onChange={(e) => setServicioId(e.target.value)}
                    className="w-full rounded-lg border border-ink/10 bg-white px-3 py-2.5 font-body text-[0.9rem] text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-white/15 dark:bg-white/5 dark:text-white"
                  >
                    {servicios.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre} · {(s.precio_centimos / 100).toFixed(2)} €
                      </option>
                    ))}
                  </select>
                </Campo>

                {/* Sesiones + Importe */}
                <div className="grid grid-cols-2 gap-3">
                  <Campo label="Nº sesiones">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="off"
                      value={sesionesStr}
                      onChange={(e) => setSesionesStr(e.target.value.replace(/[^\d]/g, ''))}
                      onBlur={() => {
                        const n = Number.parseInt(sesionesStr, 10);
                        if (!Number.isFinite(n) || n < 1) {
                          setSesionesStr('1');
                        } else {
                          setSesionesStr(String(Math.min(50, n)));
                        }
                      }}
                      className="w-full rounded-lg border border-ink/10 bg-white px-3 py-2.5 font-body text-[0.9rem] text-ink outline-none tabular-nums focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-white/15 dark:bg-white/5 dark:text-white"
                    />
                  </Campo>
                  <Campo label="Importe total (€)">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={importeEuros}
                      onChange={(e) => {
                        setImporteTocado(true);
                        setImporteEuros(e.target.value);
                      }}
                      placeholder="0,00"
                      className="w-full rounded-lg border border-ink/10 bg-white px-3 py-2.5 font-body text-[0.9rem] text-ink outline-none tabular-nums focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-white/15 dark:bg-white/5 dark:text-white"
                    />
                  </Campo>
                </div>

                {/* Método */}
                <Campo label="Método de pago">
                  <div className="grid grid-cols-2 gap-2 min-[520px]:grid-cols-3 min-[700px]:grid-cols-5">
                    {METODOS_ASIGNAR_BONO.map((m) => {
                      const selected = metodo === m.value;
                      return (
                        <button
                          key={m.value}
                          type="button"
                          onClick={() => setMetodo(m.value)}
                          aria-pressed={selected}
                          className={[
                            'flex min-h-[4.5rem] flex-col items-center justify-center gap-0.5 rounded-xl border px-1.5 py-2.5 font-body text-[0.68rem] leading-tight transition sm:min-h-0 sm:py-3 sm:text-[0.72rem]',
                            selected
                              ? 'border-primary bg-primary/10 text-primary dark:bg-primary/20'
                              : 'border-ink/10 text-ink-muted hover:border-ink/20 dark:border-white/15 dark:text-white/60',
                          ].join(' ')}
                        >
                          {m.redeemSvg ? (
                            <RedeemGiftIcon className="h-[1.2rem] w-[1.2rem]" />
                          ) : (
                            <span className="material-symbols-outlined text-[1.2rem]" aria-hidden>
                              {m.icon}
                            </span>
                          )}
                          <span className="text-center font-medium">{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </Campo>

                {/* Validez */}
                <Campo label="Validez (días)">
                  <input
                    type="number"
                    min={1}
                    max={730}
                    value={validezDias}
                    onChange={(e) => setValidezDias(Math.max(1, Math.min(730, Number(e.target.value) || 180)))}
                    className="w-full rounded-lg border border-ink/10 bg-white px-3 py-2.5 font-body text-[0.9rem] text-ink outline-none tabular-nums focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-white/15 dark:bg-white/5 dark:text-white"
                  />
                </Campo>

                {/* Notas */}
                <Campo label="Notas internas (opcional)">
                  <textarea
                    value={notas}
                    onChange={(e) => setNotas(e.target.value.slice(0, 500))}
                    rows={2}
                    placeholder="Ej: Recibo #123, transferencia 22/04…"
                    className="w-full resize-none rounded-lg border border-ink/10 bg-white px-3 py-2.5 font-body text-[0.85rem] text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-white/15 dark:bg-white/5 dark:text-white"
                  />
                </Campo>

                {/* Excluir facturación */}
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-ink/10 bg-canvas-soft p-3 dark:border-white/15 dark:bg-white/5">
                  <input
                    type="checkbox"
                    checked={excluirFacturacion}
                    onChange={(e) => setExcluirFacturacion(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-primary"
                  />
                  <div>
                    <div className="font-body text-[0.85rem] font-medium text-ink dark:text-white">
                      Excluir de informes económicos
                    </div>
                    <div className="font-body text-[0.72rem] text-ink-muted dark:text-white/55">
                      El pago queda registrado para auditoría, pero NO aparece en
                      los totales del panel ni en el export CSV. Recomendado para
                      regalos o sesiones de cortesía.
                    </div>
                  </div>
                </label>

                {error ? (
                  <p
                    role="alert"
                    className="rounded-lg bg-red-50 px-3 py-2 font-body text-[0.8rem] text-red-900 dark:bg-red-950/40 dark:text-red-300"
                  >
                    {error}
                  </p>
                ) : null}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 border-t border-ink/10 bg-canvas-soft px-6 py-4 dark:border-white/10 dark:bg-white/5">
              {step === 'detalles' ? (
                <button
                  type="button"
                  onClick={() => setStep('paciente')}
                  className="font-body text-[0.85rem] text-ink-muted hover:text-ink dark:text-white/60 dark:hover:text-white"
                >
                  ← Cambiar paciente
                </button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-4 py-2 font-body text-[0.85rem] text-ink-muted hover:bg-ink/5 dark:text-white/60 dark:hover:bg-white/10"
                >
                  Cancelar
                </button>
                {step === 'detalles' ? (
                  <Button
                    variant="primary"
                    icon="check"
                    onClick={onSubmit}
                    disabled={isPending || !servicioId || sesiones < 1}
                    type="button"
                  >
                    {isPending ? 'Asignando…' : 'Asignar bono'}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <label className="block">
      <span className="mb-1.5 block font-body text-[0.72rem] uppercase tracking-[0.12em] text-ink-muted dark:text-white/55">
        {label}
      </span>
      {children}
    </label>
  );
}
