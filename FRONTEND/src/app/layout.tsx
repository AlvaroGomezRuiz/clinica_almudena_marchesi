import './globals.css';

import { headers } from 'next/headers';
import { ThemeProvider } from 'next-themes';

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
