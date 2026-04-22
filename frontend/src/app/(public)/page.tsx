import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

import HeroSection from '@/components/sections/HeroSection';
import {
  CLINIC_CONTACT_EMAIL,
  CLINIC_PUBLIC_SITE_URL,
  getClinicAbsoluteImageUrl,
  getClinicGoogleMapsHref,
} from '@/lib/clinic';

const ogProfileImage = getClinicAbsoluteImageUrl('/images/almudena-profile.avif');

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
  title: 'Almudena Marchesi | Psicología Clínica Madrid · Moncloa',
  description:
    'Acompañamiento profesional en el corazón de Moncloa, Madrid. Psicología clínica basada en evidencia. Primera sesión exploratoria disponible.',
  openGraph: {
    title: 'Almudena Marchesi — Psicología Clínica',
    description:
      'Acompañamiento profesional en el corazón de Moncloa, Madrid. Rigor clínico y calidez humana.',
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
  keywords: [
    'psicóloga Madrid',
    'psicología clínica Moncloa',
    'terapia Madrid',
    'psicólogo Chamberí',
    'consulta psicología Meléndez Valdés',
    'Almudena Marchesi',
  ],
};

/* ── JSON-LD @graph — WebSite + LocalBusiness/MedicalBusiness (GEO + marca) ─ */
const baseUrl = CLINIC_PUBLIC_SITE_URL.replace(/\/+$/, '');
const localBusinessId = `${baseUrl}/#localbusiness`;
const websiteId = `${baseUrl}/#website`;

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': websiteId,
      name: 'Clínica Almudena Marchesi',
      url: baseUrl,
      inLanguage: 'es-ES',
      publisher: { '@id': localBusinessId },
    },
    {
      '@type': ['LocalBusiness', 'MedicalBusiness'],
      '@id': localBusinessId,
      name: 'Clínica Almudena Marchesi',
      alternateName: 'Almudena Marchesi — Psicología Clínica Madrid',
      description:
        'Psicología clínica en Moncloa (Madrid). Acompañamiento profesional basado en evidencia.',
      url: baseUrl,
      telephone: '+34646445991',
      email: CLINIC_CONTACT_EMAIL,
      image: ogProfileImage,
      logo: ogProfileImage,
      priceRange: '€€',
      currenciesAccepted: 'EUR',
      paymentAccepted: 'Cash, Credit Card, Bank Transfer',
      hasMap: getClinicGoogleMapsHref(),
      medicalSpecialty: 'https://schema.org/Psychotherapy',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Calle de Meléndez Valdés 22, 1D',
        addressLocality: 'Madrid',
        addressRegion: 'Madrid',
        addressCountry: 'ES',
        postalCode: '28015',
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: 40.4347,
        longitude: -3.7049,
      },
      areaServed: [
        { '@type': 'City', name: 'Madrid', containedInPlace: { '@type': 'Country', name: 'España' } },
        { '@type': 'AdministrativeArea', name: 'Comunidad de Madrid' },
      ],
      openingHoursSpecification: [
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          opens: '09:00',
          closes: '20:00',
        },
      ],
      knowsAbout: [
        'Psicología Clínica',
        'Terapia Cognitivo-Conductual',
        'Ansiedad',
        'Depresión',
        'Trauma',
        'Terapia Individual',
        'Terapia de pareja',
      ],
      founder: {
        '@type': 'Person',
        name: 'Almudena Marchesi Fernández',
        jobTitle: 'Psicóloga sanitaria',
        worksFor: { '@id': localBusinessId },
      },
    },
  ],
};

export default function HomePage() {
  return (
    <>
      {/* JSON-LD — visible para bots, transparente para usuarios */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
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
        <div className="cv-auto-sm">
          <CTASection />
        </div>
      </div>
    </>
  );
}

