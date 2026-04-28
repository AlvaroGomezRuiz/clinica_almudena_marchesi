import type { Metadata } from 'next';

import { CLINIC_GEO_LAT, CLINIC_GEO_LNG, CLINIC_PUBLIC_SITE_URL, getClinicAbsoluteImageUrl } from '@/lib/clinic';

export interface BuildPublicPageMetadataParams {
  /** Ruta absoluta desde la raíz del sitio, p. ej. `/contacto` */
  path: string;
  title: string;
  description: string;
  keywords?: string[];
  /** Open Graph: páginas legales usan `article`; el resto `website`. */
  ogType?: 'website' | 'article';
  /**
   * Meta `geo.*` + ICBM para señales GEO clásicas (Bing, directorios).
   * Desactivar en páginas no locales si alguna vez se reutiliza el helper.
   */
  includeGeoHints?: boolean;
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
  /** Imagen social por defecto (misma que layout raíz); mejora previews en OG/Twitter. */
  const defaultSocialImage = getClinicAbsoluteImageUrl('/images/almudena-profile.avif');
  const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();
  const bingVerification = process.env.NEXT_PUBLIC_BING_WEBMASTER_VERIFICATION?.trim();
  const twitterSite = process.env.NEXT_PUBLIC_TWITTER_SITE?.trim();
  const ogImage = {
    url: defaultSocialImage,
    width: 1200,
    height: 630,
    alt: 'Almudena Marchesi — clínica de psicología en Moncloa, Madrid',
  } as const;

  return {
    /* Evita duplicar el sufijo del layout padre (`%s | Almudena Marchesi`). */
    title: { absolute: params.title },
    description: params.description,
    ...(params.keywords?.length ? { keywords: params.keywords } : {}),
    alternates: {
      canonical: url,
      languages: {
        'es-ES': url,
        'x-default': url,
      },
    },
    openGraph: {
      title: params.title,
      description: params.description,
      url,
      siteName: 'Clínica Almudena Marchesi',
      locale: 'es_ES',
      type: params.ogType ?? 'website',
      images: [ogImage],
    },
    twitter: {
      card: 'summary_large_image',
      title: params.title,
      description: params.description,
      images: [ogImage],
      ...(twitterSite ? { site: twitterSite } : {}),
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
    category: 'health',
    ...((() => {
      if (!googleVerification && !bingVerification) {
        return {};
      }
      return {
        verification: {
          ...(googleVerification ? { google: googleVerification } : {}),
          ...(bingVerification
            ? { other: { 'msvalidate.01': bingVerification } }
            : {}),
        },
      };
    })()),
    ...(params.includeGeoHints !== false
      ? {
          other: {
            'geo.region': 'ES-MD',
            'geo.placename': 'Madrid, Moncloa–Chamberí',
            ICBM: `${CLINIC_GEO_LAT}, ${CLINIC_GEO_LNG}`,
          },
        }
      : {}),
  };
}
