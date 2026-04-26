'use client';

/**
 * MobileNavDrawer — misma línea visual que PublicMobileDrawer (prot. img. 16 oscuro):
 * cristal oscuro, tipografía display, sin iconos en enlaces; tema segmentado sin glifos.
 */

import { useEffect, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  EDITORIAL_MOBILE_OVERLAY_CLASS,
  EDITORIAL_MOBILE_PANEL_CLASS,
  EditorialMobileNavLink,
} from '@/components/layout/EditorialMobileNav';
import ThemeToggle from '@/components/layout/ThemeToggle';
import { cn } from '@/lib/utils';
import { logoutAction } from '@/services/auth/actions';

const GLASS_OVERLAY: CSSProperties = {
  backdropFilter: 'blur(44px) saturate(160%)',
  WebkitBackdropFilter: 'blur(44px) saturate(160%)',
};

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
  buttonClassName?: string;
};

export default function MobileNavDrawer({
  brandTitle,
  brandSubtitle,
  navItems,
  mensajesUnread = 0,
  footerItems,
  panelClassName,
  buttonClassName,
}: MobileNavDrawerProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

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

  return (
    <>
      <button
        type="button"
        className={buttonClassName ?? defaultBtn}
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
            className="absolute -right-0.5 -top-0.5 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-[#c94c4c] px-0.5 font-body text-[0.58rem] font-semibold leading-none text-white ring-2 ring-[#0a0908]"
            aria-label={`${mensajesUnread} mensajes sin leer`}
          >
            {mensajesUnread > 99 ? '99+' : String(mensajesUnread)}
          </span>
        ) : null}
      </button>

      <div
        className={cn(
          'fixed inset-0 z-[200] md:hidden transition-opacity duration-300',
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
        aria-hidden={!open}
      >
        <div
          className={EDITORIAL_MOBILE_OVERLAY_CLASS}
          style={GLASS_OVERLAY}
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />

        <div
          className={cn(
            EDITORIAL_MOBILE_PANEL_CLASS,
            'backdrop-blur-xl',
            panelClassName,
          )}
          role="dialog"
          aria-modal="true"
          aria-label="Menú de navegación"
        >
          <div className="relative flex shrink-0 items-center justify-center border-b border-white/10 py-2">
            <div className="flex min-w-0 flex-col items-center px-10 text-center">
              <p className="font-display text-[1.02rem] font-medium leading-tight tracking-tight text-white sm:text-[1.08rem]">
                {brandTitle}
              </p>
              {brandSubtitle ? (
                <p className="mt-1 font-body text-[0.55rem] uppercase tracking-[0.16em] text-white/55">
                  {brandSubtitle}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              className="absolute right-0 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-inset ring-white/15 hover:bg-white/16"
              onClick={() => setOpen(false)}
              aria-label="Cerrar"
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
            className="mx-auto flex min-h-0 w-full min-w-0 max-w-sm flex-1 flex-col justify-center gap-1 overflow-y-auto overflow-x-hidden px-0.5 py-3 [scrollbar-gutter:stable]"
            aria-label="Navegación principal"
          >
            {navItems.map((item) => {
              const hasRowBadge = typeof item.badge === 'number' && item.badge > 0;
              const badgeN = hasRowBadge && item.badge !== undefined ? item.badge : 0;
              const current = isNavActive(pathname, item);
              return (
                <EditorialMobileNavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  active={current}
                  badgeCount={hasRowBadge ? badgeN : undefined}
                  onNavigate={() => setOpen(false)}
                />
              );
            })}
          </nav>

          <div className="shrink-0 space-y-2 border-t border-white/10 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-3">
            <div className="px-0.5">
              <p className="pb-1 text-center font-body text-[0.52rem] uppercase tracking-[0.18em] text-white/45">
                Tema
              </p>
              <ThemeToggle
                variant="segmented"
                segmentedGlyphs={false}
                segmentedOnDark
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
                className="flex w-full min-h-10 items-center justify-center rounded-2xl px-4 py-2.5 text-center font-display text-[0.78rem] font-medium uppercase tracking-[0.12em] text-red-200/95 transition-colors hover:bg-red-950/35"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
