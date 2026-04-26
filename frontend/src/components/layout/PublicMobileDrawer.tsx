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
          className="fixed inset-0 z-[200] md:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div
            className={EDITORIAL_MOBILE_OVERLAY_CLASS}
            style={{
              backdropFilter: 'blur(44px) saturate(160%)',
              WebkitBackdropFilter: 'blur(44px) saturate(160%)',
            }}
            onClick={onClose}
            aria-hidden="true"
          />

          <div
            className={EDITORIAL_MOBILE_PANEL_CLASS}
            style={{
              backdropFilter: 'blur(28px)',
              WebkitBackdropFilter: 'blur(28px)',
            }}
          >
            <div className="relative flex shrink-0 items-center justify-center border-b border-white/10 py-2">
              <Link
                href="/"
                className="flex min-w-0 flex-col items-center px-10 text-center leading-tight active:opacity-80 transition-opacity"
                onClick={onClose}
                aria-label="Ir a Inicio"
              >
                <span className="font-display text-[1.05rem] font-medium tracking-tight text-white sm:text-[1.12rem]">
                  Almudena Marchesi
                </span>
                <span className="mt-1 font-body text-[0.55rem] uppercase tracking-[0.18em] text-white/55">
                  Psicología clínica — Moncloa
                </span>
              </Link>

              <button
                type="button"
                className="absolute right-0 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-inset ring-white/15 transition-colors hover:bg-white/16"
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

            <div className="shrink-0 border-t border-white/10 pt-2 pb-[max(0.35rem,env(safe-area-inset-bottom))]">
              <p className="px-0.5 text-center font-body text-[0.58rem] uppercase tracking-[0.14em] text-white/45">
                Moncloa, Madrid
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
