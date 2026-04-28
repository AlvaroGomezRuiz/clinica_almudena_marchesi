import { CLINIC_PUBLIC_SITE_URL } from '@/lib/clinic';

export interface ServicioListadoItem {
  readonly name: string;
  /** Ruta o ruta+query, p. ej. `/registro-paciente?plan=individual` */
  readonly href: string;
  readonly description: string;
}

/**
 * Nodo `ItemList` (sin `@context`) con servicios visibles en la landing.
 */
export function buildServiciosItemListNode(
  services: ReadonlyArray<ServicioListadoItem>,
): Record<string, unknown> {
  const base = CLINIC_PUBLIC_SITE_URL.replace(/\/+$/, '');

  return {
    '@type': 'ItemList',
    name: 'Servicios de terapia psicológica',
    description:
      'Modalidades ofrecidas por la clínica. Precios y disponibilidad se confirman al reservar.',
    numberOfItems: services.length,
    itemListElement: services.map((s, i) => {
      const target =
        s.href.startsWith('http://') || s.href.startsWith('https://')
          ? s.href
          : `${base}${s.href.startsWith('/') ? s.href : `/${s.href}`}`;
      return {
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'Service',
          name: s.name,
          url: target,
          description: s.description,
          provider: { '@id': `${base}/#localbusiness` },
          serviceType: 'Psychotherapy',
        },
      };
    }),
  };
}
