'use client';

/**
 * ProfileDropdown — menú del usuario situado en la topbar del PortalShell.
 *
 * Sustituye al dropdown mínimo anterior. Ofrece:
 *   - Cabecera con displayName + email (y fallback de iniciales)
 *   - ThemeToggle segmentado (claro / oscuro / sistema)
 *   - Toggle master de notificaciones (enlazado a /ajustes para detalle)
 *   - Enlace directo a Ajustes / Configuración (según rol)
 *   - Enlace a "Zona personal" sensible (baja / exportar datos)
 *   - Cerrar sesión (server action)
 *
 * SECURITY: ningún dato sensible se almacena aquí. El toggle notificaciones
 * es solo un shortcut visual: las preferencias reales se persisten en
 * /portal/ajustes o /admin/configuracion mediante server actions RLS-safe.
 */

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import ThemeToggle from '@/components/layout/ThemeToggle';
import { normalizeDisplayNameText } from '@/lib/profile-display-name';
import { logoutAction } from '@/services/auth/actions';

import type { ShellTone } from '@/components/portal-shell/types';

interface ProfileDropdownProps {
  readonly button: React.ReactNode;
  readonly tone?: ShellTone;
  readonly displayName?: string;
  readonly email?: string;
}

function initialsOf(name?: string): string {
  if (!name) return '··';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '··';
}

export default function ProfileDropdown({
  button,
  tone = 'patient',
  displayName,
  email,
}: ProfileDropdownProps) {
  const [open, setOpen] = useState(false);
  const [notificationsMuted, setNotificationsMuted] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const n = normalizeDisplayNameText(displayName);
  const nameLabel =
    n.length > 0
      ? n
      : displayName !== undefined && displayName.trim().length > 0
        ? displayName.trim()
        : 'Usuario';

  const settingsHref = tone === 'admin' ? '/admin/configuracion' : '/portal/ajustes';
  const privacyHref = `${settingsHref}#privacidad`;

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onPointerDown = (e: MouseEvent | PointerEvent) => {
      const el = rootRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setOpen(false);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Abrir menú de usuario"
        className="inline-flex rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:focus-visible:ring-offset-[#111]"
      >
        {button}
      </button>

      {open ? (
        <div
          className="absolute right-0 mt-3 w-[min(100vw-1.5rem,360px)] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-ink/[0.06] bg-[#FBF6EF]/78 shadow-[0_24px_60px_-24px_rgba(28,28,25,0.45)] ring-1 ring-inset ring-white/30 dark:border-white/10 dark:bg-[#141312]/78 dark:ring-white/5"
          style={{
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          }}
          role="menu"
        >
          {/* ── Cabecera identidad ── */}
          <div className="flex items-center gap-3 px-4 pt-4 pb-3">
            <span
              aria-hidden="true"
              className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-full bg-primary/12 ring-1 ring-inset ring-primary/20 font-display text-[0.92rem] italic text-primary dark:bg-primary/25 dark:text-white dark:ring-primary/35"
            >
              {initialsOf(nameLabel)}
            </span>
            <div className="min-w-0">
              <p className="font-display text-[0.95rem] text-ink leading-tight tracking-[-0.01em] truncate dark:text-white">
                {nameLabel}
              </p>
              {email ? (
                <p className="mt-0.5 font-body text-[0.72rem] text-ink-muted truncate dark:text-white/55">
                  {email}
                </p>
              ) : null}
              <p className="mt-1 font-body text-[0.62rem] uppercase tracking-[0.2em] text-ink-muted dark:text-white/45">
                {tone === 'admin' ? 'Administración' : 'Portal paciente'}
              </p>
            </div>
          </div>

          <span className="block h-px bg-ink/8 dark:bg-white/8" aria-hidden="true" />

          {/* ── Tema ── */}
          <div className="px-4 py-3">
            <p className="mb-2 font-body text-[0.62rem] uppercase tracking-[0.2em] text-ink-muted dark:text-white/55">
              Tema
            </p>
            <ThemeToggle variant="segmented" className="w-full justify-between" />
          </div>

          <span className="block h-px bg-ink/8 dark:bg-white/8" aria-hidden="true" />

          {/* ── Notificaciones (master toggle) ── */}
          <button
            type="button"
            onClick={() => setNotificationsMuted((v) => !v)}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 text-sm text-ink hover:bg-ink/5 transition-colors dark:text-white dark:hover:bg-white/5"
            role="menuitemcheckbox"
            aria-checked={!notificationsMuted}
          >
            <span className="flex items-center gap-3">
              <span
                className="grid h-8 w-8 place-items-center rounded-lg bg-ink/5 text-ink-soft dark:bg-white/8 dark:text-white/70"
                aria-hidden="true"
              >
                <span className="material-symbols-outlined text-[1.05rem]">
                  {notificationsMuted ? 'notifications_off' : 'notifications_active'}
                </span>
              </span>
              <span className="font-body text-[0.85rem] tracking-tight">Notificaciones</span>
            </span>
            <span
              className={`font-body text-[0.62rem] uppercase tracking-[0.18em] font-medium px-2 py-0.5 rounded-full ${
                notificationsMuted
                  ? 'bg-[#b2675e]/15 text-[#8c4d44] dark:bg-[#b2675e]/25 dark:text-[#f3b3aa]'
                  : 'bg-primary/12 text-primary dark:bg-primary/25 dark:text-white'
              }`}
            >
              {notificationsMuted ? 'Silenciadas' : 'Activas'}
            </span>
          </button>

          <span className="block h-px bg-ink/8 dark:bg-white/8" aria-hidden="true" />

          {/* ── Enlaces ── */}
          <Link
            href={settingsHref}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-sm text-ink hover:bg-ink/5 transition-colors dark:text-white dark:hover:bg-white/5"
            role="menuitem"
          >
            <span
              className="grid h-8 w-8 place-items-center rounded-lg bg-ink/5 text-ink-soft dark:bg-white/8 dark:text-white/70"
              aria-hidden="true"
            >
              <span className="material-symbols-outlined text-[1.05rem]">settings</span>
            </span>
            <span className="font-body text-[0.85rem] tracking-tight">Ajustes y perfil</span>
          </Link>

          <Link
            href={privacyHref}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-sm text-ink hover:bg-ink/5 transition-colors dark:text-white dark:hover:bg-white/5"
            role="menuitem"
          >
            <span
              className="grid h-8 w-8 place-items-center rounded-lg bg-ink/5 text-ink-soft dark:bg-white/8 dark:text-white/70"
              aria-hidden="true"
            >
              <span className="material-symbols-outlined text-[1.05rem]">shield_lock</span>
            </span>
            <span className="font-body text-[0.85rem] tracking-tight">Privacidad y datos</span>
          </Link>

          <span className="block h-px bg-ink/8 dark:bg-white/8" aria-hidden="true" />

          {/* ── Logout ── */}
          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#8c4d44] hover:bg-[#b2675e]/10 transition-colors dark:text-[#f3b3aa] dark:hover:bg-[#b2675e]/15"
              role="menuitem"
            >
              <span
                className="grid h-8 w-8 place-items-center rounded-lg bg-[#b2675e]/12 dark:bg-[#b2675e]/25"
                aria-hidden="true"
              >
                <span className="material-symbols-outlined text-[1.05rem]">logout</span>
              </span>
              <span className="font-body text-[0.85rem] tracking-tight font-medium">
                Cerrar sesión
              </span>
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
