'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import LiquidGlass from '@/components/landing/LiquidGlass';
import ThemeToggle from '@/components/layout/ThemeToggle';

/* Drawer móvil cargado sólo cuando el usuario toca el hamburger.
   ssr:false → framer-motion queda fuera del bundle inicial. */
const PublicMobileDrawer = dynamic(
  () => import('@/components/layout/PublicMobileDrawer'),
  { ssr: false },
);

const NAV_ITEMS = [
  { href: '/enfoque', label: 'Enfoque' },
  { href: '/servicios', label: 'Servicios' },
  { href: '/sobre-mi', label: 'Sobre Mí' },
  { href: '/contacto', label: 'Contacto' },
] as const;

const MOBILE_NAV_ITEMS = [
  { href: '/', label: 'Inicio', icon: 'home' },
  { href: '/enfoque', label: 'Enfoque', icon: 'psychology' },
  { href: '/servicios', label: 'Servicios', icon: 'medical_services' },
  { href: '/sobre-mi', label: 'Sobre Mí', icon: 'person' },
  { href: '/contacto', label: 'Contacto', icon: 'mail' },
] as const;

export default function PublicHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  /* Mantenemos el drawer en el árbol después de haberlo abierto una vez
     para que las animaciones de salida corran. */
  const [drawerMounted, setDrawerMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setScrolled(window.scrollY > 40);
        ticking = false;
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isActive = (href: string) => pathname === href;

  const openMobile = () => {
    setDrawerMounted(true);
    setMobileOpen(true);
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
        <div className="flex justify-center pt-4 px-4 md:px-8">
          {/* Apple Liquid Glass Nav Pill */}
          <LiquidGlass
            radius={999}
            scale={scrolled ? 140 : 100}
            dispersion={scrolled ? 35 : 20}
            frost={scrolled ? 0.15 : 0.08}
            lightness={60}
            alpha={0.85}
            displace={0.3}
            blur={4}
            border={0.04}
            borderColor="rgba(255, 255, 255, 0.5)"
            className="pointer-events-auto"
            style={{
              transition: 'all 600ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <nav
              aria-label="Navegación principal"
              className="flex items-center gap-2 px-3 py-2 md:px-5 md:py-2.5"
            >
              {/* Brand */}
              <Link href="/" className="flex items-center gap-2.5 min-w-0 px-2 py-1 -ml-2 active:opacity-50 hover:opacity-70 transition-opacity">
                <div className="flex flex-col leading-none min-w-0">
                  <span className="font-display text-[1rem] md:text-[1.05rem] text-ink font-medium truncate">
                    Almudena Marchesi
                  </span>
                  <span className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-ink-muted truncate">
                    Psicología Clínica
                  </span>
                </div>
              </Link>

              {/* Desktop Links */}
              <div className="hidden md:flex items-center gap-1 ml-3">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                    className={`relative min-h-11 items-center font-body text-[0.85rem] font-medium inline-flex px-3.5 py-2.5 rounded-pill transition-all duration-400 ease-apple ${
                      isActive(item.href)
                        ? 'text-sage bg-sage/8'
                        : 'text-ink-soft hover:text-ink hover:bg-ink/[0.03]'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>

              {/* Desktop: ThemeToggle */}
              <div className="hidden md:flex items-center gap-1 ml-2">
                <ThemeToggle />
              </div>

              {/* Mobile: ThemeToggle + Hamburger (SVG inline, sin material-symbols) */}
              <div className="md:hidden flex items-center ml-auto gap-1">
                <ThemeToggle />
                <button
                  type="button"
                  className="flex items-center justify-center w-12 h-12 rounded-full hover:bg-ink/[0.04] transition-colors"
                  onClick={openMobile}
                  aria-label="Abrir menú"
                >
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    className="text-ink"
                    aria-hidden="true"
                  >
                    <line x1="4" y1="7" x2="20" y2="7" />
                    <line x1="4" y1="12" x2="20" y2="12" />
                    <line x1="4" y1="17" x2="20" y2="17" />
                  </svg>
                </button>
              </div>
            </nav>
          </LiquidGlass>
        </div>
      </header>

      {/* Drawer móvil: solo se monta tras primer clic. */}
      {drawerMounted && (
        <PublicMobileDrawer
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          items={MOBILE_NAV_ITEMS}
          isActive={isActive}
        />
      )}
    </>
  );
}
