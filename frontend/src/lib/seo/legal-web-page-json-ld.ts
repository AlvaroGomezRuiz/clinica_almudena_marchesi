import { CLINIC_PUBLIC_SITE_URL } from '@/lib/clinic';

import { LEGAL_LAST_UPDATED_ISO } from './legal-version';
import { buildBreadcrumbListNode } from './breadcrumb-jsonld';

export interface LegalWebPageJsonLdInput {
  path: string;
  name: string;
  description: string;
}

/**
 * JSON-LD WebPage + isPartOf WebSite para páginas legales indexables.
 */
export function buildLegalWebPageJsonLd(
  input: LegalWebPageJsonLdInput,
): Record<string, unknown> {
  const base = CLINIC_PUBLIC_SITE_URL.replace(/\/+$/, '');
  const path = input.path.startsWith('/') ? input.path : `/${input.path}`;
  const url = `${base}${path}`;

  const webPage = {
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: input.name,
    description: input.description,
    inLanguage: 'es-ES',
    isPartOf: {
      '@type': 'WebSite',
      '@id': `${base}/#website`,
      name: 'Clínica Almudena Marchesi',
      url: base,
    },
    about: { '@id': `${base}/#localbusiness` },
    dateModified: LEGAL_LAST_UPDATED_ISO,
    publisher: { '@id': `${base}/#localbusiness` },
  };

  const breadcrumb = [
    { name: 'Inicio', path: '/' },
    { name: input.name, path: input.path },
  ];

  return {
    '@context': 'https://schema.org',
    '@graph': [webPage, buildBreadcrumbListNode(breadcrumb)],
  };
}
