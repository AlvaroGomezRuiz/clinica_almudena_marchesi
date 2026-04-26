'use client';

/**
 * Drawer móvil del header público.
 *
 * Se carga dinámicamente desde PublicHeader (ssr:false) para que
 * framer-motion NO entre en el bundle inicial del público.
 * Visual idéntico al anterior (mismas transiciones y textos).
 */
import Link from 'next/link';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

type NavItem = {
  href: string;
  label: string;
  icon: string;
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
          {/* Overlay con backdrop-blur nativo (buen rendimiento en móvil) */}
          <div
            className="absolute inset-0 bg-canvas/95 dark:bg-[#111111]/95 transition-colors duration-500"
            style={{
              backdropFilter: 'blur(40px) saturate(180%)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            }}
            onClick={onClose}
            aria-hidden="true"
          />

          <div className="relative z-[70] flex h-full max-h-[100dvh] flex-col px-3 py-2 sm:px-4 sm:py-2.5">
            <div className="relative flex shrink-0 items-center justify-center py-0.5">
              <Link
                href="/"
                className="flex min-w-0 flex-col items-center leading-tight py-1 text-center active:opacity-50 transition-opacity"
                onClick={onClose}
                aria-label="Ir a Inicio"
              >
                <span className="font-display text-[1rem] sm:text-[1.05rem] text-ink font-medium tracking-normal">
                  Almudena Marchesi
                </span>
                <span className="mt-0.5 font-mono text-[0.55rem] uppercase tracking-[0.1em] text-ink-muted">
                  Psicología clínica — Moncloa
                </span>
              </Link>

              <button
                type="button"
                className="absolute right-0 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/5 dark:bg-white/10 transition-all duration-300"
                style={{
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                }}
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
                  className="text-ink"
                >
                  <line x1="3" y1="3" x2="15" y2="15" />
                  <line x1="15" y1="3" x2="3" y2="15" />
                </svg>
              </button>
            </div>

            <nav
              className="mx-auto flex w-full max-w-sm min-h-0 flex-1 flex-col justify-start gap-0.5 overflow-y-auto overflow-x-hidden pt-1.5 pr-0.5 pb-1 [scrollbar-gutter:stable]"
              aria-label="Navegación móvil"
            >
              {items.map((item, i) => (
                <motion.div
                  key={item.href}
                  initial={reduceMotion ? undefined : { opacity: 0, y: 8 }}
                  animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                  transition={{ delay: 0.02 + i * 0.025, duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Link
                    href={item.href}
                    className={`flex min-h-10 w-full flex-row items-center justify-start gap-2.5 rounded-apple px-2.5 py-1.5 text-left transition-colors active:opacity-80 dark:hover:bg-white/[0.04] ${
                      isActive(item.href)
                        ? 'bg-sage/8 text-sage ring-1 ring-inset ring-sage/15'
                        : 'text-ink hover:bg-ink/[0.04]'
                    }`}
                    onClick={onClose}
                  >
                    <span
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-ink/[0.04] text-ink/70 dark:bg-white/[0.08] dark:text-white/60"
                      aria-hidden="true"
                    >
                      <span className="material-symbols-outlined text-[1.15rem] text-current">{item.icon}</span>
                    </span>
                    <span className="min-w-0 font-display text-[0.95rem] font-light leading-tight tracking-normal sm:text-[1.02rem]">
                      {item.label}
                    </span>
                  </Link>
                </motion.div>
              ))}
            </nav>

            <div className="shrink-0 border-t border-ink/5 pt-1.5 dark:border-white/8">
              <p className="px-0.5 text-center font-mono text-[0.6rem] uppercase leading-snug tracking-[0.08em] text-ink-muted sm:text-label-sm">
                Moncloa, Madrid
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
