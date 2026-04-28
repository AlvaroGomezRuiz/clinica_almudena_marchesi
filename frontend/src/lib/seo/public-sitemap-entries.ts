import type { MetadataRoute } from 'next';

import { LEGAL_LAST_UPDATED_ISO } from '@/lib/seo/legal-version';

/**
 * Única fuente de listado de URLs indexables + prioridades (sitemap y auditoría SEO).
 * Excluye `registro-paciente` (noindex) y portales.
 */
export function getPublicSitemapEntries(
  siteBase: string,
  now: Date,
): MetadataRoute.Sitemap {
  const b = siteBase.replace(/\/+$/, '');
  const legalModified = new Date(`${LEGAL_LAST_UPDATED_ISO}T12:00:00.000Z`);

  return [
    { url: `${b}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${b}/servicios`, lastModified: now, changeFrequency: 'monthly', priority: 0.95 },
    { url: `${b}/enfoque`, lastModified: now, changeFrequency: 'monthly', priority: 0.88 },
    { url: `${b}/sobre-mi`, lastModified: now, changeFrequency: 'yearly', priority: 0.85 },
    { url: `${b}/contacto`, lastModified: now, changeFrequency: 'monthly', priority: 0.92 },
    { url: `${b}/cookies`, lastModified: legalModified, changeFrequency: 'yearly', priority: 0.25 },
    { url: `${b}/privacidad`, lastModified: legalModified, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${b}/aviso-legal`, lastModified: legalModified, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
