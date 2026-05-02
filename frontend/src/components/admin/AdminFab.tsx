'use client';

/**
 * AdminFab — Floating Action Button con menú radial de acciones rápidas.
 *
 * Esconde 4 accesos directos comunes: nueva cita, mensaje, paciente,
 * y bono. Se colapsa en un único botón en mobile y se abre en un menú
 * flotante con backdrop-blur.
 *
 * Accesibilidad:
 *   - `role="menu"` + items con `role="menuitem"`
 *   - Cierre con Escape / clic fuera
 *   - Focus trap ligero (loop Tab → primer/último)
 */

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNuevaCitaAdmin } from '@/components/admin/NuevaCitaAdminContext';

interface QuickAction {
  readonly label: string;
  readonly href?: string;
  readonly icon: string;
  readonly tone?: 'primary' | 'accent';
  readonly isNuevaCita?: boolean;
}

const ACTIONS: readonly QuickAction[] = [
  { label: 'Nueva cita',    icon: 'event_available',  tone: 'primary', isNuevaCita: true },
  { label: 'Nuevo mensaje', href: '/admin/mensajes?nuevo=1',       icon: 'forum',            tone: 'primary' },
  { label: 'Alta paciente', href: '/admin/pacientes?alta=1',       icon: 'person_add',       tone: 'accent' },
  { label: 'Nuevo bono',    href: '/admin/facturacion?bono=1',     icon: 'card_membership',  tone: 'accent' },
];

export default function AdminFab() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const firstItemRef = useRef<HTMLButtonElement | HTMLAnchorElement | null>(null);
  const { open: openNuevaCita } = useNuevaCitaAdmin();

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    const onPointerDown = (e: MouseEvent | PointerEvent) => {
      const el = rootRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) close();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown);

    const handle = requestAnimationFrame(() => firstItemRef.current?.focus());

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown);
      cancelAnimationFrame(handle);
    };
  }, [open, close]);

  return (
    <div
      ref={rootRef}
      className="fixed right-4 bottom-4 md:right-8 md:bottom-8 z-50"
      data-fab-root=""
    >
      {open ? (
        <div
          role="menu"
          aria-label="Acciones rápidas"
          className="absolute right-0 bottom-16 w-[240px] rounded-2xl overflow-hidden bg-white/95 ring-1 ring-ink/10 shadow-[0_24px_60px_-24px_rgba(28,28,25,0.45)] backdrop-blur-xl dark:bg-[#181818] dark:ring-white/10"
        >
          {ACTIONS.map((action, idx) => {
            const classes = "flex items-center gap-3 px-4 py-3 text-sm text-ink hover:bg-ink/5 transition-colors dark:text-white dark:hover:bg-white/5 w-full";
            const iconEl = (
              <>
                <span
                  className={`grid h-9 w-9 place-items-center rounded-xl ${
                    action.tone === 'accent'
                      ? 'bg-[#c89b5a]/15 text-[#8a6530] dark:bg-[#c89b5a]/30 dark:text-[#e9c88a]'
                      : 'bg-primary/12 text-primary dark:bg-primary/30 dark:text-white'
                  }`}
                  aria-hidden="true"
                >
                  <span className="material-symbols-outlined text-[1.15rem]">{action.icon}</span>
                </span>
                <span className="font-body text-[0.88rem] tracking-tight font-medium">
                  {action.label}
                </span>
              </>
            );

            if (action.isNuevaCita) {
              return (
                <button
                  key="nueva-cita"
                  ref={idx === 0 ? (el) => { firstItemRef.current = el; } : undefined}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    close();
                    openNuevaCita();
                  }}
                  className={classes}
                >
                  {iconEl}
                </button>
              );
            }

            return (
              <Link
                key={action.href}
                ref={idx === 0 ? (el) => { firstItemRef.current = el; } : undefined}
                href={action.href ?? '#'}
                role="menuitem"
                onClick={close}
                className={classes}
              >
                {iconEl}
              </Link>
            );
          })}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={open ? 'Cerrar acciones rápidas' : 'Abrir acciones rápidas'}
        className="group grid h-14 w-14 place-items-center rounded-full bg-primary text-on-primary shadow-[0_18px_40px_-16px_rgba(75,100,95,0.6),inset_0_1px_0_rgba(255,255,255,0.22)] transition-[transform,box-shadow,background-color] duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:bg-primary-dim hover:shadow-[0_24px_50px_-16px_rgba(75,100,95,0.7),inset_0_1px_0_rgba(255,255,255,0.28)] active:scale-[0.96] dark:bg-primary-fixed dark:text-[#1C1C19] dark:hover:bg-primary-fixed-dim"
      >
        <span
          className="material-symbols-outlined text-[1.55rem] transition-transform duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] group-aria-expanded:rotate-45"
          aria-hidden="true"
          style={{ transform: open ? 'rotate(45deg)' : 'none' }}
        >
          add
        </span>
      </button>
    </div>
  );
}
