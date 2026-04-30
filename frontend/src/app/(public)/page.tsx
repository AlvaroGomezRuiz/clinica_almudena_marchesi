import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

import HeroSection from '@/components/sections/HeroSection';
import PublicFaqSection from '@/components/seo/PublicFaqSection';
import {
  CLINIC_ENTITY_DESCRIPTION_ES,
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
import { clinicPrimaryKeywordsList } from '@/lib/seo/primary-keywords';

const ogProfileImage = getClinicAbsoluteImageUrl('/images/almudena-profile.avif');
const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();

const homeFaqPageUrl: string = new URL('/', CLINIC_PUBLIC_SITE_URL).href;
const homeFaqLd = buildFaqPageJsonLd(homePageFaq, homeFaqPageUrl);
const homeWebPageLd = buildHomePageWebJsonLd({
  name: `Clínica de psicología clínica en Moncloa, Madrid | ${CLINIC_PUBLIC_SITE_HOST_LABEL}`,
  description: CLINIC_ENTITY_DESCRIPTION_ES,
});

/* ── Dynamic imports para secciones below-the-fold ──────────────────
   ssr: true  → Google los indexa en el HTML inicial (SEO intacto)
   loading    → placeholder visible con la misma altura de sección
                para evitar saltos de layout (CLS = 0) mientras el
                JS de la sección se descarga en su chunk separado.
   ─────────────────────────────────────────────────────────────────── */
const PhilosophySection = dynamic(
  () => import('@/components/sections/PhilosophySection'),
  {
    ssr: true,
    loading: () => (
      <div
        className="py-28 md:py-40 bg-canvas-alt cv-auto"
        aria-hidden="true"
        style={{ minHeight: '600px' }}
      />
    ),
  },
);

const BunkerSection = dynamic(
  () => import('@/components/sections/BunkerSection'),
  {
    ssr: true,
    loading: () => (
      <div
        className="py-28 md:py-40 bg-canvas cv-auto"
        aria-hidden="true"
        style={{ minHeight: '500px' }}
      />
    ),
  },
);

const MoncloaSection = dynamic(
  () => import('@/components/sections/MoncloaSection'),
  {
    ssr: true,
    loading: () => (
      <div
        className="py-24 md:py-36 bg-canvas-alt cv-auto"
        aria-hidden="true"
        style={{ minHeight: '480px' }}
      />
    ),
  },
);

const CTASection = dynamic(
  () => import('@/components/sections/CTASection'),
  {
    ssr: true,
    loading: () => (
      <div
        className="py-28 md:py-40 bg-canvas cv-auto-sm"
        aria-hidden="true"
        style={{ minHeight: '380px' }}
      />
    ),
  },
);

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
  keywords: [
    ...clinicPrimaryKeywordsList(),
    'psicóloga Madrid',
    'terapia Madrid',
    'psicólogo Chamberí',
    'Almudena Marchesi',
    'terapia ansiedad Madrid',
  ],
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
      <div className="bg-canvas overflow-x-hidden">
        {/* Hero: importación estática — carga inmediata, máxima prioridad */}
        <HeroSection />

        {/* Below-the-fold: dynamic chunks + content-visibility. El navegador
            omite layout/paint hasta que entran en viewport. */}
        <div className="cv-auto">
          <PhilosophySection />
        </div>
        <div className="cv-auto">
          <BunkerSection />
        </div>
        <div className="cv-auto">
          <MoncloaSection />
        </div>
        <div className="cv-auto">
          <PublicFaqSection
            id="faq-inicio"
            className="bg-canvas"
            heading="Dudas frecuentes antes de reservar"
            items={homePageFaq}
          />
        </div>
        <div className="cv-auto-sm">
          <CTASection />
        </div>
      </div>
    </>
  );
}

