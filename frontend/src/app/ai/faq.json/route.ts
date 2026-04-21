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
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: '¿Dónde está la consulta?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'La consulta está en Moncloa, Madrid. Puedes ver la ubicación y cómo llegar en la página de contacto.',
          },
        },
        {
          '@type': 'Question',
          name: '¿Qué servicios ofrece?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Terapia individual, terapia de pareja y terapia online. Detalles en la página de servicios.',
          },
        },
        {
          '@type': 'Question',
          name: '¿Cómo reservo una cita?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'La reserva se gestiona a través del portal seguro. Puedes iniciar sesión o registrarte para acceder.',
          },
        },
      ],
      url: `${baseUrl}/`,
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=3600',
      },
    }
  );
}

