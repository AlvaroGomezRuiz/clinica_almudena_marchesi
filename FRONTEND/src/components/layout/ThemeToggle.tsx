'use client';

/**
 * ThemeToggle — Botón Sol/Luna para modo claro/oscuro
 *
 * Patrón ZERO FOUC:
 * - El estado `mounted` previene hydration mismatch:
 *   el servidor no sabe el tema del usuario → renderiza un
 *   placeholder de tamaño idéntico para evitar Layout Shift.
 * - `useTheme` de next-themes lee la clase `.dark` del <html>
 *   que fue fijada sin parpadeo por el ThemeProvider del layout.
 * - SVG icons inline → sin dependencia de fuente de iconos,
 *   cero bloqueo de render.
 */
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

function SunIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" />
      <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
      <line x1="2" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="22" y2="12" />
      <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" />
      <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Hydration guard: sólo renderizar el icono real en el cliente
  useEffect(() => setMounted(true), []);

  // Placeholder con las mismas dimensiones → evita Layout Shift (CLS = 0)
  if (!mounted) {
    return (
      <div
        className="w-9 h-9 rounded-full"
        aria-hidden="true"
      />
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="flex items-center justify-center w-9 h-9 rounded-full text-ink-soft hover:text-ink hover:bg-ink/[0.05] dark:text-ink-soft dark:hover:text-ink dark:hover:bg-white/[0.06] transition-colors duration-300 ease-apple"
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      title={isDark ? 'Modo claro' : 'Modo oscuro'}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
