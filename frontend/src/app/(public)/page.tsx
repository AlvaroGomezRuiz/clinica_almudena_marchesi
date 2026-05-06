import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

import VideoHero from '@/components/sections/VideoHero';
import EnfoqueSummarySection from '@/components/sections/EnfoqueSummarySection';
import ServiciosSummarySection from '@/components/sections/ServiciosSummarySection';
import SobreMiSummarySection from '@/components/sections/SobreMiSummarySection';
import ContactoSummarySection from '@/components/sections/ContactoSummarySection';

import PublicFaqSection from '@/components/seo/PublicFaqSection';
import {
  CLINIC_GEO_LAT,
  CLINIC_GEO_LNG,
  CLINIC_HOME_META_DESCRIPTION_ES,
  CLINIC_PUBLIC_SITE_HOST_LABEL,
  CLINIC_PUBLIC_SITE_URL,
  getClinicAbsoluteImageUrl,
} from '@/lib/clinic';
import { homePageFaq } from '@/lib/seo/clinic-faq-content';
import { buildFaqPageJsonLd } from '@/lib/seo/faq-jsonld';
import { buildHomePageWebJsonLd } from '@/lib/seo/marketing-page-json-ld';
import { homeSearchKeywordsCsv, homeSearchKeywordsList } from '@/lib/seo/home-search-keywords';

const ogProfileImage = getClinicAbsoluteImageUrl('/images/almudena-profile.avif');
const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();

const homeFaqPageUrl: string = new URL('/', CLINIC_PUBLIC_SITE_URL).href;
const homeFaqLd = buildFaqPageJsonLd(homePageFaq, homeFaqPageUrl);
const homeWebPageLd = buildHomePageWebJsonLd({
  name: `Clínica de psicología clínica en Moncloa, Madrid | ${CLINIC_PUBLIC_SITE_HOST_LABEL}`,
  description: CLINIC_HOME_META_DESCRIPTION_ES,
  keywordsCsv: homeSearchKeywordsCsv(),
});

/* ── Metadata enriquecida (SEO + OpenGraph + Twitter) ─────────────── */
export const metadata: Metadata = {
  metadataBase: new URL(CLINIC_PUBLIC_SITE_URL),
  title: `Clínica de psicología clínica en Moncloa, Madrid | ${CLINIC_PUBLIC_SITE_HOST_LABEL}`,
  description: CLINIC_HOME_META_DESCRIPTION_ES,
  openGraph: {
    title: `AM Psicología — Moncloa, Argüelles, Chamberí | ${CLINIC_PUBLIC_SITE_HOST_LABEL}`,
    description: CLINIC_HOME_META_DESCRIPTION_ES,
    url: CLINIC_PUBLIC_SITE_URL,
    siteName: CLINIC_PUBLIC_SITE_HOST_LABEL,
    images: [
      {
        url: ogProfileImage,
        width: 1200,
        height: 630,
        alt: 'Almudena Marchesi, psicóloga clínica en Moncloa, Madrid',
      },
    ],
    locale: 'es_ES',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `AM Psicología, Madrid | ${CLINIC_PUBLIC_SITE_HOST_LABEL}`,
    description: CLINIC_HOME_META_DESCRIPTION_ES,
    images: [ogProfileImage],
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
    canonical: CLINIC_PUBLIC_SITE_URL,
    languages: { 'es-ES': CLINIC_PUBLIC_SITE_URL, 'x-default': CLINIC_PUBLIC_SITE_URL },
  },
  ...(googleVerification ? { verification: { google: googleVerification } } : {}),
  other: {
    'geo.region': 'ES-MD',
    'geo.placename': 'Madrid, Moncloa–Chamberí–Argüelles',
    ICBM: `${CLINIC_GEO_LAT}, ${CLINIC_GEO_LNG}`,
  },
  keywords: homeSearchKeywordsList(),
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeWebPageLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeFaqLd) }}
      />
      
      {/* 
        El nuevo layout para la landing tiene secciones Sticky (top-0). 
        Cada sección ocupa el 100% de la pantalla (h-screen/h-[100dvh]) y tiene border-radius top 
        para que se vaya apilando visualmente sobre la anterior mediante scroll. 
      */}
      {/* Añadido "dark text-white" para forzar el modo oscuro en toda la home sobre el vídeo */}
      <div className="w-full overflow-hidden relative dark text-white">
        <VideoHero />
        <EnfoqueSummarySection />
        <ServiciosSummarySection />
        <SobreMiSummarySection />
        <ContactoSummarySection />

        {/* FAQ final */}
        <div className="relative z-50 bg-transparent rounded-t-3xl pt-10">
          <PublicFaqSection
            id="faq-inicio"
            className="bg-transparent"
            heading="Dudas frecuentes antes de reservar"
            items={homePageFaq}
          />
        </div>
      </div>
    </>
  );
}

