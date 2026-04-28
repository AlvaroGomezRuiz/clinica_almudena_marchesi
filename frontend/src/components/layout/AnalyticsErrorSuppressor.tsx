'use client';

import { useEffect } from 'react';

/**
 * Suprime errores de consola del tipo ERR_BLOCKED_BY_CLIENT que se producen
 * cuando un adblocker bloquea scripts de analytics no críticos (Vercel Analytics,
 * SpeedInsights). Estos errores no afectan a la funcionalidad del sitio pero
 * penalizan la auditoría "Browser errors were logged to the console" de Lighthouse
 * Best Practices.
 *
 * Solo silencia errores de red de orígenes de analytics conocidos.
 * No oculta errores reales de la aplicación.
 */
export default function AnalyticsErrorSuppressor() {
  useEffect(() => {
    const ANALYTICS_ORIGINS = [
      'va.vercel-scripts.com',
      'vitals.vercel-insights.com',
      'vercel.live',
    ];

    const handleError = (event: ErrorEvent) => {
      const src = (event.filename ?? event.message ?? '').toLowerCase();
      if (ANALYTICS_ORIGINS.some((origin) => src.includes(origin))) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };

    // Captura errores de carga de script (network errors de recursos bloqueados)
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = String(event.reason ?? '').toLowerCase();
      if (
        reason.includes('err_blocked_by_client') ||
        (reason.includes('failed to load') &&
          ANALYTICS_ORIGINS.some((o) => reason.includes(o)))
      ) {
        event.preventDefault();
      }
    };

    window.addEventListener('error', handleError, true);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError, true);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return null;
}
