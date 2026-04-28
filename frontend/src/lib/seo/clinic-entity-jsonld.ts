/**
 * JSON-LD @graph (WebSite + LocalBusiness + MedicalBusiness + Person)
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
  const personId = `${base}/#person-almudena-marchesi`;
  const sameAs = getClinicSameAsUrls();

  const person: Record<string, unknown> = {
    '@type': 'Person',
    '@id': personId,
    name: 'Almudena Marchesi Fernández',
    image: ogProfileImage,
    url: base,
    jobTitle: 'Psicóloga general sanitaria',
    knowsLanguage: ['es-ES', 'es'],
    identifier: {
      '@type': 'PropertyValue',
      name: 'Número de colegiación (COP Madrid)',
      value: CLINIC_PROFESSIONAL_LICENSE,
    },
    worksFor: { '@id': localBusinessId },
  };
  if (sameAs.length > 0) {
    person.sameAs = sameAs;
  }

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
    contactPoint: [
      {
        '@type': 'ContactPoint',
        telephone: CLINIC_PUBLIC_PHONE_E164,
        email: CLINIC_CONTACT_EMAIL,
        contactType: 'customer service',
        availableLanguage: 'Spanish',
        areaServed: { '@type': 'AdministrativeArea', name: 'Comunidad de Madrid' },
      },
    ],
    image: ogProfileImage,
    logo: ogProfileImage,
    priceRange: '€€',
    currenciesAccepted: 'EUR',
    paymentAccepted: 'Cash, Credit Card, Bank Transfer',
    hasMap: getClinicGoogleMapsHref(),
    medicalSpecialty: 'https://schema.org/Psychotherapy',
    availableService: [
      {
        '@type': 'Service',
        name: 'Terapia psicológica individual (adultos)',
        url: `${base}/servicios`,
        serviceType: 'Psychotherapy',
        description:
          'Proceso clínico individual: ansiedad, estado de ánimo, estrés, duelo y otras dificultades, con cita.',
        provider: { '@id': localBusinessId },
      },
      {
        '@type': 'Service',
        name: 'Terapia de pareja',
        url: `${base}/servicios`,
        serviceType: 'Psychotherapy',
        description: 'Acompañamiento a parejas: comunicación, relación y ajuste terapéutico bajo cita.',
        provider: { '@id': localBusinessId },
      },
      {
        '@type': 'Service',
        name: 'Psicoterapia infanto-juvenil y orientación a familia',
        url: `${base}/servicios`,
        serviceType: 'Psychotherapy',
        description: 'Enfoque adaptado a edad y contexto familiar, previa valoración.',
        provider: { '@id': localBusinessId },
      },
      {
        '@type': 'Service',
        name: 'Psicoterapia online (enlace acordado)',
        url: `${base}/servicios`,
        serviceType: 'Psychotherapy',
        description:
          'Modalidad a distancia con criterio clínico, canal seguro y política de privacidad del portal.',
        provider: { '@id': localBusinessId },
      },
    ],
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
      { '@type': 'Place', name: 'Chamartín' },
      { '@type': 'Place', name: 'Almagro (Madrid), barrio de Chamartín' },
    ],
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: 'Thursday',
        opens: '09:00',
        closes: '15:00',
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: 'Thursday',
        opens: '16:00',
        closes: '21:00',
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
    founder: { '@id': personId },
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
        about: { '@id': localBusinessId },
        mainEntity: { '@id': localBusinessId },
        potentialAction: {
          '@type': 'ReserveAction',
          name: 'Registro y reserva en el portal del paciente',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${base}/registro-paciente`,
          },
        },
      },
      person,
      localBusiness,
    ],
  };
}
