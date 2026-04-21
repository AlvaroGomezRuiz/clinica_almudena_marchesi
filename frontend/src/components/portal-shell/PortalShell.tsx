import Image from 'next/image';
import Link from 'next/link';

import MobileNavDrawer from '@/components/layout/MobileNavDrawer';
import ProfileDropdown from '@/components/layout/ProfileDropdown';
import ThemeToggle from '@/components/layout/ThemeToggle';
import { logoutAction } from '@/services/auth/actions';

import SidebarNav from './SidebarNav';
import type { ShellProps } from './types';

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
  footerSlot,
  children,
}: ShellProps) {
  const mobileNavItems = navItems.map((n) => ({
    label: n.label,
    href: n.href,
    icon: n.icon,
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
        className="portal-sidebar fixed left-0 top-0 z-40 hidden h-screen w-[280px] flex-col md:flex"
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
                className="h-7 w-7 rounded-xl bg-gradient-to-br from-primary to-primary-dim shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_6px_18px_-6px_rgba(75,100,95,0.55)] ring-1 ring-inset ring-white/30"
              />
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

          <SidebarNav items={navItems} />

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
      <header className="portal-topbar fixed left-0 right-0 top-0 z-30 md:left-[280px]">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 md:px-10">
          <div className="flex items-center gap-3 min-w-0">
            <MobileNavDrawer
              brandTitle={brandTitle}
              brandSubtitle={brandSubtitle}
              tone={tone === 'admin' ? 'primary' : 'light'}
              navItems={mobileNavItems}
              panelClassName="bg-canvas flex flex-col py-8 px-6 h-full"
              buttonClassName="md:hidden text-ink-soft hover:text-ink transition-colors"
            />
            <div className="md:hidden">
              <p className="font-display text-[1rem] italic text-primary leading-none dark:text-primary-fixed-dim">
                {brandTitle.split(' ')[0]}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <ThemeToggle variant="compact" className="hidden sm:inline-grid" />

            <div className="hidden text-right sm:block">
              <p className="font-display text-[0.85rem] font-medium text-ink leading-none dark:text-white">
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
        className="relative z-10 ml-0 md:ml-[280px] pt-[88px] pb-16 px-4 sm:px-6 md:px-10 min-h-screen"
      >
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
