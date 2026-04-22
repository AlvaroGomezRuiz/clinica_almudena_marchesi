import type { Metadata } from 'next';

import { CLINIC_PUBLIC_SITE_URL } from '@/lib/clinic';

export interface BuildPublicPageMetadataParams {
  /** Ruta absoluta desde la raíz del sitio, p. ej. `/contacto` */
  path: string;
  title: string;
  description: string;
  keywords?: string[];
  /** Open Graph: páginas legales usan `article`; el resto `website`. */
  ogType?: 'website' | 'article';
}

/**
 * Metadata homogénea para páginas públicas indexables: canonical, Open Graph,
 * Twitter y robots coherentes con la guía técnica del proyecto.
 */
export function buildPublicPageMetadata(
  params: BuildPublicPageMetadataParams,
): Metadata {
  const base = CLINIC_PUBLIC_SITE_URL.replace(/\/+$/, '');
  const path = params.path.startsWith('/') ? params.path : `/${params.path}`;
  const url = `${base}${path}`;

  return {
    /* Evita duplicar el sufijo del layout padre (`%s | Almudena Marchesi`). */
    title: { absolute: params.title },
    description: params.description,
    ...(params.keywords?.length ? { keywords: params.keywords } : {}),
    alternates: {
      canonical: url,
      languages: {
        'es-ES': url,
      },
    },
    openGraph: {
      title: params.title,
      description: params.description,
      url,
      siteName: 'Clínica Almudena Marchesi',
      locale: 'es_ES',
      type: params.ogType ?? 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: params.title,
      description: params.description,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}
