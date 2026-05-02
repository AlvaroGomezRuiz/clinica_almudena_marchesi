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
    'Identificación del titular, condiciones de uso del sitio ampsicologia.es, portal del paciente, política de cancelación y cumplimiento de la Ley 34/2002 (LSSI-CE).',
  keywords: [
    'aviso legal',
    'LSSI',
    'titular sitio web',
    'psicóloga Madrid',
    'ampsicologia.es',
    'condiciones uso',
    'portal paciente',
    'cancelación citas',
  ],
  ogType: 'article',
  includeGeoHints: false,
});

const webPageJsonLd = buildLegalWebPageJsonLd({
  path: '/aviso-legal',
  name: 'Aviso Legal',
  description:
    'Identificación del titular del sitio web, condiciones de uso del portal del paciente y política de cancelación conforme a la Ley 34/2002 (LSSI-CE).',
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
              <strong className="text-ink">web pública informativa</strong>, el{' '}
              <strong className="text-ink">portal del paciente</strong> (área privada accesible
              tras registro y autenticación) y el{' '}
              <strong className="text-ink">panel de administración</strong> (uso exclusivo de la
              Profesional), así como los servicios profesionales de psicología ofrecidos por
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
                Profesional, su enfoque terapéutico, servicios ofrecidos, datos de contacto y
                formulario de registro de pacientes.
              </li>
              <li>
                <strong className="text-ink">Registro de pacientes:</strong> proceso de
                auto-registro con verificación de identidad mediante código OTP enviado al
                correo electrónico, aceptación explícita de la política de privacidad y
                consentimiento para el tratamiento de datos de salud.
              </li>
              <li>
                <strong className="text-ink">Portal del paciente:</strong> área privada donde el
                paciente registrado puede reservar citas viendo disponibilidad real, realizar
                pagos online (tarjeta, Bizum, Stripe Link, domiciliación SEPA, Klarna; también Apple Pay y Google Pay cuando aplique), gestionar bonos de sesiones,
                comunicarse con la Profesional mediante mensajería en tiempo real, acceder a
                recursos terapéuticos asignados, descargar facturas en PDF, y gestionar sus
                preferencias de notificaciones y privacidad.
              </li>
              <li>
                <strong className="text-ink">Panel de administración:</strong> área de uso exclusivo
                de la Profesional para la gestión de agenda, fichas clínicas cifradas, facturación,
                mensajería con pacientes, asignación de recursos y configuración del sistema.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-xl text-ink mb-4">
              4. Condiciones de reserva, cancelación y pagos no reembolsables
            </h2>
            <p className="mb-3">
              Al reservar una cita o adquirir un bono a través del portal del paciente, el usuario
              acepta las siguientes condiciones:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-sm">
              <li>
                <strong className="text-ink">Reserva:</strong> la reserva de cita queda confirmada
                una vez completado el pago online o consumida una sesión de bono activo. El sistema
                genera automáticamente un correo de confirmación al paciente.
              </li>
              <li>
                <strong className="text-ink">Pagos no reembolsables:</strong> los importes abonados
                a través de la plataforma{' '}
                <strong className="text-ink">no son reembolsables en ningún caso</strong>. Una vez
                realizado el pago, el importe queda como saldo a favor del paciente para utilizar
                en futuras sesiones. No se realizan devoluciones monetarias.
              </li>
              <li>
                <strong className="text-ink">Cancelación por el paciente:</strong> el paciente podrá
                cancelar una cita confirmada únicamente cuando falten{' '}
                <strong className="text-ink">más de 48 horas</strong> para el inicio de la sesión.
                En caso de cancelación dentro de dicho plazo, la sesión se restituye automáticamente
                al saldo del paciente para ser utilizada en otro momento.{' '}
                <strong className="text-ink">No se realiza reembolso monetario</strong> en ningún
                caso.
              </li>
              <li>
                <strong className="text-ink">Inasistencia:</strong> en caso de no asistir a una
                sesión programada sin cancelación previa dentro del plazo permitido, la sesión{' '}
                <strong className="text-ink">
                  se considerará consumida y perdida
                </strong>
                . La clínica no se hace responsable de la restitución de la sesión ni del reembolso
                del importe, salvo acuerdo expreso y directo con la Profesional.
              </li>
              <li>
                <strong className="text-ink">Saldo no retirable:</strong> el saldo acumulado en la
                plataforma (sesiones de bonos o sesiones sueltas) no es convertible a dinero y no
                puede ser retirado bajo ningún concepto. Únicamente puede ser utilizado para reservar
                sesiones de los servicios ofrecidos.
              </li>
              <li>
                <strong className="text-ink">Cancelación por la Profesional:</strong> la Profesional
                podrá cancelar o reprogramar citas por causa justificada, ofreciendo al paciente la
                posibilidad de reprogramar la sesión.
              </li>
              <li>
                <strong className="text-ink">Bonos de sesiones:</strong> los bonos adquiridos tienen
                una validez limitada indicada en el momento de la compra. Las sesiones consumidas
                de un bono no son reembolsables. En caso de cancelación dentro del plazo permitido,
                la sesión del bono se restituye automáticamente al saldo del paciente.
              </li>
              <li>
                <strong className="text-ink">Recordatorios:</strong> se envían recordatorios
                automáticos por correo electrónico aproximadamente 48 horas y 24 horas antes de cada
                cita. La no recepción de un recordatorio no exime al paciente de su compromiso con
                la cita reservada.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-xl text-ink mb-4">
              5. Condiciones de pago
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-sm">
              <li>
                Los pagos se procesan a través de{' '}
                <strong className="text-ink">Stripe</strong>, pasarela de pago certificada PCI DSS.
                En ningún momento los datos completos de la tarjeta del paciente pasan por los
                servidores de la Profesional ni se almacenan en la plataforma.
              </li>
              <li>
                Los métodos de pago disponibles dependen de la configuración de la pasarela e
                incluyen tarjeta, Bizum, Stripe Link, domiciliación SEPA y Klarna, además de Apple Pay
                y Google Pay cuando el dispositivo y la cuenta lo permitan.
              </li>
              <li>
                La Profesional emitirá factura por cada pago realizado. El paciente puede descargar
                sus facturas en formato PDF desde el portal del paciente. Las facturas están
                exentas de IVA conforme al artículo 20.Uno.3.º de la Ley 37/1992 del Impuesto
                sobre el Valor Añadido.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-xl text-ink mb-4">
              6. Mensajería y comunicaciones
            </h2>
            <p>
              El portal del paciente incluye un sistema de mensajería en tiempo real para la
              comunicación entre el paciente y la Profesional. Los mensajes están{' '}
              <strong className="text-ink">cifrados</strong> conforme a las medidas de seguridad
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
              La plataforma utiliza servicios de terceros (Supabase, Vercel, Stripe, Resend, Sentry)
              cuya disponibilidad depende de dichos proveedores. La Profesional se compromete a
              mantener la plataforma operativa en la medida de lo razonablemente posible, pero no
              garantiza disponibilidad ininterrumpida.
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl text-ink mb-4">
              10. Derecho de exclusión
            </h2>
            <p>
              La Profesional se reserva el derecho a denegar o retirar el acceso al portal del
              paciente, sin necesidad de preaviso, a todo aquel usuario que incumpla las presentes
              condiciones o que haga un uso indebido de la plataforma, incluyendo pero no limitado
              a intentos de acceso no autorizado, uso abusivo de la mensajería o cualquier
              actividad que comprometa la seguridad o el funcionamiento del sistema.
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
