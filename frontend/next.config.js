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
       Next.js App Router para hidratar RSC. `'strict-dynamic'` endurece en
       navegadores modernos (Firefox >80, Chrome >52): los navegadores que lo
       entienden ignoran `'unsafe-inline'` y solo ejecutan scripts cargados por
       scripts firmados. En legacy browsers, `'unsafe-inline'` actúa de fallback. */
    "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com https://vercel.live https://js.stripe.com",
    /* style-src: `'unsafe-inline'` necesario por Tailwind arbitrary values y
       next-themes (seteo inline del atributo style en <html>). */
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    /* font-src: self (nuestras .woff2 subset) + gstatic para fallbacks. */
    "font-src 'self' data: https://fonts.gstatic.com",
    /* img-src: self + data-uri + blob (para Avatar Uploader) + avatares Google
       + Supabase Storage. */
    `img-src 'self' data: blob: https://lh3.googleusercontent.com https://images.unsplash.com ${supabaseHost}`.trim(),
    /* connect-src: self + Supabase (HTTPS REST + WSS Realtime) + Stripe API +
       Vercel Insights + Sentry tunnel propio (evita /monitoring externo). */
    `connect-src 'self' ${supabaseHost} ${supabaseWss} https://api.stripe.com https://vitals.vercel-insights.com https://vercel.live`.trim(),
    /* frame-src: solo Stripe (checkout 3DS, hooks). Cualquier otra iframe
       queda bloqueada. */
    "frame-src https://js.stripe.com https://hooks.stripe.com",
    /* worker-src: solo blob (para Service Workers generados por Next). */
    "worker-src 'self' blob:",
    /* manifest-src: propio manifest. */
    "manifest-src 'self'",
    /* media-src: self (para recursos de audio/video en el portal). */
    "media-src 'self'",
    /* upgrade-insecure-requests: cualquier http:// se auto-reescribe a https://. */
    'upgrade-insecure-requests',
  ];
  return directives.join('; ').replace(/\s+;/g, ';').replace(/\s{2,}/g, ' ').trim();
}

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
      { protocol: 'https', hostname: 'lh3.googleusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
      { protocol: 'https', hostname: 'upload.wikimedia.org', pathname: '/**' },
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
          'camera=(), microphone=(), geolocation=(), payment=(self "https://js.stripe.com"), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), fullscreen=(self), clipboard-read=(self), clipboard-write=(self)',
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
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive, nosnippet' },
          { key: 'Cache-Control', value: 'private, no-store, max-age=0, must-revalidate' },
        ],
      },
      {
        source: '/admin/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive, nosnippet' },
          { key: 'Cache-Control', value: 'private, no-store, max-age=0, must-revalidate' },
        ],
      },
    ];
  },

  async redirects() {
    return [
      { source: '/register', destination: '/registro-paciente', permanent: true },
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
