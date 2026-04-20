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

module.exports = nextConfig;
