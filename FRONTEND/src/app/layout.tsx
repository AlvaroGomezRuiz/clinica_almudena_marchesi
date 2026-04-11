import './globals.css';

import { headers } from 'next/headers';
import PublicHeader from '@/components/public/PublicHeader';

function shouldRenderPublicHeader(pathname: string): boolean {
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
  const renderPublicHeader = shouldRenderPublicHeader(pathname);

  return (
    <html lang="es">
      <body>
        {renderPublicHeader ? <PublicHeader /> : null}
        {children}
      </body>
    </html>
  );
}
