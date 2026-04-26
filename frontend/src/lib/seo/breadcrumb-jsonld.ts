import { CLINIC_PUBLIC_SITE_URL } from '@/lib/clinic';

export interface BreadcrumbItem {
  readonly name: string;
  /** Ruta absoluta desde raíz, p. ej. `/servicios` */
  readonly path: string;
}

/**
 * JSON-LD BreadcrumbList para páginas internas públicas (rich results / GEO de sitio).
 */
export function buildBreadcrumbListJsonLd(
  items: readonly BreadcrumbItem[],
): Record<string, unknown> {
  const base = CLINIC_PUBLIC_SITE_URL.replace(/\/+$/, '');
  return {
    '@context': 'https://schema.org',
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
