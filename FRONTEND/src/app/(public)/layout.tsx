import type { ReactNode } from 'react';

import PublicFooter from '@/components/layout/PublicFooter';
import PublicHeader from '@/components/layout/PublicHeader';

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* WCAG 2.4.1 — Skip link: bypass navegación para usuarios de teclado */}
      <a href="#main" className="skip-link">
        Saltar al contenido principal
      </a>
      <PublicHeader />
      <div id="main">{children}</div>
      <PublicFooter />
    </>
  );
}

