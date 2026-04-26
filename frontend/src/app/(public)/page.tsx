import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

import HeroSection from '@/components/sections/HeroSection';
import {
  CLINIC_GEO_LAT,
  CLINIC_GEO_LNG,
  CLINIC_PUBLIC_SITE_URL,
  getClinicAbsoluteImageUrl,
} from '@/lib/clinic';
import { clinicPrimaryKeywordsList } from '@/lib/seo/primary-keywords';

const ogProfileImage = getClinicAbsoluteImageUrl('/images/almudena-profile.avif');
const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();

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
  title: 'Almudena Marchesi | Clínica de psicología clínica en Moncloa, Madrid',
  description:
    'Clínica de psicología clínica en Moncloa y Chamberí, Madrid. Terapia basada en evidencia. Consulta cerca de Calle Meléndez Valdés. Primera sesión exploratoria bajo cita.',
  openGraph: {
    title: 'Almudena Marchesi — Clínica de psicología en Moncloa, Madrid',
    description:
      'Psicología clínica en Moncloa y Chamberí, Madrid. Atención individual, de pareja e infanto-juvenil. Consulta: Meléndez Valdés 22, 1D.',
    url: CLINIC_PUBLIC_SITE_URL,
    siteName: 'Clínica Almudena Marchesi',
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
    title: 'Almudena Marchesi | Psicología Clínica Madrid',
    description: 'Acompañamiento profesional en el corazón de Moncloa.',
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
    languages: { 'es-ES': CLINIC_PUBLIC_SITE_URL },
  },
  ...(googleVerification ? { verification: { google: googleVerification } } : {}),
  other: {
    'geo.region': 'ES-MD',
    'geo.placename': 'Madrid, Moncloa–Chamberí',
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
        <div className="cv-auto-sm">
          <CTASection />
        </div>
      </div>
    </>
  );
}

