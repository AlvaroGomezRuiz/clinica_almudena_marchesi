import type { MetadataRoute } from 'next';

import { CLINIC_PUBLIC_SITE_URL } from '@/lib/clinic';

function getBaseUrl(): string {
  return CLINIC_PUBLIC_SITE_URL.replace(/\/+$/, '');
}

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl();

  const disallows = [
    '/admin',
    '/portal',
    '/dashboard',
    '/api',
    '/login',
    '/login/',
    '/auth',
    '/auth/',
    '/monitoring',
  ];

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: disallows,
      },
      { userAgent: 'GPTBot', allow: '/', disallow: disallows },
      { userAgent: 'ChatGPT-User', allow: '/', disallow: disallows },
      { userAgent: 'ClaudeBot', allow: '/', disallow: disallows },
      { userAgent: 'PerplexityBot', allow: '/', disallow: disallows },
      { userAgent: 'Google-Extended', allow: '/', disallow: disallows },
      { userAgent: 'GoogleOther', allow: '/', disallow: disallows },
      { userAgent: 'CCBot', allow: '/', disallow: disallows },
      { userAgent: 'OAI-SearchBot', allow: '/', disallow: disallows },
      { userAgent: 'Applebot-Extended', allow: '/', disallow: disallows },
      { userAgent: 'MistralBot', allow: '/', disallow: disallows },
      { userAgent: 'Amazonbot', allow: '/', disallow: disallows },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}

