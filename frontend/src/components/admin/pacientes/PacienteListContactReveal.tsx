'use client';

/**
 * Panel de contacto en listado admin: un diálogo con menú (tel, email, emergencia,
 * DNI/domicilio) y paso de revelación vía `paciente_revelar_campo` (auditado).
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';

import PacienteListAvatar from '@/components/admin/pacientes/PacienteListAvatar';
import { Button } from '@/components/portal-shell/ui';
import { revelarCampoSensibleAction } from '@/services/admin/ficha-actions';
import type { CampoSensible } from '@/services/admin/ficha-actions';

const JUSTIFICACION_LISTA =
  'Lista admin pacientes — revelación desde panel de contacto';

export interface PacienteListContactRevealProps {
  readonly pacienteId: string;
  readonly patientLabel: string;
  /** Avatar perfil o ficha (misma prioridad que en la fila de tabla). */
  readonly avatarImageUrl: string | null;
  readonly avatarInitials: string;
  readonly colorEtiqueta: string | null;
  readonly hasTelefono: boolean;
  readonly hasEmail: boolean;
  readonly hasContactoEmergencia: boolean;
  readonly hasDireccion: boolean;
  readonly hasDni: boolean;
  /** Texto del botón (p. ej. «Información» en chat admin). */
  readonly triggerLabel?: string;
  /** Icono Material (`shield_lock` por defecto). Ignorado si `triggerIconNode` está definido. */
  readonly triggerIcon?: string;
  /** Sustituye el icono Material (p. ej. SVG fuera del subset woff2 local). */
  readonly triggerIconNode?: ReactNode;
}

interface TriggerPayload {
  readonly title: string;
  readonly steps: readonly { label: string; campo: CampoSensible }[];
}

interface PanelUi {
  readonly loading: boolean;
  readonly error: string | null;
  readonly lines: readonly { label: string; value: string }[];
}

export default function PacienteListContactReveal({
  pacienteId,
  patientLabel,
  avatarImageUrl,
  avatarInitials,
  colorEtiqueta,
  hasTelefono,
  hasEmail,
  hasContactoEmergencia,
  hasDireccion,
  hasDni,
  triggerLabel = 'Contacto',
  triggerIcon = 'shield_lock',
  triggerIconNode,
}: PacienteListContactRevealProps): JSX.Element {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [trigger, setTrigger] = useState<TriggerPayload | null>(null);
  const [ui, setUi] = useState<PanelUi | null>(null);

  const showDatosDomicilio = hasDireccion || hasDni;
  const hayAlgunaRevelacion =
    hasTelefono || hasEmail || hasContactoEmergencia || showDatosDomicilio;

  const pushTrigger = (next: TriggerPayload) => {
    setTrigger(next);
  };

  const openMenu = () => {
    if (!hayAlgunaRevelacion) return;
    setTrigger(null);
    setUi(null);
    const dlg = dialogRef.current;
    if (dlg) dlg.showModal();
  };

  const backToMenu = () => {
    setTrigger(null);
    setUi(null);
  };

  const closeAll = () => {
    dialogRef.current?.close();
    setTrigger(null);
    setUi(null);
  };

  useEffect(() => {
    if (trigger === null) {
      return;
    }

    setUi({ loading: true, error: null, lines: [] });
    let cancelled = false;

    void (async () => {
      const lines: { label: string; value: string }[] = [];
      for (const step of trigger.steps) {
        const res = await revelarCampoSensibleAction(
          pacienteId,
          step.campo,
          JUSTIFICACION_LISTA
        );
        if (cancelled) return;
        if (!res.ok) {
          setUi({ loading: false, error: res.message, lines });
          return;
        }
        const v = res.data.plaintext?.trim();
        lines.push({
          label: step.label,
          value: v && v.length > 0 ? v : '—',
        });
      }
      if (!cancelled) {
        setUi({ loading: false, error: null, lines });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [trigger, pacienteId]);

  const filaClase =
    'flex w-full min-w-0 items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left font-body text-[0.86rem] ring-1 ring-inset transition-colors focus-visible:outline focus-visible:ring-2 focus-visible:ring-primary/50';

  return (
    <>
      <Button
        type="button"
        variant="surface"
        size="sm"
        icon={triggerIconNode ? undefined : triggerIcon}
        iconNode={triggerIconNode}
        onClick={openMenu}
        disabled={!hayAlgunaRevelacion}
        className="w-full max-w-full sm:w-auto"
        aria-label="Abrir panel de contacto: teléfono, email o datos cifrados (acceso auditado)"
      >
        <span className="truncate">{triggerLabel}</span>
      </Button>

      <dialog
        ref={dialogRef}
        onClose={closeAll}
        className="max-w-md w-[calc(100vw-1.5rem)] max-h-[90dvh] rounded-2xl border-0 bg-canvas p-0 text-ink shadow-2xl ring-1 ring-ink/10 backdrop:bg-ink/40 open:flex dark:bg-[#1a1a1a] dark:text-white dark:ring-white/10 sm:w-[calc(100%-2rem)]"
        aria-labelledby="pac-contact-sheet-title"
      >
        <div className="flex max-h-[85vh] w-full min-w-0 flex-col">
          <header className="flex items-start justify-between gap-3 border-b border-ink/8 px-4 py-3 sm:px-5 sm:py-4 dark:border-white/10">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <div className="pt-0.5">
                <PacienteListAvatar
                  imageUrl={avatarImageUrl}
                  initials={avatarInitials}
                  colorEtiqueta={colorEtiqueta}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-body text-[0.58rem] uppercase tracking-[0.18em] text-ink-muted dark:text-white/55">
                  {trigger ? 'Dato cifrado' : 'Acceso auditado (RGPD)'}
                </p>
                <h2
                  id="pac-contact-sheet-title"
                  className="mt-1 break-words font-display text-[1.05rem] italic leading-tight tracking-[-0.02em] text-ink sm:text-[1.2rem] dark:text-white"
                >
                  {trigger ? trigger.title : 'Elegir dato'}
                </h2>
                <p className="mt-1 break-words font-body text-[0.72rem] text-ink-muted dark:text-white/50">
                  {patientLabel}
                </p>
                {trigger ? (
                  <div className="mt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      icon="arrow_back"
                      onClick={backToMenu}
                      className="px-0"
                    >
                      Cambiar tipo de dato
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={closeAll}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-ink/5 hover:text-ink dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white"
              aria-label="Cerrar"
            >
              <span className="material-symbols-outlined text-[1.2rem]" aria-hidden="true">
                close
              </span>
            </button>
          </header>

          {!trigger ? (
            <div className="px-4 py-3 sm:px-5 sm:py-4">
              <p className="mb-3 font-body text-[0.8rem] leading-relaxed text-ink-soft dark:text-white/60">
                Elige qué dato quieres descifrar. Cada apertura queda registrada.
              </p>
              <ul className="flex flex-col gap-2">
                {hasTelefono ? (
                  <li>
                    <button
                      type="button"
                      className={`${filaClase} bg-primary/6 text-primary ring-primary/20 hover:bg-primary/12 dark:bg-primary/20 dark:ring-primary/30 dark:hover:bg-primary/30`}
                      onClick={() =>
                        pushTrigger({
                          title: 'Teléfono',
                          steps: [{ label: 'Teléfono', campo: 'telefono' }],
                        })
                      }
                    >
                      <span className="inline-flex min-w-0 items-center gap-2">
                        <span className="material-symbols-outlined shrink-0 text-[1.1rem]" aria-hidden="true">
                          phone
                        </span>
                        <span className="truncate">Teléfono</span>
                      </span>
                    </button>
                  </li>
                ) : null}
                {hasEmail ? (
                  <li>
                    <button
                      type="button"
                      className={`${filaClase} bg-primary/6 text-primary ring-primary/20 hover:bg-primary/12 dark:bg-primary/20 dark:ring-primary/30 dark:hover:bg-primary/30`}
                      onClick={() =>
                        pushTrigger({
                          title: 'Email (ficha clínica)',
                          steps: [{ label: 'Email', campo: 'email' }],
                        })
                      }
                    >
                      <span className="inline-flex min-w-0 items-center gap-2">
                        <span className="material-symbols-outlined shrink-0 text-[1.1rem]" aria-hidden="true">
                          mail
                        </span>
                        <span className="truncate">Email</span>
                      </span>
                    </button>
                  </li>
                ) : null}
                {hasContactoEmergencia ? (
                  <li>
                    <button
                      type="button"
                      className={`${filaClase} bg-[#c89b5a]/12 text-[#6b4f20] ring-[#c89b5a]/25 hover:bg-[#c89b5a]/20 dark:text-[#e9c88a] dark:ring-[#c89b5a]/30 dark:hover:bg-[#c89b5a]/22`}
                      onClick={() =>
                        pushTrigger({
                          title: 'Contacto de emergencia',
                          steps: [
                            { label: 'Nombre', campo: 'contacto_emergencia_nombre' },
                            { label: 'Teléfono', campo: 'contacto_emergencia_telefono' },
                          ],
                        })
                      }
                    >
                      <span className="inline-flex min-w-0 items-center gap-2">
                        <span className="material-symbols-outlined shrink-0 text-[1.1rem]" aria-hidden="true">
                          emergency
                        </span>
                        <span className="truncate">Emergencia</span>
                      </span>
                    </button>
                  </li>
                ) : null}
                {showDatosDomicilio ? (
                  <li>
                    <button
                      type="button"
                      className={`${filaClase} bg-ink/6 text-ink ring-ink/10 hover:bg-ink/10 dark:bg-white/6 dark:ring-white/10 dark:hover:bg-white/8`}
                      onClick={() => {
                        const steps: { label: string; campo: CampoSensible }[] = [];
                        if (hasDni) steps.push({ label: 'DNI / NIE', campo: 'dni_nie' });
                        if (hasDireccion) steps.push({ label: 'Domicilio', campo: 'direccion' });
                        if (steps.length > 0) {
                          pushTrigger({
                            title: 'Identificación y domicilio',
                            steps,
                          });
                        }
                      }}
                    >
                      <span className="inline-flex min-w-0 items-center gap-2">
                        <span className="material-symbols-outlined shrink-0 text-[1.1rem]" aria-hidden="true">
                          assignment_ind
                        </span>
                        <span className="truncate">DNI y domicilio</span>
                      </span>
                    </button>
                  </li>
                ) : null}
              </ul>
            </div>
          ) : trigger ? (
            <div className="overflow-y-auto px-4 py-3 sm:px-5 sm:py-4">
              {ui === null || ui.loading ? (
                <p className="font-body text-[0.85rem] text-ink-muted dark:text-white/55">
                  Descifrando…
                </p>
              ) : ui.error ? (
                <p className="font-body text-[0.85rem] text-red-700 dark:text-red-300" role="alert">
                  {ui.error}
                </p>
              ) : (
                <dl className="grid gap-3">
                  {ui.lines.map((row) => (
                    <div key={row.label}>
                      <dt className="font-body text-[0.62rem] uppercase tracking-[0.12em] text-ink-muted dark:text-white/50">
                        {row.label}
                      </dt>
                      <dd className="mt-1 break-words font-body text-[0.88rem] text-ink dark:text-white">
                        {row.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          ) : null}

          <footer className="mt-auto border-t border-ink/8 px-4 py-3 sm:px-5 dark:border-white/10">
            <Button type="button" variant="ghost" onClick={closeAll} className="w-full sm:w-auto">
              Cerrar
            </Button>
          </footer>
        </div>
      </dialog>
    </>
  );
}
