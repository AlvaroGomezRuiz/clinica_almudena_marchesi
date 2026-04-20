'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import LiquidGlass from '@/components/landing/LiquidGlass';
import ThemeToggle from '@/components/layout/ThemeToggle';

const NAV_ITEMS = [
  { href: '/enfoque', label: 'Enfoque' },
  { href: '/servicios', label: 'Servicios' },
  { href: '/sobre-mi', label: 'Sobre Mí' },
  { href: '/contacto', label: 'Contacto' },
] as const;

const MOBILE_NAV_ITEMS = [
  { href: '/', label: 'Inicio', icon: 'home' },
  ...NAV_ITEMS.map((item) => ({ ...item, icon: 'arrow_forward' })),
  { href: '/registro-paciente', label: 'Reservar Cita', icon: 'calendar_month' },
  { href: '/login', label: 'Portal del Paciente', icon: 'person' },
] as const;

export default function PublicHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isActive = (href: string) => pathname === href;

  return (
    <>
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-lg focus:bg-canvas focus:px-4 focus:py-2 focus:shadow-apple-md focus:text-sage"
        href="#main"
      >
        Saltar al contenido principal
      </a>

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
                    className={`relative font-body text-[0.85rem] font-medium px-3.5 py-2 rounded-pill transition-all duration-400 ease-apple ${
                      isActive(item.href)
                        ? 'text-sage bg-sage/8'
                        : 'text-ink-soft hover:text-ink hover:bg-ink/[0.03]'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>

              {/* Desktop: ThemeToggle + CTA Portal del Paciente */}
              <div className="hidden md:flex items-center gap-1 ml-2">
                <ThemeToggle />
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 bg-sage text-white text-[0.82rem] font-medium px-5 py-2 rounded-pill transition-all duration-400 ease-apple hover:-translate-y-px active:scale-[0.97]"
                  style={{ boxShadow: '0 2px 10px rgba(74,99,85,0.18)' }}
                >
                  Portal del Paciente
                </Link>
              </div>

              {/* Mobile: ThemeToggle + Hamburger */}
              <div className="md:hidden flex items-center ml-auto gap-1">
                <ThemeToggle />
                <button
                  type="button"
                  className="flex items-center justify-center w-12 h-12 rounded-full hover:bg-ink/[0.04] transition-colors"
                  onClick={() => setMobileOpen(true)}
                  aria-label="Abrir menú"
                >
                  <span className="material-symbols-outlined text-2xl text-ink">menu</span>
                </button>
              </div>
            </nav>
          </LiquidGlass>
        </div>
      </header>

      {/* Mobile Full-Screen Overlay — Native backdrop-blur (no SVG LiquidGlass) */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="fixed inset-0 z-[60] md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Native backdrop-blur overlay — performs well on all mobile devices */}
            <div
              className="absolute inset-0 bg-canvas/90 dark:bg-[#111111]/90 transition-colors duration-500"
              style={{
                backdropFilter: 'blur(40px) saturate(180%)',
                WebkitBackdropFilter: 'blur(40px) saturate(180%)',
              }}
              onClick={() => setMobileOpen(false)}
            />

            {/* Content */}
            <div className="relative z-[70] flex flex-col h-full px-8 py-6">
              {/* Header row: brand + close */}
              <div className="flex items-center justify-between">
                <Link
                  href="/"
                  className="flex flex-col leading-none flex-1 py-4 pr-12 -my-4 -ml-2 active:opacity-50 transition-opacity"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Ir a Inicio"
                >
                  <span className="font-display text-[1.05rem] text-ink font-medium">
                    Almudena Marchesi
                  </span>
                  <span className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-ink-muted">
                    Psicología Clínica
                  </span>
                </Link>

                <button
                  type="button"
                  className="flex items-center justify-center w-12 h-12 rounded-full bg-black/5 dark:bg-white/10 transition-all duration-300"
                  style={{
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                  }}
                  onClick={() => setMobileOpen(false)}
                  aria-label="Cerrar menú"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    className="text-ink"
                  >
                    <line x1="3" y1="3" x2="15" y2="15" />
                    <line x1="15" y1="3" x2="3" y2="15" />
                  </svg>
                </button>
              </div>

              {/* Links */}
              <nav className="flex-1 flex flex-col justify-center gap-2 -mt-12">
                {MOBILE_NAV_ITEMS.map((item, i) => (
                  <motion.div
                    key={item.href}
                    initial={reduceMotion ? undefined : { opacity: 0, y: 20 }}
                    animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 + i * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <Link
                      href={item.href}
                      className={`flex items-center gap-4 px-4 py-4 rounded-apple transition-colors ${
                        isActive(item.href)
                          ? 'bg-sage/8 text-sage'
                          : 'text-ink hover:bg-ink/[0.03]'
                      }`}
                      onClick={() => setMobileOpen(false)}
                    >
                      <span className="material-symbols-outlined text-xl opacity-40">{item.icon}</span>
                      <span className="font-display text-2xl font-light">{item.label}</span>
                    </Link>
                  </motion.div>
                ))}
              </nav>

              <div className="flex items-center justify-between pb-4">
                <p className="font-mono text-label-sm uppercase text-ink-muted">
                  Psicología Clínica — Moncloa, Madrid
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
