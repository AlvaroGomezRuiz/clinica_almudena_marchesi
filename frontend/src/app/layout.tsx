import './globals.css';

import type { Metadata, Viewport } from 'next';
import { CLINIC_PUBLIC_SITE_URL } from '@/lib/clinic';
import { ThemeProvider } from 'next-themes';
import localFont from 'next/font/local';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

/* ─────────────────────────────────────────────────────────────
   FUENTES — 100 % self-hosted desde /public/fonts/.
   No se hace ninguna petición a fonts.googleapis.com ni a
   fonts.gstatic.com en build-time ni en runtime.
   Las fuentes originales se descargaron con:
     node scripts/vendor-fonts.mjs
   Si se vuelven a necesitar otros pesos/estilos, añadir el archivo
   físico y referenciarlo aquí — jamás volver a `next/font/google`.

   - Outfit → variable (wght 100-900, 1 archivo cubre todo).
   - Cormorant Garamond → 3 instancias estáticas (400n, 400i, 500n).
   - JetBrains Mono → 1 peso (400n, sólo lo usa algún label debug).
   Preload solo en la fuente del LCP (body) → menos archivos críticos.
   ───────────────────────────────────────────────────────────── */
const fontBody = localFont({
  src: './fonts/outfit-variable.woff2',
  weight: '100 900',
  style: 'normal',
  variable: '--font-body',
  display: 'swap',
  preload: true,
  fallback: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
});

const fontDisplay = localFont({
  src: [
    {
      path: './fonts/cormorant-garamond-400-normal.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: './fonts/cormorant-garamond-400-italic.woff2',
      weight: '400',
      style: 'italic',
    },
    {
      path: './fonts/cormorant-garamond-500-normal.woff2',
      weight: '500',
      style: 'normal',
    },
  ],
  variable: '--font-display',
  display: 'swap',
  preload: false,
  fallback: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
});

const fontMono = localFont({
  src: './fonts/jetbrains-mono-400-normal.woff2',
  weight: '400',
  style: 'normal',
  variable: '--font-mono',
  display: 'swap',
  preload: false,
  fallback: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
});

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fcfbf9' },
    { media: '(prefers-color-scheme: dark)', color: '#131312' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(CLINIC_PUBLIC_SITE_URL),
  applicationName: 'Clínica Almudena Marchesi',
  title: {
    template: '%s | Almudena Marchesi',
    default: 'Almudena Marchesi | Psicología Clínica Madrid · Moncloa',
  },
  description: 'Acompañamiento profesional en el corazón de Moncloa, Madrid. Psicología clínica basada en evidencia. Primera sesión exploratoria disponible.',
  keywords: [
    'Psicóloga Madrid',
    'Psicología clínica Moncloa',
    'Terapia Chamberí',
    'Psicólogo Madrid centro',
    'consulta Meléndez Valdés',
    'Ansiedad',
    'Depresión',
    'Almudena Marchesi',
  ],
  authors: [{ name: 'Almudena Marchesi Fernández', url: CLINIC_PUBLIC_SITE_URL }],
  creator: 'Almudena Marchesi Fernández',
  icons: {
    icon: '/favicon.ico',
  },
  manifest: '/manifest.webmanifest',
  openGraph: {
    title: 'Almudena Marchesi — Psicología Clínica',
    description: 'Acompañamiento profesional en el corazón de Moncloa, Madrid. Rigor clínico y calidez humana.',
    url: CLINIC_PUBLIC_SITE_URL,
    siteName: 'Clínica Almudena Marchesi',
    locale: 'es_ES',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Almudena Marchesi | Psicología Clínica Madrid',
    description:
      'Acompañamiento profesional en el corazón de Moncloa, Madrid. Psicología clínica basada en evidencia.',
    images: ['/images/almudena-profile.avif'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: '/',
    languages: {
      'es-ES': CLINIC_PUBLIC_SITE_URL,
    },
  },
  category: 'health',
};

/* Host de Supabase extraído del env en build time para pre-conectar
   desde la primera navegación (reduce RTT en el primer fetch auth). */
const SUPABASE_ORIGIN = (() => {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
})();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${fontDisplay.variable} ${fontBody.variable} ${fontMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Preconnect: abre TLS handshake en paralelo al parseo del HTML.
            Ahorra 100-300 ms en el primer request a cada origen. */}
        {SUPABASE_ORIGIN ? (
          <>
            <link rel="preconnect" href={SUPABASE_ORIGIN} crossOrigin="anonymous" />
            <link rel="dns-prefetch" href={SUPABASE_ORIGIN} />
          </>
        ) : null}
        <link rel="preconnect" href="https://js.stripe.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://js.stripe.com" />
      </head>
      <body>
        {/*
          ThemeProvider:
          - attribute="class" → añade la clase .dark al <html>
          - defaultTheme="system" → respeta la preferencia del SO
          - enableSystem → detecta prefers-color-scheme
          - disableTransitionOnChange → previene flash de transición en primer load
        */}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
