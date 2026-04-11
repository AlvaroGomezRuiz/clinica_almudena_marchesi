'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavLink = {
  href: string;
  label: string;
};

const LINKS: NavLink[] = [
  { href: '/enfoque', label: 'Enfoque' },
  { href: '/servicios', label: 'Servicios' },
  { href: '/sobre-mi', label: 'Sobre Mí' },
  { href: '/contacto', label: 'Contacto' },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function PublicHeader() {
  const pathname = usePathname() ?? '';

  return (
    <nav className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-xl">
      <div className="flex justify-between items-center px-6 md:px-12 py-6 max-w-screen-2xl mx-auto">
        <Link
          className="text-xl font-headline tracking-widest uppercase text-primary"
          href="/"
        >
          Almudena Marchesi
        </Link>

        <div className="hidden md:flex gap-10 items-center">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              className={
                isActive(pathname, l.href)
                  ? 'header-link active'
                  : 'header-link'
              }
              href={l.href}
            >
              {l.label}
            </Link>
          ))}
          <Link
            className="bg-primary text-on-primary px-6 py-2 rounded-full font-label text-sm uppercase tracking-wider hover:bg-primary-dim transition-all"
            href="/login"
          >
            Portal del Paciente
          </Link>
        </div>

        <div className="md:hidden">
          <span className="material-symbols-outlined text-primary text-3xl">
            menu
          </span>
        </div>
      </div>
    </nav>
  );
}
