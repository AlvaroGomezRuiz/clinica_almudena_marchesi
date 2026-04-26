import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Almudena Marchesi | Clínica de psicología (Moncloa, Madrid)',
    short_name: 'Almudena Marchesi',
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
        src: '/favicon.ico',
        sizes: '48x48',
        type: 'image/x-icon',
        purpose: 'any',
      },
      {
        src: '/favicon.ico',
        sizes: '48x48',
        type: 'image/x-icon',
        purpose: 'maskable',
      },
    ],
  };
}

