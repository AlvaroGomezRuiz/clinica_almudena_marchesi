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
      name: 'Almudena Marchesi | Psicología Clínica',
      description:
        'Consulta de psicología clínica en Moncloa, Madrid. Acompañamiento basado en evidencia, con enfoque humano y rigor clínico.',
      website: baseUrl,
      locale: 'es-ES',
      category: 'Healthcare',
      pages: {
        home: `${baseUrl}/`,
        about: `${baseUrl}/sobre-mi`,
        approach: `${baseUrl}/enfoque`,
        services: `${baseUrl}/servicios`,
        contact: `${baseUrl}/contacto`,
        pricing: `${baseUrl}/pagos`,
        legal: {
          privacy: `${baseUrl}/privacidad`,
          cookies: `${baseUrl}/cookies`,
          legal_notice: `${baseUrl}/aviso-legal`,
        },
      },
      discovery: {
        sitemap: `${baseUrl}/sitemap.xml`,
        robots: `${baseUrl}/robots.txt`,
        llms: `${baseUrl}/llms.txt`,
        llms_full: `${baseUrl}/llms-full.txt`,
        ai_well_known: `${baseUrl}/.well-known/ai.txt`,
      },
      access: {
        notes:
          'Áreas privadas (portal/admin) requieren autenticación y no deben indexarse.',
      },
      updated_at: new Date().toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=3600',
      },
    }
  );
}

