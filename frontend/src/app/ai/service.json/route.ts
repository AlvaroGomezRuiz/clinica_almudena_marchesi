import { NextResponse } from 'next/server';

import {
  CLINIC_POSTAL_CODE,
  CLINIC_PUBLIC_PHONE_E164,
  CLINIC_PUBLIC_SITE_URL,
} from '@/lib/clinic';

export const dynamic = 'force-static';

export async function GET(): Promise<NextResponse> {
  const baseUrl = CLINIC_PUBLIC_SITE_URL.replace(/\/+$/, '');

  return NextResponse.json(
    {
      '@context': 'https://schema.org',
      '@type': 'MedicalBusiness',
      name: 'Clínica Almudena Marchesi',
      url: baseUrl,
      image: `${baseUrl}/images/almudena-profile.avif`,
      telephone: CLINIC_PUBLIC_PHONE_E164,
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Calle de Meléndez Valdés 22, 1D',
        addressLocality: 'Madrid',
        addressRegion: 'Madrid',
        postalCode: CLINIC_POSTAL_CODE,
        addressCountry: 'ES',
      },
      areaServed: 'Madrid',
      availableService: [
        { '@type': 'Service', name: 'Terapia Individual', url: `${baseUrl}/servicios` },
        { '@type': 'Service', name: 'Terapia de Pareja', url: `${baseUrl}/servicios` },
        { '@type': 'Service', name: 'Terapia Online', url: `${baseUrl}/servicios` },
      ],
      sameAs: [],
      mainEntityOfPage: `${baseUrl}/`,
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=3600',
      },
    }
  );
}

