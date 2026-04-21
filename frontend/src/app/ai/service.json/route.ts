import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

function getBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.SITE_URL ??
    'http://localhost:3000';
  return raw.replace(/\/+$/, '');
}

export async function GET(): Promise<NextResponse> {
  const baseUrl = getBaseUrl();

  return NextResponse.json(
    {
      '@context': 'https://schema.org',
      '@type': 'MedicalBusiness',
      name: 'Clínica Almudena Marchesi',
      url: baseUrl,
      image: `${baseUrl}/images/almudena-profile.avif`,
      telephone: '+34646445991',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Calle de Meléndez Valdés 22, 1D',
        addressLocality: 'Madrid',
        addressRegion: 'Madrid',
        postalCode: '28015',
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

