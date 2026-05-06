import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class', // next-themes inyecta .dark en <html>
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],

  theme: {
    extend: {
      colors: {
        /* ── Urban Sanctuary Palette ── */
        canvas: {
          DEFAULT: 'var(--color-canvas, #F8F6F1)',
          alt: 'var(--color-canvas-alt, #EEEAE0)',
          sage: '#E8EFEA',
        },
        ink: {
          DEFAULT: 'var(--color-ink, #1C1C19)',
          soft: 'var(--color-ink-soft, #6B6960)',
          muted: 'var(--color-ink-muted, #A5A49C)',
        },
        sage: {
          DEFAULT: '#4A6355',
          mid: '#7A9B8A',
          light: '#C8D9CF',
          wash: '#EBF1ED',
        },
        warm: {
          DEFAULT: '#8B7355',
          light: '#E8DDD0',
        },
        line: 'var(--color-line, rgba(28,28,25,0.1))',

        /* ── Glass / Apple tokens ── */
        glass: {
          DEFAULT: 'rgba(248,246,241,0.72)',
          dark: 'rgba(28,28,25,0.65)',
          border: 'rgba(255,255,255,0.18)',
          'border-dark': 'rgba(255,255,255,0.08)',
        },

        /* ── Legacy compatibility (used by existing portal/dashboard pages) ── */
        error: '#a83836',
        'surface-tint': '#4b645f',
        'primary-fixed': '#cde8e2',
        'surface-container-low': '#f4f4ef',
        'on-secondary-fixed-variant': '#66594a',
        'inverse-primary': '#dbf7f0',
        'on-tertiary-fixed': '#224154',
        'outline-variant': '#b0b3ad',
        'surface-container-lowest': '#ffffff',
        'inverse-on-surface': '#9d9d9a',
        'on-secondary': '#fff8f3',
        'primary-container': '#cde8e2',
        'on-surface': '#30332f',
        'tertiary-dim': '#39566a',
        'secondary-fixed-dim': '#e3d2be',
        'on-error-container': '#6e0a12',
        'surface-container': '#eeeee9',
        'on-surface-variant': '#5d605b',
        'error-container': '#fa746f',
        'on-secondary-container': '#5c5041',
        tertiary: '#456377',
        surface: '#faf9f5',
        'surface-container-highest': '#e1e3dd',
        'secondary-dim': '#5d5142',
        outline: '#797b76',
        'on-secondary-fixed': '#493d2f',
        'on-background': '#30332f',
        primary: '#4b645f',
        'on-error': '#fff7f6',
        'on-tertiary-fixed-variant': '#405d71',
        'error-dim': '#67040d',
        'surface-dim': '#d9dbd4',
        'tertiary-fixed': '#c5e4fc',
        'on-primary-fixed': '#2c443f',
        'inverse-surface': '#0d0f0d',
        'tertiary-container': '#c5e4fc',
        secondary: '#6a5d4e',
        'on-primary-container': '#3e5652',
        'on-tertiary': '#f5f9ff',
        'secondary-fixed': '#f2e0cc',
        'on-tertiary-container': '#365367',
        'surface-bright': '#faf9f5',
        'surface-variant': '#e1e3dd',
        'primary-dim': '#405853',
        'secondary-container': '#f2e0cc',
        'tertiary-fixed-dim': '#b7d6ed',
        'primary-fixed-dim': '#bfdad4',
        'on-primary-fixed-variant': '#48605b',
        'surface-container-high': '#e8e9e3',
        background: 'var(--color-canvas)',
        'on-primary': '#e3fff8',
        
        /* shadcn variables mapped to urban sanctuary aesthetic */
        foreground: 'var(--color-ink)',
        popover: {
          DEFAULT: 'var(--color-canvas)',
          foreground: 'var(--color-ink)',
        },
        card: {
          DEFAULT: 'var(--color-canvas)',
          foreground: 'var(--color-ink)',
        },
        muted: {
          DEFAULT: 'var(--color-canvas-alt)',
          foreground: 'var(--color-ink-muted)',
        },
        accent: {
          DEFAULT: 'var(--color-glass-border)',
          foreground: 'var(--color-ink)',
        },
        border: 'var(--color-line)',
        input: 'var(--color-line)',
        ring: 'var(--color-spotlight)',
      },

      fontFamily: {
        display: ['var(--font-display)', '"Cormorant Garamond"', 'Georgia', 'serif'],
        body: ['var(--font-body)', 'Outfit', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', '"JetBrains Mono"', 'monospace'],
        /* Legacy compat */
        headline: ['var(--font-display)', '"Cormorant Garamond"', 'Georgia', 'serif'],
        label: ['var(--font-body)', 'Outfit', 'system-ui', 'sans-serif'],
        serif: ['var(--font-display)', '"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['var(--font-body)', 'Outfit', 'system-ui', 'sans-serif'],
      },

      fontSize: {
        'display-1': ['clamp(3rem, 7vw, 6.5rem)', { lineHeight: '1.05', letterSpacing: '-0.02em', fontWeight: '300' }],
        'display-2': ['clamp(2.2rem, 4.5vw, 4rem)', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '300' }],
        'display-3': ['clamp(1.6rem, 3vw, 2.5rem)', { lineHeight: '1.15', letterSpacing: '-0.01em', fontWeight: '400' }],
        'body-lg': ['clamp(1.05rem, 1.2vw, 1.25rem)', { lineHeight: '1.7', fontWeight: '300' }],
        'label-sm': ['0.75rem', { lineHeight: '1.4', letterSpacing: '0.08em', fontWeight: '500' }],
      },

      borderRadius: {
        sm: '6px',
        DEFAULT: '0.25rem',
        md: '14px',
        lg: '28px',
        xl: '0.75rem',
        pill: '999px',
        full: '9999px',
        apple: '22px',
      },

      boxShadow: {
        editorial: '0 20px 40px rgba(75, 100, 95, 0.08)',
        glass: '0 8px 32px rgba(28, 28, 25, 0.06)',
        'glass-lg': '0 20px 60px rgba(28, 28, 25, 0.08)',
        'card-hover': '0 24px 48px rgba(74, 99, 85, 0.1)',
        'apple-sm': '0 2px 10px rgba(28, 28, 25, 0.04)',
        'apple-md': '0 8px 30px rgba(28, 28, 25, 0.06)',
        'apple-lg': '0 20px 60px rgba(28, 28, 25, 0.1)',
        'inner-glass': 'inset 0 1px 0 rgba(255, 255, 255, 0.15)',
      },

      backdropBlur: {
        glass: '20px',
        'glass-heavy': '40px',
      },

      transitionTimingFunction: {
        'apple': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'apple-in': 'cubic-bezier(0.4, 0, 1, 1)',
        'apple-out': 'cubic-bezier(0, 0, 0.2, 1)',
      },

      transitionDuration: {
        400: '400ms',
        600: '600ms',
        800: '800ms',
        1000: '1000ms',
      },

      lineHeight: {
        editorial: '1.6',
      },

      letterSpacing: {
        couture: '0.02em',
      },

      keyframes: {
        'float': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.08)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        'modal-in': {
          '0%': { opacity: '0', transform: 'scale(0.92) translateY(12px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
      },

      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
export default config;
