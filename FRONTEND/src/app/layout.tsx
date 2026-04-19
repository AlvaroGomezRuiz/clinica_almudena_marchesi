import './globals.css';

import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import { ThemeProvider } from 'next-themes';
import { Cormorant_Garamond, Outfit, JetBrains_Mono } from 'next/font/google';

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

import PublicHeader from '@/components/PublicHeader';
import PublicFooter from '@/components/public/PublicFooter';
import { PrivacyProvider } from '@/context/PrivacyContext';


function shouldRenderPublicShell(pathname: string): boolean {
  if (!pathname) return true;
  if (pathname.startsWith('/dashboard')) return false;
  if (pathname.startsWith('/portal')) return false;
  if (pathname.startsWith('/admin')) return false;
  return true;
}

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
  openGraph: {
    title: 'Almudena Marchesi — Psicología Clínica',
    description: 'Acompañamiento profesional en el corazón de Moncloa, Madrid. Rigor clínico y calidez humana.',
    url: 'https://almudenamarchesi.es',
    siteName: 'Clínica Almudena Marchesi',
    locale: 'es_ES',
    type: 'website',
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
  const pathname = headers().get('x-pathname') ?? '';
  const isPublic = shouldRenderPublicShell(pathname);

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
          {isPublic ? (
            <>
              {/* WCAG 2.4.1 — Skip link: bypass navegación para usuarios de teclado */}
              <a
                href="#main"
                className="skip-link"
              >
                Saltar al contenido principal
              </a>
              <PublicHeader />
            </>
          ) : null}
          <main id="main">
            {isPublic ? children : (
              <PrivacyProvider>{children}</PrivacyProvider>
            )}
          </main>
          {isPublic ? <PublicFooter /> : null}
        </ThemeProvider>
      </body>
    </html>
  );
}
