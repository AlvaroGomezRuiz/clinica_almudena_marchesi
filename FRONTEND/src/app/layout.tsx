import './globals.css';

import { headers } from 'next/headers';
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
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        {isPublic ? <PublicHeader /> : null}
        <main id="main">
          {isPublic ? children : (
            <PrivacyProvider>{children}</PrivacyProvider>
          )}
        </main>
        {isPublic ? <PublicFooter /> : null}
      </body>
    </html>
  );
}
