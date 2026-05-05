import type { ReactNode } from 'react';

import PublicFooter from '@/components/layout/PublicFooter';
import PublicHeader from '@/components/layout/PublicHeader';
import LenisProvider from '@/components/landing/LenisProvider';
import { buildClinicEntityJsonLd } from '@/lib/seo/clinic-entity-jsonld';

const clinicEntityJsonLd = buildClinicEntityJsonLd();

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        // JSON-LD global en todas las URLs públicas (NAP + GEO coherentes).
        dangerouslySetInnerHTML={{ __html: JSON.stringify(clinicEntityJsonLd) }}
      />
      {/* WCAG 2.4.1 — Skip link: bypass navegación para usuarios de teclado */}
      <a href="#main" className="skip-link">
        Saltar al contenido principal
      </a>
      <LenisProvider>
        <PublicHeader />
        <main id="main">{children}</main>
        <PublicFooter />
      </LenisProvider>
    </>
  );
}

