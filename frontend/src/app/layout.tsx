import './globals.css';

import type { Metadata, Viewport } from 'next';
import { ThemeProvider } from 'next-themes';
import { Cormorant_Garamond, Outfit, JetBrains_Mono } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

const fontDisplay = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
});

const fontBody = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-body',
  display: 'swap',
});

const fontMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['300', '400'],
  variable: '--font-mono',
  display: 'swap',
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
  metadataBase: new URL('https://almudenamarchesi.es'),
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
    url: 'https://almudenamarchesi.es',
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
      <head />
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
