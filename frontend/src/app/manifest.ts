import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Almudena Marchesi | Psicología Clínica',
    short_name: 'Almudena Marchesi',
    description:
      'Psicología clínica en Moncloa, Madrid. Acompañamiento profesional basado en evidencia.',
    start_url: '/',
    display: 'browser',
    background_color: '#fcfbf9',
    theme_color: '#fcfbf9',
    icons: [
      {
        src: '/favicon.ico',
        sizes: '48x48',
        type: 'image/x-icon',
      },
    ],
  };
}

