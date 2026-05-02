import './globals.css';

import type { Metadata, Viewport } from 'next';
import { CLINIC_PUBLIC_SITE_HOST_LABEL, CLINIC_PUBLIC_SITE_URL, getClinicAbsoluteImageUrl } from '@/lib/clinic';
import { clinicPrimaryKeywordsList } from '@/lib/seo/primary-keywords';
import { clinicStripePaymentKeywordsList } from '@/lib/seo/stripe-payment-keywords';
import { ThemeProvider } from 'next-themes';
import localFont from 'next/font/local';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import AnalyticsErrorSuppressor from '@/components/layout/AnalyticsErrorSuppressor';
import CookieBanner from '@/components/layout/CookieBanner';
import Script from 'next/script';

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
  /* Reduce CLS al cargar la display: el fallback ocupa métricas más parecidas. */
  adjustFontFallback: 'Times New Roman',
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
  applicationName: CLINIC_PUBLIC_SITE_HOST_LABEL,
  title: {
    template: `%s | ${CLINIC_PUBLIC_SITE_HOST_LABEL}`,
    default: `Psicología clínica Moncloa, Madrid | ${CLINIC_PUBLIC_SITE_HOST_LABEL}`,
  },
  description:
    'Clínica de psicología clínica en Moncloa y Chamberí, Madrid. Acompañamiento con rigor. Consulta cerca de Meléndez Valdés, Madrid.',
  keywords: [
    ...clinicPrimaryKeywordsList(),
    ...clinicStripePaymentKeywordsList(),
    'Almudena Marchesi',
    'Psicóloga Madrid',
    'Terapia Chamberí',
    'Psicólogo Madrid centro',
  ],
  authors: [{ name: 'Almudena Marchesi Fernández', url: CLINIC_PUBLIC_SITE_URL }],
  creator: 'Almudena Marchesi Fernández',
  icons: {
    icon: [
      { url: '/logotype/favicon.ico', sizes: 'any' },
      { url: '/logotype/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/logotype/apple-touch-icon.png',
  },
  manifest: '/manifest.webmanifest',
  openGraph: {
    title: `Psicología clínica — Moncloa, Madrid | ${CLINIC_PUBLIC_SITE_HOST_LABEL}`,
    description:
      'Clínica de psicología en Moncloa y Chamberí, Madrid. Terapia individual, de pareja e infanto-juvenil. Consulta: Meléndez Valdés.',
    url: CLINIC_PUBLIC_SITE_URL,
    siteName: CLINIC_PUBLIC_SITE_HOST_LABEL,
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
    title: `Psicología clínica Moncloa, Madrid | ${CLINIC_PUBLIC_SITE_HOST_LABEL}`,
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

/**
 * Solo `dns-prefetch` en la raíz: en la portada pública no hay fetch a
 * Supabase/Stripe; `preconnect` sin uso penaliza Lighthouse (conexiones
 * desperdiciadas). Portal/admin pagan un RTT extra en la primera petición
 * real — aceptable frente al score global.
 */
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
        {/* Google Consent Mode v2 Default */}
        <Script
          id="google-consent-default"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('consent', 'default', {
                'analytics_storage': 'denied',
                'ad_storage': 'denied',
                'ad_user_data': 'denied',
                'ad_personalization': 'denied',
                'wait_for_update': 500
              });
            `,
          }}
        />
        {/* Google tag (gtag.js) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-ZWWW41MQ2H"
          strategy="lazyOnload"
        />
        <Script
          id="google-analytics"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());

              gtag('config', 'G-ZWWW41MQ2H');
            `,
          }}
        />
        {SUPABASE_ORIGIN ? <link rel="dns-prefetch" href={SUPABASE_ORIGIN} /> : null}
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
        <CookieBanner />
        <AnalyticsErrorSuppressor />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
