'use client';

import { useEffect, useRef, useState } from 'react';

import { logoutAction } from '@/services/auth/actions';

type ProfileDropdownProps = {
  button: React.ReactNode;
};

export default function ProfileDropdown({ button }: ProfileDropdownProps) {
  const [open, setOpen] = useState(false);
  const [notificationsMuted, setNotificationsMuted] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

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
        className="inline-flex"
      >
        {button}
      </button>

      {open ? (
        <div
          className="absolute right-0 mt-3 w-64 rounded-2xl border border-stone-200/70 bg-white shadow-lg overflow-hidden"
          role="menu"
        >
          <button
            type="button"
            onClick={() => setNotificationsMuted((v) => !v)}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 text-sm text-stone-700 hover:bg-surface-container-lowest transition-colors"
            role="menuitem"
          >
            <span className="flex items-center gap-3">
              <span
                className="material-symbols-outlined text-xl"
                data-icon={
                  notificationsMuted ? 'notifications_off' : 'notifications'
                }
              >
                {notificationsMuted ? 'notifications_off' : 'notifications'}
              </span>
              <span className="font-medium">Notificaciones</span>
            </span>
            <span
              className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-full border ${
                notificationsMuted
                  ? 'bg-error-container text-on-error-container border-error/20'
                  : 'bg-surface-container-low text-stone-600 border-stone-200/70'
              }`}
            >
              {notificationsMuted ? 'Silenciadas' : 'Activas'}
            </span>
          </button>

          <div className="border-t border-stone-100" />

          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-stone-700 hover:bg-surface-container-lowest transition-colors"
              role="menuitem"
            >
              <span
                className="material-symbols-outlined text-xl"
                data-icon="logout"
              >
                logout
              </span>
              <span className="font-medium">Cerrar sesión</span>
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
