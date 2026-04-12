'use client';

import { useEffect, useState } from 'react';

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
  tone?: 'light' | 'primary';
};

export default function MobileNavDrawer({
  brandTitle,
  brandSubtitle,
  navItems,
  footerItems,
  panelClassName,
  buttonClassName,
  tone = 'light',
}: MobileNavDrawerProps) {
  const [open, setOpen] = useState(false);

  const isPrimaryTone = tone === 'primary';

  const brandTitleClass = isPrimaryTone ? 'text-on-primary' : 'text-stone-700';
  const brandSubtitleClass = isPrimaryTone
    ? 'text-on-primary/70'
    : 'text-stone-400';
  const closeButtonClass = isPrimaryTone
    ? 'text-on-primary/80 hover:text-on-primary'
    : 'text-stone-500 hover:text-stone-900';
  const navLinkClass = isPrimaryTone
    ? 'text-on-primary/90 hover:text-on-primary hover:bg-on-primary/10'
    : 'text-stone-600 hover:text-stone-900 hover:bg-white/60';
  const footerBorderClass = isPrimaryTone
    ? 'border-outline-variant/15'
    : 'border-stone-200/20';
  const footerLinkClass = isPrimaryTone
    ? 'text-on-primary/80 hover:text-on-primary'
    : 'text-stone-500 hover:text-stone-900';
  const logoutButtonClass = isPrimaryTone
    ? 'text-on-primary/80 hover:text-error-container'
    : 'text-stone-500 hover:text-error';

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={
          buttonClassName ??
          'md:hidden text-stone-600 hover:text-stone-900 transition-colors'
        }
        onClick={() => setOpen(true)}
        aria-label="Abrir menú"
      >
        <span className="material-symbols-outlined text-3xl" data-icon="menu">
          menu
        </span>
      </button>

      <div
        className={`fixed inset-0 z-[60] md:hidden transition-opacity ${
          open
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden={!open}
      >
        <button
          type="button"
          className="absolute inset-0 bg-black/30"
          onClick={() => setOpen(false)}
          aria-label="Cerrar menú"
        />

        <div
          className={`absolute left-0 top-0 h-full w-80 max-w-[85vw] transform transition-transform duration-300 ${
            open ? 'translate-x-0' : '-translate-x-full'
          } ${panelClassName}`}
          role="dialog"
          aria-label="Menú de navegación"
        >
          <div className="flex items-start justify-between">
            <div>
              <p
                className={`font-serif text-xl font-semibold ${brandTitleClass}`}
              >
                {brandTitle}
              </p>
              {brandSubtitle ? (
                <p
                  className={`text-xs font-medium tracking-wide mt-1 ${brandSubtitleClass}`}
                >
                  {brandSubtitle}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              className={`transition-colors ${closeButtonClass}`}
              onClick={() => setOpen(false)}
              aria-label="Cerrar"
            >
              <span
                className="material-symbols-outlined text-3xl"
                data-icon="close"
              >
                close
              </span>
            </button>
          </div>

          <nav className="mt-8 space-y-2">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-4 px-4 py-3 rounded-lg transition-colors ${navLinkClass}`}
              >
                <span
                  className="material-symbols-outlined text-xl"
                  data-icon={item.icon}
                >
                  {item.icon}
                </span>
                <span className="text-sm font-medium">{item.label}</span>
              </a>
            ))}
          </nav>

          <div
            className={`mt-auto pt-6 border-t space-y-2 ${footerBorderClass}`}
          >
            {footerItems?.length
              ? footerItems.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2 text-xs transition-colors ${footerLinkClass}`}
                  >
                    <span
                      className="material-symbols-outlined text-sm"
                      data-icon={item.icon}
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
                className={`flex items-center gap-3 px-4 py-2 text-xs transition-colors w-full ${logoutButtonClass}`}
              >
                <span
                  className="material-symbols-outlined text-sm"
                  data-icon="logout"
                >
                  logout
                </span>
                <span>Cerrar Sesión</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
