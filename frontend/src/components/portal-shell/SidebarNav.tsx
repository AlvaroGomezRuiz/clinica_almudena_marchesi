'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

import type { NavItem } from './types';

interface SidebarNavProps {
  readonly items: readonly NavItem[];
}

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  if (item.href === '/admin' && pathname === '/admin') return true;
  if (item.href === '/portal' && pathname === '/portal') return true;
  return pathname.startsWith(`${item.href}/`) || pathname === item.href;
}

export default function SidebarNav({ items }: SidebarNavProps) {
  const pathname = usePathname();

  const augmented = useMemo(
    () => items.map((item) => ({ ...item, active: isActive(pathname, item) })),
    [items, pathname]
  );

  return (
    <nav className="flex-1 space-y-0.5" aria-label="Navegación principal">
      {augmented.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? 'page' : undefined}
          className={
            item.active
              ? 'group relative flex items-center gap-3 rounded-2xl bg-white/75 dark:bg-white/[0.05] px-3.5 py-2.5 text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_10px_24px_-14px_rgba(75,100,95,0.28)] ring-1 ring-inset ring-white/40 backdrop-blur-sm transition-[transform,background-color,box-shadow] duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]'
              : 'group relative flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-ink-soft hover:text-ink hover:bg-white/45 dark:hover:bg-white/[0.035] transition-[transform,background-color,color] duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]'
          }
        >
          {/* Barra vertical de acento (ítem activo) */}
          {item.active ? (
            <span
              className="absolute left-0 top-1/2 h-6 w-[3px] -translate-x-[9px] -translate-y-1/2 rounded-full bg-primary shadow-[0_0_12px_rgba(75,100,95,0.45)]"
              aria-hidden="true"
            />
          ) : null}

          <span
            className={
              item.active
                ? 'grid h-8 w-8 flex-shrink-0 place-items-center rounded-xl bg-primary/10 ring-1 ring-inset ring-primary/15 transition-[background-color,transform] duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]'
                : 'grid h-8 w-8 flex-shrink-0 place-items-center rounded-xl bg-white/40 ring-1 ring-inset ring-white/40 group-hover:bg-white/70 transition-[background-color,transform] duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]'
            }
            aria-hidden="true"
          >
            <span
              className={
                item.active
                  ? 'material-symbols-outlined text-[1.1rem] text-primary'
                  : 'material-symbols-outlined text-[1.1rem] text-ink-soft group-hover:text-primary transition-colors'
              }
            >
              {item.icon}
            </span>
          </span>
          <span className="font-display text-[0.9rem] font-medium tracking-tight">
            {item.label}
          </span>
          {typeof item.badge === 'number' && item.badge > 0 ? (
            <span className="ml-auto rounded-full bg-[#c94c4c] px-2 py-0.5 font-body text-[0.68rem] font-semibold tabular-nums text-white ring-1 ring-inset ring-[#c94c4c]/40">
              {item.badge > 99 ? '99+' : item.badge}
            </span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}
