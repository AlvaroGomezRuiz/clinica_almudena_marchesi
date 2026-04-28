import { CLINIC_PUBLIC_SITE_URL } from '@/lib/clinic';

export interface BreadcrumbItem {
  readonly name: string;
  /** Ruta absoluta desde raíz, p. ej. `/servicios` */
  readonly path: string;
}

/**
 * Nodo `BreadcrumbList` (sin `@context`) para incrustarlo en un `@graph` con `WebPage`.
 */
export function buildBreadcrumbListNode(
  items: readonly BreadcrumbItem[],
): Record<string, unknown> {
  const base = CLINIC_PUBLIC_SITE_URL.replace(/\/+$/, '');
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => {
      const p = it.path.startsWith('/') ? it.path : `/${it.path}`;
      return {
        '@type': 'ListItem',
        position: i + 1,
        name: it.name,
        item: `${base}${p}`,
      };
    }),
  };
}

/**
 * JSON-LD BreadcrumbList para páginas internas públicas (rich results / GEO de sitio).
 */
export function buildBreadcrumbListJsonLd(
  items: readonly BreadcrumbItem[],
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    ...buildBreadcrumbListNode(items),
  };
}
