import type { Metadata } from 'next';

import { CLINIC_CONTACT_EMAIL } from '@/lib/clinic';

export const metadata: Metadata = {
  title: 'Aviso Legal — Almudena Marchesi Fernández, Psicóloga',
  description:
    'Información legal, identificación del titular del sitio web y condiciones de uso del servicio de psicología de Almudena Marchesi Fernández.',
};

export default function AvisoLegalPage() {
  return (
    <div className="bg-canvas min-h-screen pt-36 pb-24 px-6 md:px-12">
      <article className="max-w-3xl mx-auto prose-clinical">
        <header className="mb-14">
          <span className="font-mono text-label-sm uppercase tracking-[0.14em] text-sage-mid mb-4 block">
            Cumplimiento Legal
          </span>
          <h1 className="font-display text-display-1 text-ink italic mb-4 text-balance">
            Aviso Legal
          </h1>
          <p className="text-body-lg text-ink-soft leading-relaxed">
            En cumplimiento de la Ley 34/2002, de 11 de julio, de Servicios de la
            Sociedad de la Información y del Comercio Electrónico (LSSI-CE).
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
                  href="https://amclinicapsicologia.es"
                  rel="noopener noreferrer"
                >
                  amclinicapsicologia.es
                </a>{' '}
                (dominio en proceso de registro; hasta entonces el acceso puede ser la URL de
                preproducción en Vercel)
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-xl text-ink mb-4">
              2. Objeto y ámbito de aplicación
            </h2>
            <p>
              El presente aviso legal regula el uso del sitio web y de los servicios profesionales de
              psicología ofrecidos por Almudena Marchesi Fernández (en adelante, &ldquo;la Profesional&rdquo;).
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
              Última actualización: 19 de abril de 2026
            </p>
          </div>
        </section>
      </article>
    </div>
  );
}

