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
            className="absolute inset-0 bg-canvas/90 dark:bg-[#111111]/90 transition-colors duration-500"
            style={{
              backdropFilter: 'blur(40px) saturate(180%)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            }}
            onClick={onClose}
          />

          <div className="relative z-[70] flex flex-col h-full px-8 py-6">
            <div className="relative flex items-center justify-center py-2">
              <Link
                href="/"
                className="flex flex-col items-center leading-none py-3 text-center active:opacity-50 transition-opacity"
                onClick={onClose}
                aria-label="Ir a Inicio"
              >
                <span className="font-display text-[1.05rem] text-ink font-medium tracking-normal">
                  Almudena Marchesi
                </span>
                <span className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-ink-muted">
                  Psicología Clínica
                </span>
              </Link>

              <button
                type="button"
                className="absolute right-0 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/5 dark:bg-white/10 transition-all duration-300"
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

            <nav className="flex-1 flex flex-col justify-center gap-2 -mt-12">
              {items.map((item, i) => (
                <motion.div
                  key={item.href}
                  initial={reduceMotion ? undefined : { opacity: 0, y: 20 }}
                  animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 + i * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Link
                    href={item.href}
                    className={`flex flex-col items-center gap-2 px-4 py-4 text-center rounded-apple transition-colors ${
                      isActive(item.href)
                        ? 'bg-sage/8 text-sage'
                        : 'text-ink hover:bg-ink/[0.03]'
                    }`}
                    onClick={onClose}
                  >
                    <span className="material-symbols-outlined text-2xl opacity-50">{item.icon}</span>
                    <span className="font-display text-2xl font-light tracking-normal">{item.label}</span>
                  </Link>
                </motion.div>
              ))}
            </nav>

            <div className="flex items-center justify-between pb-4">
              <p className="font-mono text-label-sm uppercase text-ink-muted">
                Psicología Clínica — Moncloa, Madrid
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
