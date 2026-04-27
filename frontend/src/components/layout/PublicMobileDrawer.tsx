'use client';

/**
 * Drawer móvil del header público — layout editorial (ref. img. 16 oscuro):
 * cristal oscuro difuminado, tipografía display, enlaces centrados sin iconos.
 */
import Link from 'next/link';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

import {
  EDITORIAL_MOBILE_OVERLAY_CLASS,
  EDITORIAL_MOBILE_PANEL_CLASS,
  EditorialMobileNavLink,
} from '@/components/layout/EditorialMobileNav';

type NavItem = {
  href: string;
  label: string;
  icon?: string;
};

type PublicMobileDrawerProps = {
  open: boolean;
  onClose: () => void;
  items: readonly NavItem[];
  isActive: (href: string) => boolean;
};

export default function PublicMobileDrawer({
  open,
  onClose,
  items,
  isActive,
}: PublicMobileDrawerProps) {
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex min-h-0 flex-col md:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div
            className={EDITORIAL_MOBILE_OVERLAY_CLASS}
            style={{
              backdropFilter: 'blur(52px) saturate(165%)',
              WebkitBackdropFilter: 'blur(52px) saturate(165%)',
            }}
            onClick={onClose}
            aria-hidden="true"
          />

          <div className={`${EDITORIAL_MOBILE_PANEL_CLASS} min-h-0 flex-1 bg-canvas dark:bg-[#0a0908]`}>
            <div className="relative flex shrink-0 items-center justify-center border-b border-ink/10 py-2 dark:border-white/10">
              <Link
                href="/"
                className="flex min-w-0 flex-col items-center px-10 text-center leading-tight transition-opacity active:opacity-80"
                onClick={onClose}
                aria-label="Ir a Inicio"
              >
                <span className="font-display text-[clamp(1.12rem,4vw,1.35rem)] font-medium tracking-tight text-ink dark:text-white">
                  Almudena Marchesi
                </span>
                <span className="mt-1 font-body text-[clamp(0.58rem,2.2vw,0.68rem)] uppercase tracking-[0.18em] text-ink-soft dark:text-white/80">
                  Psicología clínica — Moncloa
                </span>
              </Link>

              <button
                type="button"
                className="absolute right-0 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-ink/[0.08] text-ink ring-1 ring-inset ring-ink/12 transition-colors hover:bg-ink/[0.12] dark:bg-white/10 dark:text-white dark:ring-white/15 dark:hover:bg-white/16"
                onClick={onClose}
                aria-label="Cerrar menú"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <line x1="3" y1="3" x2="15" y2="15" />
                  <line x1="15" y1="3" x2="3" y2="15" />
                </svg>
              </button>
            </div>

            <nav
              className="mx-auto flex min-h-0 w-full min-w-0 max-w-sm flex-1 flex-col justify-center gap-1 overflow-y-auto overflow-x-hidden px-0.5 py-4 [scrollbar-gutter:stable]"
              aria-label="Navegación móvil"
            >
              {items.map((item, i) => (
                <motion.div
                  key={item.href}
                  initial={reduceMotion ? undefined : { opacity: 0, y: 6 }}
                  animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                  transition={{ delay: 0.02 + i * 0.02, duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
                >
                  <EditorialMobileNavLink
                    href={item.href}
                    label={item.label}
                    active={isActive(item.href)}
                    onNavigate={onClose}
                  />
                </motion.div>
              ))}
            </nav>

            <div className="shrink-0 border-t border-ink/10 pt-2 pb-[max(0.35rem,env(safe-area-inset-bottom))] dark:border-white/10">
              <p className="px-0.5 text-center font-body text-[0.58rem] uppercase tracking-[0.14em] text-ink-muted dark:text-white/75">
                Moncloa, Madrid
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
