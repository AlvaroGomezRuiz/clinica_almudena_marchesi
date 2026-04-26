'use client';

/**
 * MobileNavDrawer — pantalla completa (<md) alineada con PublicMobileDrawer:
 * overlay blur + panel centrado, mismas densidades de nav, Link de Next.js.
 */

import { useEffect, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import ThemeToggle from '@/components/layout/ThemeToggle';
import { cn } from '@/lib/utils';
import { logoutAction } from '@/services/auth/actions';

const GLASS_OVERLAY: CSSProperties = {
  backdropFilter: 'blur(40px) saturate(180%)',
  WebkitBackdropFilter: 'blur(40px) saturate(180%)',
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
  /** Suma no leídos (mismo número que el badge de Mensajes). */
  mensajesUnread?: number;
  footerItems?: NavItem[];
  panelClassName: string;
  buttonClassName?: string;
};

function UnreadBadge({ count }: { count: number }) {
  const label = count > 99 ? '99+' : String(count);
  return (
    <span
      className="absolute -right-1 -top-1 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-[#c94c4c] px-0.5 font-body text-[0.62rem] font-semibold leading-none text-white shadow-sm ring-2 ring-canvas dark:ring-[#111]"
      aria-label={`${count} mensajes sin leer`}
    >
      {label}
    </span>
  );
}

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

  const navBase =
    'text-ink hover:bg-ink/[0.03] dark:text-white/85 dark:hover:bg-white/[0.06]';
  const navCurrent =
    'bg-sage/8 text-sage dark:bg-white/10 dark:text-white ring-1 ring-inset ring-sage/15 dark:ring-white/10';

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
          className="text-ink dark:text-white"
          aria-hidden="true"
        >
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="17" x2="20" y2="17" />
        </svg>
        {mensajesUnread > 0 ? <UnreadBadge count={mensajesUnread} /> : null}
      </button>

      <div
        className={cn(
          'fixed inset-0 z-[200] md:hidden transition-opacity duration-300',
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
        aria-hidden={!open}
      >
        <div
          className="absolute inset-0 cursor-default bg-canvas/95 transition-colors duration-500 dark:bg-[#111111]/95"
          style={GLASS_OVERLAY}
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />

        <div
          className={cn(
            'relative z-[70] mx-auto flex h-full max-h-[100dvh] w-full max-w-sm flex-col px-3 py-2 sm:px-4 sm:py-2.5',
            panelClassName,
          )}
          role="dialog"
          aria-modal="true"
          aria-label="Menú de navegación"
        >
          <div className="relative flex shrink-0 items-center justify-center py-0.5">
            <div className="flex min-w-0 flex-col items-center px-8 text-center">
              <p className="font-display text-[1rem] font-medium leading-tight tracking-normal text-ink dark:text-white sm:text-[1.05rem]">
                {brandTitle}
              </p>
              {brandSubtitle ? (
                <p className="mt-0.5 font-mono text-[0.55rem] uppercase leading-snug tracking-[0.1em] text-ink-muted dark:text-white/55">
                  {brandSubtitle}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              className="absolute right-0 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/5 dark:bg-white/10"
              style={{
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
              }}
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
                className="text-ink dark:text-white"
                aria-hidden="true"
              >
                <line x1="3" y1="3" x2="15" y2="15" />
                <line x1="15" y1="3" x2="3" y2="15" />
              </svg>
            </button>
          </div>

          <nav
            className="mx-auto flex min-h-0 w-full min-w-0 max-w-sm flex-1 flex-col justify-start gap-0.5 overflow-y-auto overflow-x-hidden pt-1.5 pr-0.5 pb-1 [scrollbar-gutter:stable]"
            aria-label="Navegación principal"
          >
            {navItems.map((item) => {
              const hasRowBadge = typeof item.badge === 'number' && item.badge > 0;
              const badgeN = hasRowBadge && item.badge !== undefined ? item.badge : 0;
              const current = isNavActive(pathname, item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={current ? 'page' : undefined}
                  className={cn(
                    'flex min-h-10 w-full flex-row items-center justify-start gap-2.5 rounded-apple px-2.5 py-1.5 text-left transition-colors active:opacity-80',
                    'dark:hover:bg-white/[0.04]',
                    current
                      ? navCurrent
                      : navBase,
                  )}
                >
                  <span
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-ink/[0.04] text-ink/80 dark:bg-white/[0.08] dark:text-white/70"
                    aria-hidden="true"
                  >
                    <span
                      className="material-symbols-outlined text-[1.1rem] text-current"
                      data-icon={item.icon}
                    >
                      {item.icon}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1 font-display text-[0.95rem] font-light leading-tight tracking-normal sm:text-[1.02rem]">
                    {item.label}
                  </span>
                  {hasRowBadge ? (
                    <span
                      className="shrink-0 rounded-full bg-[#c94c4c] px-1.5 py-0.5 font-body text-[0.6rem] font-semibold text-white tabular-nums"
                      aria-label={badgeN > 99 ? 'Más de 99' : `${badgeN} sin leer`}
                    >
                      {badgeN > 99 ? '99+' : String(badgeN)}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div className="shrink-0 space-y-1.5 border-t border-ink/5 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 dark:border-white/8">
            <div className="px-0.5">
              <p className="pb-1 text-center font-body text-[0.55rem] uppercase tracking-[0.16em] text-ink-muted dark:text-white/50">
                Tema
              </p>
              <ThemeToggle variant="segmented" className="w-full justify-between" />
            </div>

            {footerItems && footerItems.length > 0
              ? footerItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex min-h-9 w-full flex-row items-center gap-2 rounded-apple px-2.5 py-1.5 text-left text-ink-muted transition-colors hover:bg-ink/[0.04] hover:text-ink dark:text-white/60 dark:hover:bg-white/[0.04] dark:hover:text-white"
                  >
                    <span
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-ink/[0.04] dark:bg-white/[0.06]"
                      aria-hidden="true"
                    >
                      <span className="material-symbols-outlined text-base text-current" data-icon={item.icon}>
                        {item.icon}
                      </span>
                    </span>
                    <span className="font-body text-xs">{item.label}</span>
                  </Link>
                ))
              : null}

            <form action={logoutAction} className="pt-0.5">
              <button
                type="submit"
                className="flex w-full min-h-9 items-center justify-start gap-2 rounded-apple px-2.5 py-1.5 text-left text-ink-muted transition-colors hover:bg-error/5 hover:text-error dark:text-white/55 dark:hover:bg-red-950/30 dark:hover:text-red-300"
              >
                <span
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-ink/[0.04] dark:bg-white/[0.06]"
                  aria-hidden="true"
                >
                  <span className="material-symbols-outlined text-base">logout</span>
                </span>
                <span className="font-body text-xs">Cerrar sesión</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
