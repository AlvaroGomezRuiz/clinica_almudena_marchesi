/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  /* Habilita compresión Gzip/Brotli en el servidor Next.js */
  compress: true,

  /* Deshabilita source maps en producción (seguridad) */
  productionBrowserSourceMaps: false,

  images: {
    /* AVIF primero (≈40% más pequeño que WebP), WebP como fallback */
    formats: ['image/avif', 'image/webp'],
    /* Cache de 1 año para imágenes optimizadas — evita re-procesar en cada CDN hit */
    minimumCacheTTL: 31536000,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
        pathname: '/**',
      },
    ],
  },

  experimental: {
    // optimizeCss está deshabilitado permanentemente. La versión actual de 'critters'
    // rompe el purgado de estilos en Tailwind y provoca pantallas blancas en Vercel.
    // optimizeCss: false,
  },

  // ─── CABECERAS DE SEGURIDAD DE NIVEL BANCARIO ───
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // HSTS: 2 años, incluye subdominios, preload-ready
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          // Prevenir clickjacking
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // Prevenir MIME-type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Controlar referrer leaks
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Bloquear APIs sensibles del navegador
          {
            key: 'Permissions-Policy',
            value:
              'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()',
          },
          {
            key: 'Content-Security-Policy',
            value: "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com https://vercel.live; connect-src 'self' https://vitals.vercel-insights.com https://vercel.live https://*.ingest.de.sentry.io https://*.ingest.sentry.io; worker-src 'self' blob:;",
          },
          // Prevenir XSS (legacy browsers)
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // No exponer el servidor
          {
            key: 'X-Powered-By',
            value: '',
          },
          // Cross-Origin isolation (Relajado para Vercel Edge Network)
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          }
        ],
      },
    ];
  },

  // ─── REDIRECCIONES ───
  async redirects() {
    return [
      {
        source: '/register',
        destination: '/registro-paciente',
        permanent: true,
      },
    ];
  },
};

// ─── SENTRY ───
// withSentryConfig envuelve el config de Next para: (1) subir source maps en
// build a Sentry (si hay AUTH_TOKEN), (2) tunnelar eventos para saltar ad-blockers,
// (3) tree-shake los imports de Sentry en client.
const { withSentryConfig } = require('@sentry/nextjs');

module.exports = withSentryConfig(nextConfig, {
  // Org/project — relleno opcional; sin AUTH_TOKEN solo se usan para el tunnel.
  org: process.env.SENTRY_ORG || undefined,
  project: process.env.SENTRY_PROJECT || undefined,

  // Silenciar logs de build en local. En CI Vercel los deja visibles.
  silent: !process.env.CI,

  // Upload de source maps: solo si Vercel tiene el token configurado.
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Tunnel: enmascara peticiones Sentry detrás de nuestro dominio → evade
  // ad-blockers y ofusca el DSN. Ruta dedicada /monitoring.
  tunnelRoute: '/monitoring',

  // No adjuntar stacktraces de node_modules (ruido y riesgo de leak de código).
  widenClientFileUpload: false,

  // Deshabilitar telemetría de Sentry Next.js (no les mandamos build data).
  telemetry: false,

  // No subir source maps si no hay AUTH_TOKEN (evita errores en build local).
  disableLogger: true,

  // Seguridad: borrar los source maps después de subirlos a Sentry. Así no
  // quedan expuestos en el dominio público (evita reverse engineering).
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
});
