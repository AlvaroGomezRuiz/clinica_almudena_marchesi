import { CLINIC_PUBLIC_SITE_URL, getClinicAbsoluteImageUrl } from '@/lib/clinic';

import type { BreadcrumbItem } from './breadcrumb-jsonld';
import { buildBreadcrumbListNode } from './breadcrumb-jsonld';
import { buildServiciosItemListNode, type ServicioListadoItem } from './servicios-itemlist-json-ld';

/**
 * `/servicios`: `WebPage` + `BreadcrumbList` + `ItemList` en un único JSON-LD.
 */
export function buildServiciosPageSeoJsonLd(input: {
  pageName: string;
  pageDescription: string;
  path: string;
  breadcrumb: readonly BreadcrumbItem[];
  services: ReadonlyArray<ServicioListadoItem>;
}): Record<string, unknown> {
  const base = CLINIC_PUBLIC_SITE_URL.replace(/\/+$/, '');
  const path = input.path.startsWith('/') ? input.path : `/${input.path}`;
  const url = `${base}${path}`;
  const imageUrl = getClinicAbsoluteImageUrl('/images/almudena-profile.avif');

  const webPage: Record<string, unknown> = {
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: input.pageName,
    description: input.pageDescription,
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
    mainEntity: { '@id': `${url}#itemlist-servicios` },
  };

  const itemList = {
    ...buildServiciosItemListNode(input.services),
    '@id': `${url}#itemlist-servicios`,
  };

  return {
    '@context': 'https://schema.org',
    '@graph': [webPage, buildBreadcrumbListNode(input.breadcrumb), itemList],
  };
}

export type { ServicioListadoItem };
