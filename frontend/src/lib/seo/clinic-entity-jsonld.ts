/**
 * JSON-LD @graph (WebSite + LocalBusiness/MedicalBusiness + founder Person)
 * para SEO local y Knowledge Graph. Una sola fuente de verdad con `lib/clinic.ts`.
 */
import {
  CLINIC_CONTACT_EMAIL,
  CLINIC_GEO_LAT,
  CLINIC_GEO_LNG,
  CLINIC_POSTAL_CODE,
  CLINIC_PROFESSIONAL_LICENSE,
  CLINIC_PUBLIC_PHONE_E164,
  CLINIC_PUBLIC_SITE_URL,
  getClinicAbsoluteImageUrl,
  getClinicGoogleMapsHref,
  getClinicSameAsUrls,
} from '@/lib/clinic';
import { clinicPrimaryKeywordsText } from '@/lib/seo/primary-keywords';

export function buildClinicEntityJsonLd(): Record<string, unknown> {
  const base = CLINIC_PUBLIC_SITE_URL.replace(/\/+$/, '');
  const ogProfileImage = getClinicAbsoluteImageUrl('/images/almudena-profile.avif');
  const localBusinessId = `${base}/#localbusiness`;
  const websiteId = `${base}/#website`;
  const sameAs = getClinicSameAsUrls();

  const localBusiness: Record<string, unknown> = {
    '@type': ['LocalBusiness', 'MedicalBusiness'],
    '@id': localBusinessId,
    name: 'Clínica Almudena Marchesi',
    alternateName: 'Almudena Marchesi — Psicología Clínica Moncloa Madrid',
    description:
      'Clínica de psicología en Moncloa y Chamberí, Madrid. Terapia individual, de pareja e infanto-juvenil; presencial y online con enlace seguro.',
    keywords: clinicPrimaryKeywordsText(),
    url: base,
    telephone: CLINIC_PUBLIC_PHONE_E164,
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
      postalCode: CLINIC_POSTAL_CODE,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: CLINIC_GEO_LAT,
      longitude: CLINIC_GEO_LNG,
    },
    areaServed: [
      {
        '@type': 'City',
        name: 'Madrid',
        containedInPlace: { '@type': 'Country', name: 'España' },
      },
      { '@type': 'AdministrativeArea', name: 'Comunidad de Madrid' },
      { '@type': 'Place', name: 'Moncloa – Aravaca' },
      { '@type': 'Place', name: 'Chamberí' },
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
      'clínica psicología Moncloa',
      'psicólogo Moncloa Madrid',
      'psicología clínica Chamberí',
      'consulta de psicología cerca de Moncloa',
      'Psicología clínica',
      'Terapia cognitivo-conductual',
      'Ansiedad',
      'Depresión',
      'Trauma',
      'Terapia individual',
      'Terapia de pareja',
      'Terapia infanto-juvenil',
    ],
    founder: {
      '@type': 'Person',
      name: 'Almudena Marchesi Fernández',
      jobTitle: `Psicóloga sanitaria · Colegiada nº ${CLINIC_PROFESSIONAL_LICENSE}`,
      worksFor: { '@id': localBusinessId },
    },
  };

  if (sameAs.length > 0) {
    localBusiness.sameAs = sameAs;
  }

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': websiteId,
        name: 'Clínica Almudena Marchesi',
        alternateName: 'Psicología clínica Moncloa | Almudena Marchesi',
        description:
          'Clínica de psicología en Moncloa y Chamberí, Madrid. Sitio informativo; atención clínica bajo cita. Sin datos de pacientes en el contenido indexable.',
        url: base,
        inLanguage: 'es-ES',
        publisher: { '@id': localBusinessId },
      },
      localBusiness,
    ],
  };
}
