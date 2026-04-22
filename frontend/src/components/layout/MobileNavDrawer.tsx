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
 * Dark mode:
 *   - Usamos tokens del design system (bg-canvas, text-ink, …) que ya tienen
 *     su resolución oscura. Donde es imposible (por ejemplo en el tone
 *     "primary" del admin), añadimos variantes `dark:` explícitas.
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
  /**
   * - `light`: portal paciente (fondo canvas claro, ink oscuro).
   * - `primary`: panel admin (fondo primary oscuro, texto sobre primary).
   */
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

  // Tokens de color dark-aware.
  // Para tone="light" usamos los tokens del design system (ink-*) que ya se
  // invierten en dark mode vía la clase `.dark` root.
  const brandTitleClass = isPrimaryTone
    ? 'text-on-primary'
    : 'text-ink dark:text-white';
  const brandSubtitleClass = isPrimaryTone
    ? 'text-on-primary/70'
    : 'text-ink-muted dark:text-white/55';
  const closeButtonClass = isPrimaryTone
    ? 'text-on-primary/80 hover:text-on-primary'
    : 'text-ink-soft hover:text-ink dark:text-white/60 dark:hover:text-white';
  const navLinkClass = isPrimaryTone
    ? 'text-on-primary/90 hover:text-on-primary hover:bg-on-primary/10'
    : 'text-ink-soft hover:text-ink hover:bg-ink/5 dark:text-white/80 dark:hover:text-white dark:hover:bg-white/10';
  const footerBorderClass = isPrimaryTone
    ? 'border-on-primary/15'
    : 'border-ink/10 dark:border-white/10';
  const footerLinkClass = isPrimaryTone
    ? 'text-on-primary/80 hover:text-on-primary'
    : 'text-ink-muted hover:text-ink dark:text-white/60 dark:hover:text-white';
  const logoutButtonClass = isPrimaryTone
    ? 'text-on-primary/80 hover:text-error-container'
    : 'text-ink-muted hover:text-error dark:text-white/60 dark:hover:text-red-400';
  const themeLabelClass = isPrimaryTone
    ? 'text-on-primary/70'
    : 'text-ink-muted dark:text-white/55';

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
          'md:hidden text-ink-soft hover:text-ink transition-colors dark:text-white/70 dark:hover:text-white'
        }
        onClick={() => setOpen(true)}
        aria-label="Abrir menú de navegación"
        aria-expanded={open}
      >
        <span className="material-symbols-outlined text-3xl" data-icon="menu" aria-hidden="true">
          menu
        </span>
      </button>

      <div
        className={`fixed inset-0 z-[60] md:hidden transition-opacity duration-300 ${
          open
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden={!open}
      >
        <button
          type="button"
          className="absolute inset-0 bg-black/40 backdrop-blur-sm dark:bg-black/60"
          onClick={() => setOpen(false)}
          aria-label="Cerrar menú"
          tabIndex={open ? 0 : -1}
        />

        <div
          className={`absolute left-0 top-0 h-[100dvh] w-80 max-w-[85vw] transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-y-auto shadow-2xl ${
            open ? 'translate-x-0' : '-translate-x-full'
          } ${panelClassName}`}
          role="dialog"
          aria-modal="true"
          aria-label="Menú de navegación"
        >
          {/* ── Cabecera ── */}
          <div className="flex items-start justify-between">
            <div>
              <p className={`font-display text-xl italic ${brandTitleClass}`}>
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
              className={`rounded-full p-1 transition-colors ${closeButtonClass}`}
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

          {/* ── Navegación principal ── */}
          <nav className="mt-8 space-y-1" aria-label="Navegación principal">
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
                  aria-hidden="true"
                >
                  {item.icon}
                </span>
                <span className="text-sm font-medium">{item.label}</span>
              </a>
            ))}
          </nav>

          {/* ── Footer: selector tema + enlaces secundarios + logout ── */}
          <div
            className={`mt-auto pt-6 border-t space-y-3 ${footerBorderClass}`}
          >
            {/* Selector de tema — en modo "primary" (admin) no incluimos
                porque el admin ya tiene su propio selector en la topbar
                desktop; en modo "light" (paciente) sí lo añadimos por la
                queja explícita "en móvil no se puede cambiar el color". */}
            {!isPrimaryTone ? (
              <div className="px-2 pb-3">
                <p
                  className={`px-2 pb-2 font-body text-[0.62rem] uppercase tracking-[0.18em] ${themeLabelClass}`}
                >
                  Tema
                </p>
                <ThemeToggle variant="segmented" className="w-full justify-between" />
              </div>
            ) : null}

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
