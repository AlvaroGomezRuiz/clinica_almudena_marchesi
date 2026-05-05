import type { Metadata } from 'next';

import { CLINIC_CONTACT_EMAIL, CLINIC_PUBLIC_SITE_HOST_LABEL, CLINIC_PUBLIC_SITE_URL } from '@/lib/clinic';

const canonicalBase = CLINIC_PUBLIC_SITE_URL.replace(/\/+$/, '');
import { buildPublicPageMetadata } from '@/lib/seo/build-public-page-metadata';
import { buildLegalWebPageJsonLd } from '@/lib/seo/legal-web-page-json-ld';
import { LEGAL_DOCUMENT_VERSION, LEGAL_LAST_UPDATED_ES } from '@/lib/seo/legal-version';

export const metadata: Metadata = buildPublicPageMetadata({
  path: '/aviso-legal',
  title: `Aviso Legal — LSSI, titular y condiciones de uso | ${CLINIC_PUBLIC_SITE_HOST_LABEL}`,
  description:
    'Identificación del titular, condiciones de uso del sitio ampsicologia.es, política de cancelación y cumplimiento de la Ley 34/2002 (LSSI-CE).',
  keywords: [
    'aviso legal',
    'LSSI',
    'titular sitio web',
    'psicóloga Madrid',
    'ampsicologia.es',
    'condiciones uso',
    'cancelación citas',
  ],
  ogType: 'article',
  includeGeoHints: false,
});

const webPageJsonLd = buildLegalWebPageJsonLd({
  path: '/aviso-legal',
  name: 'Aviso Legal',
  description:
    'Identificación del titular del sitio web, condiciones de uso y política de cancelación conforme a la Ley 34/2002 (LSSI-CE).',
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
            Información y del Comercio Electrónico (LSSI-CE), y demás normativa aplicable.
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
                <strong className="text-ink">Titulación sanitaria:</strong> Psicología General
                Sanitaria (máster habilitante). Habilitada para el ejercicio de la psicología
                sanitaria conforme a la normativa vigente.
              </li>
              <li>
                <strong className="text-ink">Domicilio profesional:</strong> Calle de Meléndez Valdés,
                28015 Madrid, España
              </li>
              <li>
                <strong className="text-ink">Correo electrónico:</strong>{' '}
                <a className="text-sage underline underline-offset-2" href={`mailto:${CLINIC_CONTACT_EMAIL}`}>
                  {CLINIC_CONTACT_EMAIL}
                </a>
              </li>
              <li>
                <strong className="text-ink">Actividad:</strong> Servicios de psicología clínica y
                sanitaria
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
              El presente aviso legal regula el uso del sitio web, incluyendo la{' '}
              <strong className="text-ink">web pública informativa</strong> y los
              servicios profesionales de psicología ofrecidos por
              Almudena Marchesi Fernández (en adelante, «la Profesional»).
            </p>
            <p className="mt-3">
              El acceso y la utilización de este sitio web atribuye la condición de usuario e
              implica la aceptación plena de todas las condiciones incluidas en este aviso legal,
              la <a href="/privacidad" className="text-sage underline underline-offset-2">política de privacidad</a> y
              la <a href="/cookies" className="text-sage underline underline-offset-2">política de cookies</a>.
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl text-ink mb-4">
              3. Descripción del servicio digital
            </h2>
            <p className="mb-3">
              La plataforma ofrece las siguientes funcionalidades:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>
                <strong className="text-ink">Web pública:</strong> información sobre la
                Profesional, su enfoque terapéutico, servicios ofrecidos y datos de contacto.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-xl text-ink mb-4">
              4. Condiciones de reserva y cancelación
            </h2>
            <p className="mb-3">
              Al reservar una cita, el usuario acepta las siguientes condiciones:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-sm">
              <li>
                <strong className="text-ink">Reserva:</strong> la reserva de cita queda confirmada
                tras acuerdo directo con la Profesional (teléfono, correo o WhatsApp).
              </li>
              <li>
                <strong className="text-ink">Cancelación por el paciente:</strong> el paciente podrá
                cancelar una cita confirmada únicamente cuando falten{' '}
                <strong className="text-ink">más de 48 horas</strong> para el inicio de la sesión.
                Las cancelaciones fuera de plazo podrán ser consideradas como sesión consumida,
                salvo acuerdo expreso con la Profesional.
              </li>
              <li>
                <strong className="text-ink">Inasistencia:</strong> en caso de no asistir a una
                sesión programada sin cancelación previa dentro del plazo permitido, la sesión{' '}
                <strong className="text-ink">
                  se considerará consumida
                </strong>
                . La clínica no se hace responsable de la restitución de la sesión,
                salvo acuerdo expreso y directo con la Profesional.
              </li>
              <li>
                <strong className="text-ink">Cancelación por la Profesional:</strong> la Profesional
                podrá cancelar o reprogramar citas por causa justificada, ofreciendo al paciente la
                posibilidad de reprogramar la sesión.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-xl text-ink mb-4">
              5. Condiciones de pago
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-sm">
              <li>
                El pago de las sesiones se realiza según lo acordado directamente con la Profesional.
                Los métodos de pago aceptados son{' '}
                <strong className="text-ink">efectivo</strong> y{' '}
                <strong className="text-ink">transferencia bancaria</strong>.
              </li>
              <li>
                La Profesional emitirá factura por cada pago realizado. Las facturas están
                exentas de IVA conforme al artículo 20.Uno.3.º de la Ley 37/1992 del Impuesto
                sobre el Valor Añadido.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-xl text-ink mb-4">
              6. Comunicaciones
            </h2>
            <p>
              La comunicación entre el paciente y la Profesional se realiza a través de los
              canales indicados en la página de contacto (teléfono, correo, WhatsApp). Los mensajes
              se tratan conforme a las medidas de seguridad
              descritas en la{' '}
              <a href="/privacidad" className="text-sage underline underline-offset-2">
                política de privacidad
              </a>
              . Este canal es complementario a la atención presencial y{' '}
              <strong className="text-ink">no sustituye</strong> la valoración clínica
              individualizada ni constituye servicio de urgencias. La Profesional responderá en
              horario profesional y sin garantía de inmediatez.
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl text-ink mb-4">
              7. Restricción de acceso geográfico
            </h2>
            <p>
              Por razones de seguridad y para garantizar el rendimiento óptimo del servicio, el
              acceso a la plataforma está restringido a conexiones originadas desde{' '}
              <strong className="text-ink">España, Portugal y Andorra</strong>. Las conexiones
              desde cualquier otro país son bloqueadas automáticamente en el perímetro de la
              infraestructura, sin perjuicio de excepciones técnicas para rastreadores de motores
              de búsqueda autorizados.
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl text-ink mb-4">
              8. Propiedad intelectual e industrial
            </h2>
            <p>
              Todos los contenidos de este sitio web, incluyendo textos, fotografías, gráficos, imágenes,
              iconos, tecnología, software, así como su diseño gráfico y códigos fuente, son propiedad
              intelectual de la Profesional o de terceros que han autorizado su uso, sin que puedan entenderse
              cedidos al usuario ninguno de los derechos de explotación sobre los mismos más allá de lo
              estrictamente necesario para el correcto uso del sitio web.
            </p>
            <p className="mt-3">
              Queda prohibida la reproducción, distribución, comunicación pública o transformación
              de los contenidos sin autorización expresa de la Profesional, salvo para uso personal
              y privado del paciente en el contexto de su proceso terapéutico.
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl text-ink mb-4">
              9. Limitación de responsabilidad
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
            <p className="mt-3">
              El sitio web utiliza servicios de terceros (Vercel para alojamiento) cuya disponibilidad
              depende de dichos proveedores. La Profesional se compromete a mantener el sitio
              operativo en la medida de lo razonablemente posible, pero no garantiza disponibilidad
              ininterrumpida.
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl text-ink mb-4">
              10. Derecho de exclusión
            </h2>
            <p>
              La Profesional se reserva el derecho a denegar o retirar el acceso a los servicios,
              sin necesidad de preaviso, a todo aquel usuario que incumpla las presentes
              condiciones o que haga un uso indebido de los canales de comunicación, incluyendo pero no limitado
              a intentos de acceso no autorizado o cualquier
              actividad que comprometa la seguridad del sistema.
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl text-ink mb-4">
              11. Modificación de las condiciones
            </h2>
            <p>
              La Profesional se reserva el derecho a modificar las presentes condiciones para
              adaptarlas a novedades legislativas, jurisprudenciales o cambios en la prestación
              del servicio, notificando los cambios sustantivos a los usuarios registrados.
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl text-ink mb-4">
              12. Legislación aplicable y jurisdicción
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
