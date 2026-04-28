import { CLINIC_PUBLIC_SITE_URL, getClinicAbsoluteImageUrl } from '@/lib/clinic';

import type { BreadcrumbItem } from './breadcrumb-jsonld';
import { buildBreadcrumbListNode } from './breadcrumb-jsonld';

export interface MarketingPageJsonLdInput {
  /** Ruta pública, p. ej. `/servicios` */
  readonly path: string;
  readonly name: string;
  readonly description: string;
  readonly breadcrumb: readonly BreadcrumbItem[];
}

/**
 * Un solo JSON-LD con `@graph`: [WebPage, BreadcrumbList] — señal de página + navegación.
 * Complementa el grafo global (LocalBusiness + WebSite) del layout público.
 */
export function buildMarketingPageJsonLd(
  input: MarketingPageJsonLdInput,
): Record<string, unknown> {
  const base = CLINIC_PUBLIC_SITE_URL.replace(/\/+$/, '');
  const path = input.path.startsWith('/') ? input.path : `/${input.path}`;
  const url = `${base}${path}`;
  const imageUrl = getClinicAbsoluteImageUrl('/images/almudena-profile.avif');

  const webPage: Record<string, unknown> = {
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: input.name,
    description: input.description,
    inLanguage: 'es-ES',
    isPartOf: { '@id': `${base}/#website` },
    about: { '@id': `${base}/#localbusiness` },
    primaryImageOfPage: {
      '@type': 'ImageObject',
      url: imageUrl,
      width: 1200,
      height: 630,
    },
    publisher: { '@id': `${base}/#localbusiness` },
  };

  return {
    '@context': 'https://schema.org',
    '@graph': [webPage, buildBreadcrumbListNode(input.breadcrumb)],
  };
}

export interface HomePageWebJsonLdInput {
  readonly name: string;
  readonly description: string;
}

/**
 * Página de inicio: `WebPage` con `url` canónica `/` (sin Breadcrumb mínimo obligatorio).
 */
export function buildHomePageWebJsonLd(
  input: HomePageWebJsonLdInput,
): Record<string, unknown> {
  const base = CLINIC_PUBLIC_SITE_URL.replace(/\/+$/, '');
  const url = `${base}/`;
  const imageUrl = getClinicAbsoluteImageUrl('/images/almudena-profile.avif');

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
        url,
        name: input.name,
        description: input.description,
        inLanguage: 'es-ES',
        isPartOf: { '@id': `${base}/#website` },
        about: { '@id': `${base}/#localbusiness` },
        primaryImageOfPage: {
          '@type': 'ImageObject',
          url: imageUrl,
          width: 1200,
          height: 630,
        },
        publisher: { '@id': `${base}/#localbusiness` },
      },
    ],
  };
}
