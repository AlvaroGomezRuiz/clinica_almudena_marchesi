'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import MobileNavDrawer from '@/components/layout/MobileNavDrawer';
import ProfileDropdown from '@/components/layout/ProfileDropdown';
import ThemeToggle from '@/components/layout/ThemeToggle';
import { logoutAction } from '@/services/auth/actions';

import SidebarNav from './SidebarNav';
import type { ShellProps } from './types';

const SIDEBAR_LS_KEY = 'portal_shell_sidebar_open_v1';

/**
 * Shell unificado para zonas privadas (admin + portal paciente).
 *
 * Diseño "Editorial Serenity":
 *   - Sidebar fija 280px con backdrop-blur (liquid glass sanctuary)
 *   - Topbar fija con glass pill central
 *   - Canvas warm (#faf9f5) con textura sutil
 *   - Tipografía serif para headlines, sans para navegación
 */
export default function PortalShell({
  user,
  tone,
  brandTitle,
  brandSubtitle,
  navItems,
  mensajesUnread = 0,
  footerSlot,
  children,
}: ShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SIDEBAR_LS_KEY);
      if (raw === '0') {
        setSidebarOpen(false);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SIDEBAR_LS_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const unread = mensajesUnread > 0 ? mensajesUnread : undefined;
  const navItemsWithBadge = navItems.map((n) =>
    n.href.includes('/mensajes') && unread
      ? { ...n, badge: unread }
      : n
  );

  const mobileNavItems = navItemsWithBadge.map((n) => ({
    label: n.label,
    href: n.href,
    icon: n.icon,
    badge: n.badge,
    exact: n.exact,
  }));

  return (
    <div className="relative min-h-screen bg-canvas text-ink overflow-x-hidden dark:text-white">
      {/* ── Ambient orbs (atmosphere, light + dark variants) ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 dark:hidden"
        style={{
          backgroundImage:
            'radial-gradient(60% 40% at 18% -5%, rgba(75,100,95,0.10), transparent 70%), radial-gradient(50% 35% at 95% 15%, rgba(200,155,90,0.08), transparent 75%), radial-gradient(55% 40% at 85% 110%, rgba(106,93,78,0.09), transparent 75%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 hidden dark:block"
        style={{
          backgroundImage:
            'radial-gradient(55% 40% at 18% -5%, rgba(75,100,95,0.22), transparent 70%), radial-gradient(45% 35% at 95% 15%, rgba(200,155,90,0.10), transparent 75%), radial-gradient(55% 40% at 85% 110%, rgba(106,93,78,0.14), transparent 75%)',
        }}
      />
      {/* ── Film-grain editorial overlay ── */}
      <div
        aria-hidden="true"
        className="portal-grain pointer-events-none fixed inset-0 z-[1] opacity-[0.045] mix-blend-multiply"
      />

      {/* ──────────── SIDEBAR (desktop) ──────────── */}
      <aside
        className={`portal-sidebar fixed left-0 top-0 z-40 h-screen w-[280px] flex-col ${
          sidebarOpen ? 'hidden md:flex' : 'hidden'
        }`}
      >
        <div className="flex h-full flex-col px-6 pt-9 pb-6">
          {/* Brand */}
          <Link
            href={tone === 'admin' ? '/admin' : '/portal'}
            className="mb-9 block group"
          >
            <span className="inline-flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="relative flex h-7 w-7 shrink-0 overflow-hidden rounded-xl bg-primary/15 shadow-[0_6px_18px_-6px_rgba(75,100,95,0.45)] ring-1 ring-inset ring-white/30 dark:bg-white/5 dark:ring-white/20"
              >
                <Image
                  src="/images/LOGO-SIN-BORDES.avif"
                  alt=""
                  width={56}
                  height={56}
                  className="h-full w-full object-contain object-center p-0.5"
                  sizes="28px"
                  priority
                />
              </span>
              <span>
                <span className="block font-display text-[1.05rem] leading-none italic text-primary group-hover:text-primary-dim transition-colors tracking-[-0.01em] dark:text-primary-fixed-dim dark:group-hover:text-white">
                  {brandTitle}
                </span>
                <span className="mt-1.5 block font-body text-[0.6rem] uppercase tracking-[0.22em] text-ink-muted dark:text-white/55">
                  {brandSubtitle}
                </span>
              </span>
            </span>
          </Link>

          <SidebarNav items={navItemsWithBadge} />

          {footerSlot ? <div className="mt-6 px-1">{footerSlot}</div> : null}

          <div className="mt-5 pt-4 px-1 relative">
            {/* Hairline gradient divider (en lugar de border-t plano) */}
            <span
              aria-hidden="true"
              className="absolute inset-x-1 top-0 h-px bg-gradient-to-r from-transparent via-ink/12 to-transparent dark:via-white/14"
            />
            <form action={logoutAction}>
              <button
                type="submit"
                className="group flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-ink-soft hover:bg-white/50 hover:text-ink transition-[background-color,color] duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] dark:text-white/70 dark:hover:bg-white/5 dark:hover:text-white"
              >
                <span
                  className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-xl bg-white/40 ring-1 ring-inset ring-white/40 group-hover:bg-white/70 transition-colors dark:bg-white/5 dark:ring-white/10 dark:group-hover:bg-white/10"
                  aria-hidden="true"
                >
                  <span className="material-symbols-outlined text-[1.05rem]">logout</span>
                </span>
                <span className="font-display text-[0.85rem] tracking-tight">Cerrar sesión</span>
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* ──────────── TOPBAR ──────────── */}
      <header
        className={`portal-topbar fixed left-0 right-0 top-0 z-[45] ${
          sidebarOpen ? 'md:left-[280px]' : 'md:left-0'
        }`}
      >
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 md:px-10">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button
              type="button"
              className="relative hidden h-11 w-11 shrink-0 place-items-center rounded-full text-ink-soft ring-1 ring-inset ring-ink/10 transition-colors hover:bg-ink/[0.04] hover:text-ink md:grid dark:text-white/70 dark:ring-white/10 dark:hover:bg-white/10 dark:hover:text-white"
              onClick={toggleSidebar}
              aria-expanded={sidebarOpen}
              aria-label={sidebarOpen ? 'Ocultar menú lateral' : 'Mostrar menú lateral'}
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
            </button>
            <MobileNavDrawer
              brandTitle={brandTitle}
              brandSubtitle={brandSubtitle}
              navItems={mobileNavItems}
              mensajesUnread={mensajesUnread}
              panelClassName=""
            />
            <div className="min-w-0 flex-1 md:hidden">
              <p className="truncate font-display text-[0.88rem] italic font-semibold uppercase leading-snug tracking-[0.06em] text-ink dark:text-white">
                {user.displayName}
              </p>
              <p className="mt-0.5 truncate font-body text-[0.62rem] uppercase tracking-[0.14em] text-ink-muted dark:text-white/55">
                {tone === 'admin' ? 'Panel de gestión' : brandSubtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* ThemeToggle siempre visible (también en móvil) para que el
                paciente pueda alternar claro/oscuro sin abrir el drawer. */}
            <ThemeToggle variant="compact" />

            <div className="hidden text-right sm:block">
              <p className="font-display text-[0.88rem] italic font-semibold uppercase leading-snug tracking-[0.06em] text-ink dark:text-white">
                {user.displayName}
              </p>
              <p className="mt-1 font-body text-[0.65rem] uppercase tracking-[0.18em] text-ink-muted dark:text-white/55">
                {tone === 'admin' ? 'Panel de gestión' : 'Tu portal'}
              </p>
            </div>

            <ProfileDropdown
              tone={tone}
              displayName={user.displayName}
              email={user.email}
              avatarUrl={user.avatarUrl}
              button={
                user.avatarUrl ? (
                  <span className="inline-block h-9 w-9 overflow-hidden rounded-full ring-1 ring-ink/10 hover:ring-ink/20 transition-all dark:ring-white/15 dark:hover:ring-white/30">
                    <Image
                      src={user.avatarUrl}
                      alt=""
                      width={36}
                      height={36}
                      className="h-full w-full object-cover"
                    />
                  </span>
                ) : (
                  <span
                    className="material-symbols-outlined text-[2.25rem] text-ink-muted hover:text-ink transition-colors dark:text-white/60 dark:hover:text-white"
                    aria-hidden="true"
                  >
                    account_circle
                  </span>
                )
              }
            />
          </div>
        </div>
      </header>

      {/* ──────────── MAIN ──────────── */}
      <main
        id="main"
        className={`relative z-10 ml-0 min-h-screen px-4 pb-[max(4rem,env(safe-area-inset-bottom,0px))] pt-[max(5.5rem,calc(5.5rem+env(safe-area-inset-top,0px)))] sm:px-6 md:px-10 ${
          sidebarOpen ? 'md:ml-[280px]' : 'md:ml-0'
        }`}
      >
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
