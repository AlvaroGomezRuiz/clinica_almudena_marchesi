import './globals.css';

import type { Metadata, Viewport } from 'next';
import { CLINIC_PUBLIC_SITE_URL } from '@/lib/clinic';
import { ThemeProvider } from 'next-themes';
import { Cormorant_Garamond, Outfit, JetBrains_Mono } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

/* ─────────────────────────────────────────────────────────────
   FUENTES — optimizadas para LCP y mínimo bytes en wire.
   - Cormorant (display): solo 400/500 normal+italic → pesos realmente usados.
   - Outfit (body): 300/400/500 → el 600 no se usa en ningún sitio (semibold mapea a 500 en display, 600 en body es raro).
   - JetBrains Mono: un solo peso (400). El 300 solo aparecía en fallbacks.
   Preload solo en la fuente del LCP (body Outfit) → menos archivos críticos.
   ───────────────────────────────────────────────────────────── */
const fontDisplay = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
  preload: false,
});

const fontBody = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-body',
  display: 'swap',
  preload: true,
});

const fontMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-mono',
  display: 'swap',
  preload: false,
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
  title: {
    template: '%s | Almudena Marchesi',
    default: 'Almudena Marchesi | Psicología Clínica Madrid · Moncloa',
  },
  description: 'Acompañamiento profesional en el corazón de Moncloa, Madrid. Psicología clínica basada en evidencia. Primera sesión exploratoria disponible.',
  keywords: ['Psicóloga Madrid', 'Psicología Clínica', 'Terapia Moncloa', 'Psicólogo Moncloa', 'Ansiedad', 'Depresión', 'Almudena Marchesi'],
  authors: [{ name: 'Almudena Marchesi' }],
  creator: 'Almudena Marchesi',
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
  },
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
