import type { MetadataRoute } from 'next';

function getBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.SITE_URL ??
    'http://localhost:3000';
  return raw.replace(/\/+$/, '');
}

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl();

  return {
    rules: [
      // Bots de indexación/citación (permitir contenido público)
      { userAgent: '*', allow: '/', disallow: ['/admin', '/portal', '/dashboard', '/api'] },
      { userAgent: 'GPTBot', allow: '/', disallow: ['/admin', '/portal', '/dashboard', '/api'] },
      { userAgent: 'ChatGPT-User', allow: '/', disallow: ['/admin', '/portal', '/dashboard', '/api'] },
      { userAgent: 'ClaudeBot', allow: '/', disallow: ['/admin', '/portal', '/dashboard', '/api'] },
      { userAgent: 'PerplexityBot', allow: '/', disallow: ['/admin', '/portal', '/dashboard', '/api'] },
      { userAgent: 'Google-Extended', allow: '/', disallow: ['/admin', '/portal', '/dashboard', '/api'] },
      { userAgent: 'CCBot', allow: '/', disallow: ['/admin', '/portal', '/dashboard', '/api'] },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}

