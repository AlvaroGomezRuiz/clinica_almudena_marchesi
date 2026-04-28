import type { ClinicFaqItem } from '@/lib/seo/clinic-faq-content';

/**
 * JSON-LD `FAQPage` (schema.org) alineado con el texto visible en la página.
 * Google exige coherencia entre el marcado y el contenido renderizado.
 */
export function buildFaqPageJsonLd(
  items: ReadonlyArray<ClinicFaqItem>,
  pageUrl: string
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    url: pageUrl,
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}
