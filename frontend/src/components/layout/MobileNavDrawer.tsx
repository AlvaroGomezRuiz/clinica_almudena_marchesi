'use client';

/**
 * MobileNavDrawer — cajón lateral de navegación para tablet/móvil (<md).
 *
 * Responsabilidades:
 *   1. Botón hamburguesa + backdrop + panel deslizante.
 *   2. Lista de navegación principal + pie opcional (ajustes, ayuda).
 *   3. Selector de tema (claro / oscuro / sistema) dentro del cajón.
 *   4. Botón de cerrar sesión.
 *
 * Accesibilidad:
 *   - Escape cierra.
 *   - Body scroll bloqueado mientras está abierto.
 *   - aria-label en botón de apertura, role="dialog" en panel.
 *
 * Dark mode: tokens canvas/ink (mismo criterio que la landing: panel
 * difuminado, sin bloque verde sólido en admin).
 */

import { useEffect, useState } from 'react';

import ThemeToggle from '@/components/layout/ThemeToggle';
import { logoutAction } from '@/services/auth/actions';

type NavItem = {
  label: string;
  icon: string;
  href: string;
};

type MobileNavDrawerProps = {
  brandTitle: string;
  brandSubtitle?: string;
  navItems: NavItem[];
  footerItems?: NavItem[];
  panelClassName: string;
  buttonClassName?: string;
};

export default function MobileNavDrawer({
  brandTitle,
  brandSubtitle,
  navItems,
  footerItems,
  panelClassName,
  buttonClassName,
}: MobileNavDrawerProps) {
  const [open, setOpen] = useState(false);

  const panelShellClass =
    'bg-canvas/95 shadow-2xl backdrop-blur-[40px] backdrop-saturate-150 ring-1 ring-inset ring-ink/10 dark:bg-[#111111]/92 dark:ring-white/10';

  const brandTitleClass = 'text-ink dark:text-white';
  const brandSubtitleClass = 'text-ink-muted dark:text-white/55';
  const closeButtonClass =
    'text-ink-soft hover:text-ink dark:text-white/60 dark:hover:text-white';
  const navLinkClass =
    'text-ink-soft hover:text-ink hover:bg-ink/5 dark:text-white/80 dark:hover:text-white dark:hover:bg-white/10';
  const footerBorderClass = 'border-ink/10 dark:border-white/10';
  const footerLinkClass =
    'text-ink-muted hover:text-ink dark:text-white/60 dark:hover:text-white';
  const logoutButtonClass =
    'text-ink-muted hover:text-error dark:text-white/60 dark:hover:text-red-400';
  const themeLabelClass = 'text-ink-muted dark:text-white/55';

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    // Bloquear scroll del body mientras el drawer está abierto
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={
          buttonClassName ??
          'md:hidden grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink-soft ring-1 ring-inset ring-ink/10 transition-colors hover:bg-ink/[0.04] hover:text-ink dark:text-white/70 dark:ring-white/10 dark:hover:bg-white/10 dark:hover:text-white'
        }
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
      </button>

      <div
        className={`fixed inset-0 z-[200] md:hidden transition-opacity duration-300 ${
          open
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden={!open}
      >
        <button
          type="button"
          className="absolute inset-0 bg-ink/30 backdrop-blur-xl backdrop-saturate-150 dark:bg-black/55 dark:backdrop-saturate-100"
          onClick={() => setOpen(false)}
          aria-label="Cerrar menú"
          tabIndex={open ? 0 : -1}
        />

        <div
          className={`absolute left-0 top-0 flex h-[100dvh] w-[min(22rem,88vw)] flex-col transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${panelShellClass} ${
            open ? 'translate-x-0' : '-translate-x-full'
          } ${panelClassName}`}
          role="dialog"
          aria-modal="true"
          aria-label="Menú de navegación"
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain px-6 pb-4 pt-8">
            {/* ── Cabecera ── */}
            <div className="flex shrink-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={`font-display text-xl italic ${brandTitleClass}`}>
                  {brandTitle}
                </p>
                {brandSubtitle ? (
                  <p
                    className={`mt-1 text-xs font-medium tracking-wide ${brandSubtitleClass}`}
                  >
                    {brandSubtitle}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                className={`shrink-0 rounded-full p-1 transition-colors ${closeButtonClass}`}
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
              >
                <span
                  className="material-symbols-outlined text-3xl"
                  data-icon="close"
                  aria-hidden="true"
                >
                  close
                </span>
              </button>
            </div>

            {/* ── Navegación principal (scroll interno; pie fijo fuera) ── */}
            <nav className="mt-8 flex-1 space-y-1 pb-4" aria-label="Navegación principal">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-4 rounded-lg px-4 py-3 transition-colors ${navLinkClass}`}
                >
                  <span
                    className="material-symbols-outlined text-xl"
                    data-icon={item.icon}
                    aria-hidden="true"
                  >
                    {item.icon}
                  </span>
                  <span className="text-sm font-medium">{item.label}</span>
                </a>
              ))}
            </nav>
          </div>

          {/* ── Footer fijo: tema + enlaces + logout (siempre visible) ── */}
          <div
            className={`shrink-0 space-y-3 border-t px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 ${footerBorderClass}`}
          >
            <div className="px-2 pb-3">
              <p
                className={`px-2 pb-2 font-body text-[0.62rem] uppercase tracking-[0.18em] ${themeLabelClass}`}
              >
                Tema
              </p>
              <ThemeToggle variant="segmented" className="w-full justify-between" />
            </div>

            {footerItems?.length
              ? footerItems.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2 text-xs rounded-lg transition-colors ${footerLinkClass}`}
                  >
                    <span
                      className="material-symbols-outlined text-sm"
                      data-icon={item.icon}
                      aria-hidden="true"
                    >
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </a>
                ))
              : null}

            <form action={logoutAction}>
              <button
                type="submit"
                className={`flex items-center gap-3 px-4 py-2 text-xs rounded-lg transition-colors w-full ${logoutButtonClass}`}
              >
                <span
                  className="material-symbols-outlined text-sm"
                  data-icon="logout"
                  aria-hidden="true"
                >
                  logout
                </span>
                <span>Cerrar sesión</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
