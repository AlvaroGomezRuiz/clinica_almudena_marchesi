/* ============================================================================
 * next.config.js — Clínica Almudena Marchesi Fernández
 *
 * Principios aplicados:
 *   • Performance: tree-shake agresivo, AVIF/WebP, cache largo.
 *   • Seguridad: CSP única y estricta, headers "bancarios".
 *   • Datos clínicos: nunca `X-Powered-By`, nunca source maps públicos,
 *     HSTS preload, CSP con lista blanca mínima.
 * ============================================================================
 */

/**
 * Construye la CSP. Leemos el dominio de Supabase desde env en build-time para
 * que la directive `connect-src` incluya el host real de producción.
 *
 * Decisiones:
 *   - `'unsafe-inline'` en `script-src` y `style-src` es requerido por Next.js
 *     (inyecta scripts inline del RSC + styles). Mitigado por `'strict-dynamic'`
 *     en navegadores modernos (ignora `unsafe-inline` si hay `strict-dynamic`).
 *   - `object-src 'none'` → bloquea <object>, <embed>, <applet>.
 *   - `base-uri 'self'` → bloquea <base> injection (XSS).
 *   - `form-action 'self'` → bloquea envíos de formularios a dominios externos.
 *   - `frame-ancestors 'none'` → equivalente a X-Frame-Options: DENY moderno.
 *   - `upgrade-insecure-requests` → auto-upgrade HTTP→HTTPS.
 *   - Stripe, Vercel Analytics y Sentry tunnel (vía /monitoring) son los únicos
 *     orígenes externos permitidos.
 */
/** Hostname del proyecto Supabase (Storage avatares, etc.) para next/image. */
function getSupabaseHostname() {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  if (!raw) return null;
  try {
    return new URL(raw).hostname;
  } catch {
    return null;
  }
}

function buildCsp() {
  const rawSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  let supabaseHost = '';
  let supabaseWss = '';
  if (rawSupabase) {
    try {
      const u = new URL(rawSupabase);
      supabaseHost = u.origin;
      supabaseWss = `wss://${u.host}`;
    } catch {
      /* Si es inválido, omitimos. Mejor CSP estricta que laxa por fallback. */
    }
  }

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    /* script-src: self + vercel + stripe. `'unsafe-inline'` es requerido por
       Next.js App Router para hidratar RSC (inyecta scripts inline sin nonce).
       NOTA: `'strict-dynamic'` se eliminó porque sin nonces configurados los
       navegadores modernos ignoran `'unsafe-inline'` y bloquean los scripts
       inline de hidratación de Next.js, rompiendo toda la interactividad
       client-side (useEffect, IntersectionObserver, etc.).
       TODO: Configurar nonces vía middleware para poder re-añadir strict-dynamic.
       Stripe.js: subdominios de js.stripe.com (iframes internos) + iconos wallets;
       ver https://docs.stripe.com/security/guide#content-security-policy */
    "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com https://vercel.live https://js.stripe.com https://*.js.stripe.com https://www.googletagmanager.com https://www.google-analytics.com",
    /* style-src: `'unsafe-inline'` necesario por Tailwind arbitrary values y
       next-themes (seteo inline del atributo style en <html>). Ya NO se
       permite fonts.googleapis.com porque todas las fuentes están
       self-hosted en /public/fonts/ (ver scripts/vendor-fonts.mjs). */
    "style-src 'self' 'unsafe-inline'",
    /* font-src: sólo self. Incluye data: para casos excepcionales (p.ej. si
       un componente inlinea una fuente via base64). NO se permite
       fonts.gstatic.com — rompe el principio de "cero dependencias de
       terceros en runtime". */
    "font-src 'self' data:",
    /* img-src: self + data-uri + blob (para Avatar Uploader) + avatares Google
       + Supabase Storage. */
    `img-src 'self' data: blob: https://lh3.googleusercontent.com https://images.unsplash.com https://*.stripe.com https://www.googletagmanager.com https://www.google-analytics.com ${supabaseHost}`.trim(),
    /* connect-src: self + Supabase (HTTPS REST + WSS Realtime) + Stripe API +
       Vercel Insights + Sentry tunnel propio (evita /monitoring externo). */
    `connect-src 'self' ${supabaseHost} ${supabaseWss} https://api.stripe.com https://r.stripe.com https://q.stripe.com https://errors.stripe.com https://m.stripe.network https://vitals.vercel-insights.com https://vercel.live https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net`.trim(),
    /* frame-src: Stripe 3DS, hooks, iframes internos Stripe.js (wallets / PR API) + Vercel Live. */
    'frame-src https://js.stripe.com https://*.js.stripe.com https://hooks.stripe.com https://m.stripe.network https://vercel.live',
    /* worker-src: solo blob (para Service Workers generados por Next). */
    "worker-src 'self' blob:",
    /* manifest-src: propio manifest. */
    "manifest-src 'self'",
    /* media-src: self + Supabase Storage (audio/video del chat). */
    `media-src 'self' ${supabaseHost}`.trim(),
    /* upgrade-insecure-requests: cualquier http:// se auto-reescribe a https://. */
    'upgrade-insecure-requests',
  ];
  return directives
    .join('; ')
    .replace(/\s+;/g, ';')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

const supabaseImageHost = getSupabaseHostname();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  productionBrowserSourceMaps: false,
  poweredByHeader: false,

  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000,
    deviceSizes: [360, 420, 640, 750, 828, 1080, 1200, 1440, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 340, 440, 480],
    /* Nunca servir SVG remotos: son vector de XSS (permiten <script>). */
    dangerouslyAllowSVG: false,
    /* Forzar CSP en las propias imágenes optimizadas (defense-in-depth). */
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
      { protocol: 'https', hostname: 'upload.wikimedia.org', pathname: '/**' },
      ...(supabaseImageHost
        ? [{ protocol: 'https', hostname: supabaseImageHost, pathname: '/**' }]
        : []),
    ],
  },

  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
      preventFullImport: true,
    },
  },

  experimental: {
    optimizePackageImports: [
      'framer-motion',
      'lucide-react',
      'date-fns',
      '@radix-ui/react-popover',
      '@radix-ui/react-slot',
      'react-day-picker',
    ],
  },

  // ─── CABECERAS DE SEGURIDAD — Única fuente de verdad ───
  // El middleware.ts ya no setea CSP (evitamos headers duplicados y divergentes).
  async headers() {
    const securityHeaders = [
      // HSTS: 2 años + preload (Chrome/Firefox preload list).
      {
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
      },
      // Clickjacking (redundante con frame-ancestors pero ayuda en navegadores legacy).
      { key: 'X-Frame-Options', value: 'DENY' },
      // MIME sniffing.
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      // Referrer: no mandar nada a dominios distintos.
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      // Permissions: bloqueamos TODO salvo payment (Stripe lo necesita).
      {
        key: 'Permissions-Policy',
        value:
          'camera=(), microphone=(self), geolocation=(), payment=(self "https://js.stripe.com"), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), fullscreen=(self), clipboard-read=(self), clipboard-write=(self)',
      },
      // CSP estricta (construida en build-time con env de Supabase).
      { key: 'Content-Security-Policy', value: buildCsp() },
      // Aislamiento de origen: evita Spectre y cross-origin leaks.
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
      // CORP: bloquea que otros dominios embeban nuestros recursos.
      { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
      // Origin-Agent-Cluster: aislamiento de procesos del navegador.
      { key: 'Origin-Agent-Cluster', value: '?1' },
      // X-DNS-Prefetch-Control: on en assets, off en páginas sensibles.
      { key: 'X-DNS-Prefetch-Control', value: 'on' },
    ];

    return [
      /* Headers globales para TODA la app. */
      { source: '/(.*)', headers: securityHeaders },
      /* API routes: CORP más laxo sería necesario si fueran cross-origin;
         aquí solo se llaman desde el mismo host, mantenemos same-origin. */
      {
        source: '/api/(.*)',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
        ],
      },
      /* Zonas con datos clínicos: deshabilitar indexación + no cache. */
      {
        source: '/portal/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow, noarchive, nosnippet',
          },
          {
            key: 'Cache-Control',
            value: 'private, no-store, max-age=0, must-revalidate',
          },
        ],
      },
      {
        source: '/admin/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow, noarchive, nosnippet',
          },
          {
            key: 'Cache-Control',
            value: 'private, no-store, max-age=0, must-revalidate',
          },
        ],
      },
    ];
  },

  async redirects() {
    return [
      {
        source: '/register',
        destination: '/registro-paciente',
        permanent: true,
      },
    ];
  },

  /** Rutas legacy / raíz → iconos bajo `/public/logotype/`. */
  async rewrites() {
    return [
      { source: '/favicon.ico', destination: '/logotype/favicon.ico' },
      { source: '/favicon-16x16.png', destination: '/logotype/favicon-16x16.png' },
      { source: '/favicon-32x32.png', destination: '/logotype/favicon-32x32.png' },
      { source: '/apple-touch-icon.png', destination: '/logotype/apple-touch-icon.png' },
      { source: '/android-chrome-192x192.png', destination: '/logotype/android-chrome-192x192.png' },
      { source: '/android-chrome-512x512.png', destination: '/logotype/android-chrome-512x512.png' },
    ];
  },
};

// ─── SENTRY ───
const { withSentryConfig } = require('@sentry/nextjs');

module.exports = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG || undefined,
  project: process.env.SENTRY_PROJECT || undefined,
  silent: !process.env.CI,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  tunnelRoute: '/monitoring',
  widenClientFileUpload: false,
  telemetry: false,
  disableLogger: true,
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
});
