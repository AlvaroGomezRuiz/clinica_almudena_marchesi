import './globals.css';

import type { Metadata, Viewport } from 'next';
import { CLINIC_PUBLIC_SITE_URL, getClinicAbsoluteImageUrl } from '@/lib/clinic';
import { clinicPrimaryKeywordsList } from '@/lib/seo/primary-keywords';
import { ThemeProvider } from 'next-themes';
import localFont from 'next/font/local';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import AnalyticsErrorSuppressor from '@/components/layout/AnalyticsErrorSuppressor';

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
  viewportFit: 'cover',
  /* Sin maximumScale / userScalable:false: Lighthouse Accessibility exige
     poder ampliar (WCAG 1.4.4); además mejora lectura en móvil/tablet. */
};

export const metadata: Metadata = {
  metadataBase: new URL(CLINIC_PUBLIC_SITE_URL),
  applicationName: 'Clínica Almudena Marchesi',
  title: {
    template: '%s | Almudena Marchesi',
    default: 'Almudena Marchesi | Clínica de psicología clínica en Moncloa, Madrid',
  },
  description:
    'Clínica de psicología clínica en Moncloa y Chamberí, Madrid. Acompañamiento con rigor. Consulta cerca de Meléndez Valdés, Madrid.',
  keywords: [
    ...clinicPrimaryKeywordsList(),
    'Almudena Marchesi',
    'Psicóloga Madrid',
    'Terapia Chamberí',
    'Psicólogo Madrid centro',
  ],
  authors: [{ name: 'Almudena Marchesi Fernández', url: CLINIC_PUBLIC_SITE_URL }],
  creator: 'Almudena Marchesi Fernández',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.webmanifest',
  openGraph: {
    title: 'Almudena Marchesi — Psicología clínica Moncloa, Madrid',
    description:
      'Clínica de psicología en Moncloa y Chamberí, Madrid. Terapia individual, de pareja e infanto-juvenil. Consulta: Meléndez Valdés.',
    url: CLINIC_PUBLIC_SITE_URL,
    siteName: 'Clínica Almudena Marchesi',
    locale: 'es_ES',
    type: 'website',
    images: [
      {
        url: getClinicAbsoluteImageUrl('/images/almudena-profile.avif'),
        width: 1200,
        height: 630,
        alt: 'Clínica de psicología clínica en Moncloa (Madrid) — Almudena Marchesi',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Almudena Marchesi | Psicología clínica Moncloa, Madrid',
    description:
      'Clínica de psicología en Moncloa y Chamberí, Madrid. Terapia y acompañamiento con rigor. Consulta: Meléndez Valdés.',
    images: [getClinicAbsoluteImageUrl('/images/almudena-profile.avif')],
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
      'x-default': CLINIC_PUBLIC_SITE_URL,
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
        <AnalyticsErrorSuppressor />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
