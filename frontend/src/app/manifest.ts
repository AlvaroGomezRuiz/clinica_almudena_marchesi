import { CLINIC_PUBLIC_SITE_HOST_LABEL } from '@/lib/clinic';

import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `AM Psicología — Moncloa, Madrid | ${CLINIC_PUBLIC_SITE_HOST_LABEL}`,
    short_name: CLINIC_PUBLIC_SITE_HOST_LABEL,
    description:
      'Clínica de psicología clínica en Moncloa y Chamberí, Madrid. Acompañamiento con rigor basado en evidencia.',
    start_url: '/',
    display: 'browser',
    background_color: '#fcfbf9',
    theme_color: '#fcfbf9',
    lang: 'es',
    categories: ['health', 'medical', 'lifestyle'],
    orientation: 'any',
    icons: [
      {
        src: '/logotype/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/logotype/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/logotype/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}

