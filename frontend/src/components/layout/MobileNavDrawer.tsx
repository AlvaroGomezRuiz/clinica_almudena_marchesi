'use client';

/**
 * Menú móvil portal (admin / paciente) — misma estructura que `PublicMobileDrawer`:
 * `AnimatePresence` + `motion`, overlay difuminado y panel **opaco** para legibilidad.
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { usePathname } from 'next/navigation';

import {
  EDITORIAL_MOBILE_OVERLAY_CLASS,
  EDITORIAL_MOBILE_PANEL_CLASS,
  EditorialMobileNavLink,
} from '@/components/layout/EditorialMobileNav';
import ThemeToggle from '@/components/layout/ThemeToggle';
import { cn } from '@/lib/utils';
import { logoutAction } from '@/services/auth/actions';
import { useTheme } from 'next-themes';

type NavItem = {
  label: string;
  icon: string;
  href: string;
  badge?: number;
  exact?: boolean;
};

function isNavActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  if (item.href === '/admin' && pathname === '/admin') return true;
  if (item.href === '/portal' && pathname === '/portal') return true;
  return pathname.startsWith(`${item.href}/`) || pathname === item.href;
}

type MobileNavDrawerProps = {
  brandTitle: string;
  brandSubtitle?: string;
  navItems: NavItem[];
  mensajesUnread?: number;
  footerItems?: NavItem[];
  panelClassName: string;
  /** Si se omite o es cadena vacía, se usa el estilo por defecto (incluye `md:hidden`). */
  buttonClassName?: string;
};

export default function MobileNavDrawer({
  brandTitle,
  brandSubtitle,
  navItems,
  mensajesUnread = 0,
  footerItems,
  panelClassName,
  buttonClassName = '',
}: MobileNavDrawerProps) {
  const [open, setOpen] = useState(false);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const { resolvedTheme } = useTheme();
  const segmentedOnDark = resolvedTheme === 'dark';

  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const defaultBtn =
    'relative md:hidden grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink-soft ring-1 ring-inset ring-ink/10 transition-colors hover:bg-ink/[0.04] hover:text-ink dark:text-white/70 dark:ring-white/10 dark:hover:bg-white/10 dark:hover:text-white';

  const openMenuBtnClass =
    buttonClassName != null && buttonClassName.trim().length > 0 ? buttonClassName : defaultBtn;

  return (
    <>
      <button
        type="button"
        className={openMenuBtnClass}
        onClick={() => setOpen(true)}
        aria-label="Abrir menú de navegación"
        aria-expanded={open}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="17" x2="20" y2="17" />
        </svg>
        {mensajesUnread > 0 ? (
          <span
            className="absolute -right-0.5 -top-0.5 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-[#c94c4c] px-0.5 font-body text-[0.58rem] font-semibold leading-none text-white ring-2 ring-canvas dark:ring-[#0a0908]"
            aria-label={`${mensajesUnread} mensajes sin leer`}
          >
            {mensajesUnread > 99 ? '99+' : String(mensajesUnread)}
          </span>
        ) : null}
      </button>

      {portalTarget
        ? createPortal(
            <AnimatePresence>
              {open ? (
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
                    onClick={() => setOpen(false)}
                    aria-hidden="true"
                  />

                  <div
                    className={cn(
                      EDITORIAL_MOBILE_PANEL_CLASS,
                      'min-h-0 flex-1 bg-canvas dark:bg-[#0a0908]',
                      panelClassName,
                    )}
                  >
              <div className="relative flex shrink-0 items-center justify-center border-b border-ink/10 py-2 dark:border-white/10">
                <div className="flex min-w-0 flex-col items-center px-10 text-center leading-tight">
                  <span className="font-display text-[clamp(1.12rem,4vw,1.35rem)] font-medium tracking-tight text-ink dark:text-white">
                    {brandTitle}
                  </span>
                  {brandSubtitle ? (
                    <span className="mt-1 font-body text-[clamp(0.58rem,2.2vw,0.68rem)] uppercase tracking-[0.18em] text-ink-muted dark:text-white/80">
                      {brandSubtitle}
                    </span>
                  ) : null}
                </div>

                <button
                  type="button"
                  className="absolute right-0 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-ink/[0.08] text-ink ring-1 ring-inset ring-ink/12 transition-colors hover:bg-ink/[0.12] dark:bg-white/10 dark:text-white dark:ring-white/15 dark:hover:bg-white/16"
                  onClick={() => setOpen(false)}
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
                className="mx-auto flex min-h-0 w-full min-w-0 flex-1 flex-col justify-center gap-1 overflow-y-auto overflow-x-hidden px-0.5 py-4 [scrollbar-gutter:stable]"
                aria-label="Navegación principal"
              >
                {navItems.map((item, i) => {
                  const hasRowBadge = typeof item.badge === 'number' && item.badge > 0;
                  const badgeN = hasRowBadge && item.badge !== undefined ? item.badge : 0;
                  const current = isNavActive(pathname, item);
                  return (
                    <motion.div
                      key={item.href}
                      initial={reduceMotion ? undefined : { opacity: 0, y: 6 }}
                      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                      transition={{
                        delay: 0.02 + i * 0.02,
                        duration: 0.26,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                    >
                      <EditorialMobileNavLink
                        href={item.href}
                        label={item.label}
                        active={current}
                        badgeCount={hasRowBadge ? badgeN : undefined}
                        onNavigate={() => setOpen(false)}
                      />
                    </motion.div>
                  );
                })}
              </nav>

              <div className="shrink-0 space-y-2 border-t border-ink/10 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-3 dark:border-white/10">
                <div className="px-0.5">
                  <p className="pb-1 text-center font-body text-[0.52rem] uppercase tracking-[0.18em] text-ink-muted dark:text-white/85">
                    Tema
                  </p>
                  <ThemeToggle
                    variant="segmented"
                    segmentedGlyphs={false}
                    segmentedOnDark={segmentedOnDark}
                    className="w-full justify-between"
                  />
                </div>

                {footerItems && footerItems.length > 0
                  ? footerItems.map((item) => (
                      <EditorialMobileNavLink
                        key={item.href}
                        href={item.href}
                        label={item.label}
                        onNavigate={() => setOpen(false)}
                      />
                    ))
                  : null}

                <form action={logoutAction} className="pt-0.5">
                  <button
                    type="submit"
                    className="flex w-full min-h-10 items-center justify-center rounded-2xl px-4 py-2.5 text-center font-display text-[0.78rem] font-medium uppercase tracking-[0.12em] text-[#9a2f2f] transition-colors hover:bg-red-100 dark:text-white dark:hover:bg-white/10"
                  >
                    Cerrar sesión
                  </button>
                </form>

                <p className="px-0.5 pt-1 text-center font-body text-[0.58rem] uppercase tracking-[0.14em] text-ink-muted dark:text-white/75">
                  Moncloa, Madrid
                </p>
              </div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            portalTarget,
          )
        : null}
    </>
  );
}
