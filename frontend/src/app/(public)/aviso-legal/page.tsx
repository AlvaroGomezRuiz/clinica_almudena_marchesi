import type { Metadata } from 'next';

import { CLINIC_CONTACT_EMAIL, CLINIC_PUBLIC_SITE_URL } from '@/lib/clinic';

const canonicalBase = CLINIC_PUBLIC_SITE_URL.replace(/\/+$/, '');
import { buildPublicPageMetadata } from '@/lib/seo/build-public-page-metadata';
import { buildLegalWebPageJsonLd } from '@/lib/seo/legal-web-page-json-ld';
import { LEGAL_DOCUMENT_VERSION, LEGAL_LAST_UPDATED_ES } from '@/lib/seo/legal-version';

export const metadata: Metadata = buildPublicPageMetadata({
  path: '/aviso-legal',
  title: 'Aviso Legal — Almudena Marchesi Fernández, Psicóloga (Madrid)',
  description:
    'Identificación del titular, condiciones de uso del sitio ampsicologia.es y cumplimiento de la Ley 34/2002 (LSSI-CE). Clínica Almudena Marchesi.',
  keywords: [
    'aviso legal',
    'LSSI',
    'titular sitio web',
    'psicóloga Madrid',
    'ampsicologia.es',
  ],
  ogType: 'article',
  includeGeoHints: false,
});

const webPageJsonLd = buildLegalWebPageJsonLd({
  path: '/aviso-legal',
  name: 'Aviso Legal',
  description:
    'Identificación del titular del sitio web y condiciones de uso conforme a la Ley 34/2002 (LSSI-CE).',
});

export default function AvisoLegalPage() {
  return (
    <div className="bg-canvas min-h-screen pt-36 pb-24 px-6 md:px-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }}
      />
      <article className="max-w-3xl mx-auto prose-clinical">
        <header className="mb-14">
          <span className="font-mono text-label-sm uppercase tracking-[0.14em] text-sage-mid mb-4 block">
            Cumplimiento Legal
          </span>
          <h1 className="font-display text-display-1 text-ink italic mb-4 text-balance">
            Aviso Legal
          </h1>
          <p className="text-body-lg text-ink-soft leading-relaxed">
            En cumplimiento de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la
            Información y del Comercio Electrónico (LSSI-CE).
          </p>
        </header>

        <section className="space-y-10 text-ink-soft leading-relaxed">
          <div>
            <h2 className="font-display text-xl text-ink mb-4">
              1. Identificación del titular
            </h2>
            <ul className="space-y-2 text-sm">
              <li>
                <strong className="text-ink">Titular:</strong> Almudena Marchesi Fernández
              </li>
              <li>
                <strong className="text-ink">NIF:</strong> 04850571D
              </li>
              <li>
                <strong className="text-ink">Colegiación:</strong> Colegio Oficial de Psicólogos de
                Madrid, Col. M-40804
              </li>
              <li>
                <strong className="text-ink">Domicilio profesional:</strong> Calle de Meléndez Valdés 22,
                1D, 28015 Madrid, España
              </li>
              <li>
                <strong className="text-ink">Correo electrónico:</strong>{' '}
                <a className="text-sage underline underline-offset-2" href={`mailto:${CLINIC_CONTACT_EMAIL}`}>
                  {CLINIC_CONTACT_EMAIL}
                </a>
              </li>
              <li>
                <strong className="text-ink">Actividad:</strong> Servicios de psicología clínica y
                sanitaria (titulación PGS, máster habilitante)
              </li>
              <li>
                <strong className="text-ink">Sitio web:</strong>{' '}
                <a
                  className="text-sage underline underline-offset-2"
                  href={canonicalBase}
                  rel="noopener noreferrer"
                >
                  {canonicalBase.replace(/^https:\/\//, '')}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-xl text-ink mb-4">
              2. Objeto y ámbito de aplicación
            </h2>
            <p>
              El presente aviso legal regula el uso del sitio web y de los servicios profesionales de
              psicología ofrecidos por Almudena Marchesi Fernández (en adelante, «la Profesional»).
              El acceso y la utilización de este sitio web atribuye la condición de usuario e implica la
              aceptación plena de todas las condiciones incluidas en este aviso legal.
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl text-ink mb-4">
              3. Propiedad intelectual e industrial
            </h2>
            <p>
              Todos los contenidos de este sitio web, incluyendo textos, fotografías, gráficos, imágenes,
              iconos, tecnología, software, así como su diseño gráfico y códigos fuente, son propiedad
              intelectual de la Profesional o de terceros que han autorizado su uso, sin que puedan entenderse
              cedidos al usuario ninguno de los derechos de explotación sobre los mismos más allá de lo
              estrictamente necesario para el correcto uso del sitio web.
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl text-ink mb-4">
              4. Limitación de responsabilidad
            </h2>
            <p>
              La Profesional no se hace responsable de los posibles daños o perjuicios que se pudieran derivar
              de interferencias, omisiones, interrupciones, virus informáticos, averías telefónicas o
              desconexiones en el funcionamiento operativo de este sistema electrónico. Asimismo, la
              Profesional no se hace responsable de retrasos o bloqueos en el uso causados por deficiencias o
              sobrecargas en los servidores de Internet o en otros sistemas electrónicos.
            </p>
            <p className="mt-3">
              Los contenidos informativos del sitio no sustituyen la valoración clínica individualizada ni
              constituyen diagnóstico o tratamiento; la relación terapéutica se establece en la consulta
              conforme a la normativa sanitaria aplicable.
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl text-ink mb-4">
              5. Legislación aplicable y jurisdicción
            </h2>
            <p>
              Las relaciones entre la Profesional y el usuario se regirán por la normativa española vigente,
              siendo competentes para la resolución de cualquier controversia los Juzgados y Tribunales de la
              ciudad de Madrid, salvo que la ley aplicable disponga otra cosa.
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
