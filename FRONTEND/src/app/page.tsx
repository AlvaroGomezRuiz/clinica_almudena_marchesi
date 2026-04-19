import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

import HeroSection from './sections/HeroSection';

/* ── Dynamic imports para secciones below-the-fold ──────────────────
   ssr: true  → Google los indexa en el HTML inicial (SEO intacto)
   loading    → placeholder visible con la misma altura de sección
                para evitar saltos de layout (CLS = 0) mientras el
                JS de la sección se descarga en su chunk separado.
   ─────────────────────────────────────────────────────────────────── */
const PhilosophySection = dynamic(
  () => import('./sections/PhilosophySection'),
  {
    ssr: true,
    loading: () => (
      <div
        className="py-28 md:py-40 bg-canvas-alt"
        aria-hidden="true"
        style={{ minHeight: '600px' }}
      />
    ),
  },
);

const BunkerSection = dynamic(
  () => import('./sections/BunkerSection'),
  {
    ssr: true,
    loading: () => (
      <div
        className="py-28 md:py-40 bg-canvas"
        aria-hidden="true"
        style={{ minHeight: '500px' }}
      />
    ),
  },
);

const MoncloaSection = dynamic(
  () => import('./sections/MoncloaSection'),
  {
    ssr: true,
    loading: () => (
      <div
        className="py-24 md:py-36 bg-canvas-alt"
        aria-hidden="true"
        style={{ minHeight: '480px' }}
      />
    ),
  },
);

const CTASection = dynamic(
  () => import('./sections/CTASection'),
  {
    ssr: true,
    loading: () => (
      <div
        className="py-28 md:py-40 bg-canvas"
        aria-hidden="true"
        style={{ minHeight: '380px' }}
      />
    ),
  },
);

/* ── Metadata enriquecida (SEO + OpenGraph + Twitter) ─────────────── */
export const metadata: Metadata = {
  metadataBase: new URL('https://almudenamarchesi.es'),
  title: 'Almudena Marchesi | Psicología Clínica Madrid · Moncloa',
  description:
    'Acompañamiento profesional en el corazón de Moncloa, Madrid. Psicología clínica basada en evidencia. Primera sesión exploratoria disponible.',
  openGraph: {
    title: 'Almudena Marchesi — Psicología Clínica',
    description:
      'Acompañamiento profesional en el corazón de Moncloa, Madrid. Rigor clínico y calidez humana.',
    url: 'https://almudenamarchesi.es',
    siteName: 'Clínica Almudena Marchesi',
    images: [
      {
        url: 'https://almudenamarchesi.es/images/almudena-profile.avif',
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
    images: ['https://almudenamarchesi.es/images/almudena-profile.avif'],
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
    canonical: 'https://almudenamarchesi.es',
  },
};

/* ── JSON-LD Structured Data ──────────────────────────────────────── */
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': ['LocalBusiness', 'MedicalBusiness'],
  name: 'Clínica Almudena Marchesi',
  description:
    'Psicología clínica en Moncloa, Madrid. Acompañamiento profesional basado en evidencia.',
  url: 'https://almudenamarchesi.es',
  telephone: '+34646445991',
  image: 'https://almudenamarchesi.es/images/almudena-profile.avif',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Moncloa',
    addressLocality: 'Madrid',
    addressRegion: 'Madrid',
    addressCountry: 'ES',
    postalCode: '28008',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: 40.431,
    longitude: -3.7188,
  },
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      opens: '09:00',
      closes: '20:00',
    },
  ],
  priceRange: '€€',
  currenciesAccepted: 'EUR',
  paymentAccepted: 'Cash, Credit Card, Bank Transfer',
  knowsAbout: [
    'Psicología Clínica',
    'Terapia Cognitivo-Conductual',
    'Ansiedad',
    'Depresión',
    'Trauma',
    'Terapia Individual',
  ],
  founder: {
    '@type': 'Person',
    name: 'Almudena Marchesi',
    jobTitle: 'Psicóloga Clínica',
    worksFor: {
      '@type': 'MedicalBusiness',
      name: 'Clínica Almudena Marchesi',
    },
  },
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

        {/* Below-the-fold: dynamic chunks — alivian el bundle inicial */}
        <PhilosophySection />
        <BunkerSection />
        <MoncloaSection />
        <CTASection />
      </div>
    </>
  );
}
