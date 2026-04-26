import type { MetadataRoute } from 'next';

import { CLINIC_PUBLIC_SITE_URL } from '@/lib/clinic';
import { LEGAL_LAST_UPDATED_ISO } from '@/lib/seo/legal-version';

function getBaseUrl(): string {
  return CLINIC_PUBLIC_SITE_URL.replace(/\/+$/, '');
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getBaseUrl();
  const now = new Date();
  const legalModified = new Date(`${LEGAL_LAST_UPDATED_ISO}T12:00:00.000Z`);

  return [
    { url: `${baseUrl}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    {
      url: `${baseUrl}/enfoque`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/servicios`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/sobre-mi`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.75,
    },
    {
      url: `${baseUrl}/contacto`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/registro-paciente`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/cookies`,
      lastModified: legalModified,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    {
      url: `${baseUrl}/privacidad`,
      lastModified: legalModified,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    {
      url: `${baseUrl}/aviso-legal`,
      lastModified: legalModified,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
  ];
}
