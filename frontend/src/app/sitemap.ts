import type { MetadataRoute } from 'next';

import { CLINIC_PUBLIC_SITE_URL } from '@/lib/clinic';
import { getPublicSitemapEntries } from '@/lib/seo/public-sitemap-entries';

function getBaseUrl(): string {
  return CLINIC_PUBLIC_SITE_URL.replace(/\/+$/, '');
}

export default function sitemap(): MetadataRoute.Sitemap {
  return getPublicSitemapEntries(getBaseUrl(), new Date());
}
