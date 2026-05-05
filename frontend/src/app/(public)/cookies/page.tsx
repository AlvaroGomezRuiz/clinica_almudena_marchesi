import type { Metadata } from 'next';

import { CLINIC_CONTACT_EMAIL, CLINIC_PUBLIC_SITE_HOST_LABEL } from '@/lib/clinic';
import { buildPublicPageMetadata } from '@/lib/seo/build-public-page-metadata';
import { buildLegalWebPageJsonLd } from '@/lib/seo/legal-web-page-json-ld';
import { LEGAL_DOCUMENT_VERSION, LEGAL_LAST_UPDATED_ES } from '@/lib/seo/legal-version';

export const metadata: Metadata = buildPublicPageMetadata({
  path: '/cookies',
  title: `Política de Cookies — RGPD (Madrid) | ${CLINIC_PUBLIC_SITE_HOST_LABEL}`,
  description:
    'Información sobre cookies técnicas, analíticas y de marketing en ampsicologia.es. Gestión transparente con Consent Mode v2 y cumplimiento RGPD.',
  keywords: ['cookies', 'política cookies', 'LSSI', 'sesión segura', 'ampsicologia.es'],
  ogType: 'article',
  includeGeoHints: false,
});

const webPageJsonLd = buildLegalWebPageJsonLd({
  path: '/cookies',
  name: 'Política de Cookies',
  description:
    'Información sobre cookies técnicas utilizadas en el sitio web del consultorio de psicología.',
});

export default function CookiesPage() {
  return (
    <div className="bg-canvas min-h-screen pt-36 pb-24 px-6 md:px-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }}
      />
      <article className="max-w-3xl mx-auto prose-clinical">
        <header className="mb-14">
          <span className="font-mono text-label-sm uppercase tracking-[0.14em] text-sage-mid mb-4 block">
            Cumplimiento LSSI-CE
          </span>
          <h1 className="font-display text-display-1 text-ink italic mb-4 text-balance">
            Política de Cookies
          </h1>
          <p className="text-body-lg text-ink-soft leading-relaxed">
            Este sitio utiliza cookies estrictamente necesarias para la seguridad y el funcionamiento del
            servicio. Además, con su consentimiento explícito, empleamos cookies analíticas y de marketing 
            (Google Analytics) gestionadas de forma respetuosa mediante el Modo de Consentimiento (Consent Mode v2).
          </p>
        </header>

        <section className="space-y-10 text-ink-soft leading-relaxed">
          <div>
            <h2 className="font-display text-xl text-ink mb-4">
              1. ¿Qué son las cookies?
            </h2>
            <p>
              Las cookies son pequeños archivos que el sitio puede almacenar en su dispositivo para mantener
              una sesión segura, recordar preferencias básicas o permitir la protección frente a abusos
              (CSRF). Su uso aquí se limita a fines técnicos alineados con la normativa europea de
              privacidad electrónica y el RGPD.
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl text-ink mb-4">
              2. Cookies que utilizamos
            </h2>
            <p className="mb-4">
              Se emplean cookies <strong className="text-ink">técnicas y de sesión</strong>, necesarias para el funcionamiento, y cookies de <strong className="text-ink">terceros (analítica y marketing)</strong> sujetas a su consentimiento:
            </p>

            <div className="overflow-x-auto rounded-apple border border-line">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-canvas-alt border-b border-line">
                    <th className="text-left px-4 py-3 font-mono text-label-sm uppercase tracking-wider text-sage-mid font-medium">
                      Cookie / grupo
                    </th>
                    <th className="text-left px-4 py-3 font-mono text-label-sm uppercase tracking-wider text-sage-mid font-medium">
                      Tipo
                    </th>
                    <th className="text-left px-4 py-3 font-mono text-label-sm uppercase tracking-wider text-sage-mid font-medium">
                      Duración
                    </th>
                    <th className="text-left px-4 py-3 font-mono text-label-sm uppercase tracking-wider text-sage-mid font-medium">
                      Finalidad
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  <tr>
                    <td className="px-4 py-3 font-mono text-xs text-ink">
                      sb-&lt;ref&gt;-auth-token (fragmentos)
                    </td>
                    <td className="px-4 py-3">Técnica / necesaria</td>
                    <td className="px-4 py-3">Sesión / renovación automática</td>
                    <td className="px-4 py-3">
                      Sesión Supabase Auth (JWT): autenticación con
                      cookies <strong className="text-ink">HttpOnly</strong>,{' '}
                      <strong className="text-ink">Secure</strong> en producción y{' '}
                      <strong className="text-ink">SameSite=Lax</strong>. Estos atributos impiden que
                      scripts externos o sitios de terceros accedan al contenido de la cookie.
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono text-xs text-ink">
                      Preferencias de tema (localStorage)
                    </td>
                    <td className="px-4 py-3">Técnica / funcional</td>
                    <td className="px-4 py-3">Persistente local</td>
                    <td className="px-4 py-3">
                      Almacenamiento local para recordar modo claro u oscuro. No se envía a ningún
                      servidor ni se comparte con terceros.
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono text-xs text-ink">
                      __stripe_mid / __stripe_sid
                    </td>
                    <td className="px-4 py-3">Técnica / necesaria</td>
                    <td className="px-4 py-3">Sesión / 1 año</td>
                    <td className="px-4 py-3">
                      Cookies establecidas por Stripe durante el proceso de pago para la prevención
                      de fraude y la seguridad de la transacción. Solo se activan en las páginas de pago.
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono text-xs text-ink">
                      _ga / _ga_*
                    </td>
                    <td className="px-4 py-3">Analítica / Marketing (Google)</td>
                    <td className="px-4 py-3">Hasta 2 años</td>
                    <td className="px-4 py-3">
                      Se usan para distinguir usuarios únicos y generar datos estadísticos anónimos sobre cómo 
                      utilizan el sitio web (Google Analytics). Solo se instalan si usted hace clic en &quot;Aceptar&quot;.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h2 className="font-display text-xl text-ink mb-4">
              3. Mediciones de rendimiento y estabilidad
            </h2>
            <p>
              La plataforma utiliza Sentry para la monitorización de errores técnicos. Sentry recibe
              únicamente datos de errores de la aplicación (trazas de ejecución, versión del navegador)
              y <strong className="text-ink">no instala cookies de seguimiento</strong>. Además, los datos
              personales se eliminan automáticamente antes del envío a Sentry (scrubbing de PII).
            </p>
            <p className="mt-3">
              El alojamiento (Vercel) puede registrar métricas agregadas de rendimiento y fiabilidad
              (tiempos de respuesta, tasas de error) conforme a su documentación, sin cookies de
              publicidad ni segmentación de audiencias.
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl text-ink mb-4">
              4. Analítica y Modo de Consentimiento
            </h2>
            <p>
              Utilizamos Google Analytics para medir el tráfico y mejorar la web. Para garantizar su privacidad,
              hemos implementado el <strong>Modo de Consentimiento (Consent Mode v2)</strong> de Google. 
              Esto significa que, por defecto, toda la recopilación de datos está bloqueada. Google Analytics 
              solo instala cookies en su dispositivo y recopila información si usted interactúa con el banner de 
              cookies y otorga su consentimiento explícito.
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl text-ink mb-4">
              5. Gestión de cookies y revocación
            </h2>
            <p>
              En cualquier momento, usted puede cambiar de opinión y revocar su consentimiento. Para ello, 
              simplemente haga clic en el enlace <strong>&quot;Configurar Cookies&quot;</strong> situado en la parte inferior 
              (pie de página) de nuestra web. Esto abrirá nuevamente el panel de preferencias donde podrá desactivar 
              las cookies analíticas o de marketing al instante.
            </p>
            <p className="mt-3">
              Adicionalmente, puede configurar su navegador para rechazar todas las cookies por defecto:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-sm mt-2">
              <li>
                <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-sage underline underline-offset-2">
                  Google Chrome
                </a>
              </li>
              <li>
                <a href="https://support.mozilla.org/es/kb/Borrar%20cookies" target="_blank" rel="noopener noreferrer" className="text-sage underline underline-offset-2">
                  Mozilla Firefox
                </a>
              </li>
              <li>
                <a href="https://support.apple.com/es-es/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-sage underline underline-offset-2">
                  Apple Safari
                </a>
              </li>
              <li>
                <a href="https://support.microsoft.com/es-es/microsoft-edge/eliminar-cookies-en-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer" className="text-sage underline underline-offset-2">
                  Microsoft Edge
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-xl text-ink mb-4">6. Contacto</h2>
            <p>
              Para cualquier consulta sobre esta política de cookies, puede contactar con Almudena Marchesi
              Fernández en{' '}
              <strong className="text-ink">{CLINIC_CONTACT_EMAIL}</strong>.
            </p>
          </div>

          <div className="pt-8 border-t border-line">
            <p className="font-mono text-label-sm text-sage-mid">
              Versión {LEGAL_DOCUMENT_VERSION} · Última actualización: {LEGAL_LAST_UPDATED_ES}
            </p>
          </div>
        </section>
      </article>
    </div>
  );
}
